import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { DISPLAY_DIR, ORIGINALS_DIR, THUMBS_DIR, resolveUploadPath } from "@/lib/paths";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME = new Set(["image/jpeg", "image/png"]);
export const SHARP_LIMIT_INPUT_PIXELS = 40_000_000;

const JPEG_APP0 = 0xe0;
const JPEG_APP14 = 0xee;
const JPEG_SOS = 0xda;
const RGB_COMPONENT_IDS = [0x52, 0x47, 0x42]; // 'R', 'G', 'B'

export function extensionForMime(mime: string): "jpg" | "png" {
  return mime === "image/png" ? "png" : "jpg";
}

export function sniffImageMime(buffer: Buffer): "image/jpeg" | "image/png" | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  return null;
}

function openImage(buffer: Buffer) {
  return sharp(buffer, { failOn: "none", limitInputPixels: SHARP_LIMIT_INPUT_PIXELS }).rotate();
}

function isJpeg(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8;
}

function jpegComponentIds(buffer: Buffer): number[] | null {
  let i = 2;
  while (i < buffer.length - 3) {
    if (buffer[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buffer[i + 1];
    if (marker === JPEG_SOS) return null;
    if (marker === 0x00 || marker === 0xff) {
      i += 1;
      continue;
    }
    if (marker >= 0xd0 && marker <= 0xd9) {
      i += 2;
      continue;
    }
    const length = buffer.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3 && i + 9 < buffer.length) {
      const count = buffer[i + 9];
      const ids: number[] = [];
      for (let c = 0; c < count; c += 1) {
        const offset = i + 10 + c * 3;
        if (offset >= buffer.length) return null;
        ids.push(buffer[offset]);
      }
      return ids;
    }
    i += 2 + length;
  }
  return null;
}

function stripJpegAppMarkers(buffer: Buffer, markers: Set<number>): Buffer {
  const parts: Buffer[] = [buffer.subarray(0, 2)];
  let i = 2;
  let stripped = false;
  while (i < buffer.length - 1) {
    if (buffer[i] !== 0xff) {
      parts.push(buffer.subarray(i));
      break;
    }
    const marker = buffer[i + 1];
    if (marker === JPEG_SOS) {
      parts.push(buffer.subarray(i));
      break;
    }
    if (marker === 0x00 || marker === 0xff) {
      parts.push(buffer.subarray(i, i + 1));
      i += 1;
      continue;
    }
    if (marker >= 0xd0 && marker <= 0xd9) {
      parts.push(buffer.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (i + 3 >= buffer.length) {
      parts.push(buffer.subarray(i));
      break;
    }
    const length = buffer.readUInt16BE(i + 2);
    const next = i + 2 + length;
    if (markers.has(marker)) {
      stripped = true;
      i = next;
      continue;
    }
    parts.push(buffer.subarray(i, next));
    i = next;
  }
  return stripped ? Buffer.concat(parts) : buffer;
}

/**
 * Photoshop RGB JPEGs (component IDs R,G,B) that also carry JFIF and/or Adobe
 * APP14 YCbCr markers decode as neon green/magenta. Strip those APP segments
 * so decoders treat the data as RGB.
 */
export function normalizeJpegColorSpace(buffer: Buffer): Buffer {
  if (!isJpeg(buffer)) return buffer;
  const ids = jpegComponentIds(buffer);
  if (!ids || ids.length !== 3) return buffer;
  if (ids[0] !== RGB_COMPONENT_IDS[0] || ids[1] !== RGB_COMPONENT_IDS[1] || ids[2] !== RGB_COMPONENT_IDS[2]) {
    return buffer;
  }
  return stripJpegAppMarkers(buffer, new Set([JPEG_APP0, JPEG_APP14]));
}

export function hashBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

async function writeDisplayAndThumb(id: string, buffer: Buffer) {
  const image = openImage(buffer);

  await image
    .clone()
    .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(path.join(DISPLAY_DIR, `${id}.jpg`));

  await image
    .clone()
    .resize({ width: 400, height: 400, fit: "cover" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(path.join(THUMBS_DIR, `${id}.jpg`));
}

export async function processPhoto(options: {
  id: string;
  buffer: Buffer;
  mime: string;
}): Promise<{ originalPath: string; displayPath: string; thumbPath: string }> {
  const sniffed = sniffImageMime(options.buffer);
  if (!sniffed || sniffed !== options.mime) {
    throw new Error("Invalid image type");
  }
  const ext = extensionForMime(sniffed);
  const originalRel = `originals/${options.id}.${ext}`;
  let buffer = sniffed === "image/jpeg" ? normalizeJpegColorSpace(options.buffer) : options.buffer;
  const stripped =
    sniffed === "image/jpeg"
      ? await openImage(buffer).jpeg({ quality: 92, mozjpeg: true }).toBuffer()
      : await openImage(buffer).png().toBuffer();
  buffer = Buffer.from(stripped);

  await fs.writeFile(path.join(ORIGINALS_DIR, `${options.id}.${ext}`), buffer);
  await writeDisplayAndThumb(options.id, buffer);

  return {
    originalPath: originalRel,
    displayPath: `display/${options.id}.jpg`,
    thumbPath: `thumbs/${options.id}.jpg`,
  };
}

export async function processMovedPhoto(options: {
  id: string;
  sourcePath: string;
  mime: string;
}): Promise<{ originalPath: string; displayPath: string; thumbPath: string }> {
  const ext = extensionForMime(options.mime);
  const dest = path.join(ORIGINALS_DIR, `${options.id}.${ext}`);
  try {
    await fs.rename(options.sourcePath, dest);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EXDEV") throw error;
    await fs.copyFile(options.sourcePath, dest);
    await fs.unlink(options.sourcePath);
  }

  let buffer = await fs.readFile(dest);
  if (options.mime === "image/jpeg") {
    const normalized = normalizeJpegColorSpace(buffer);
    if (!normalized.equals(buffer)) {
      const out = Buffer.from(normalized);
      await fs.writeFile(dest, out);
      buffer = out;
    }
  }

  await writeDisplayAndThumb(options.id, buffer);

  return {
    originalPath: `originals/${options.id}.${ext}`,
    displayPath: `display/${options.id}.jpg`,
    thumbPath: `thumbs/${options.id}.jpg`,
  };
}

export async function reprocessStoredJpeg(options: {
  originalPath: string;
  displayPath: string;
  thumbPath: string;
}): Promise<{ changed: boolean; contentHash: string }> {
  const originalAbs = resolveUploadPath(options.originalPath);
  const buffer = await fs.readFile(originalAbs);
  const normalized = normalizeJpegColorSpace(buffer);
  const changed = !normalized.equals(buffer);
  if (changed) {
    await fs.writeFile(originalAbs, normalized);
  }

  const id = path.parse(options.displayPath).name;
  await writeDisplayAndThumb(id, normalized);

  return { changed, contentHash: hashBuffer(normalized) };
}

export async function processCover(options: {
  id: string;
  buffer: Buffer;
}): Promise<string> {
  const sniffed = sniffImageMime(options.buffer);
  if (!sniffed) throw new Error("Invalid image type");
  if (options.buffer.length > MAX_UPLOAD_BYTES) throw new Error("Image too large");
  const relative = `covers/${options.id}.jpg`;
  const dest = path.join(process.cwd(), "data", "uploads", relative);
  const buffer = sniffed === "image/jpeg" ? normalizeJpegColorSpace(options.buffer) : options.buffer;
  await openImage(buffer)
    .resize({ width: 1200, height: 675, fit: "cover" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(dest);
  return relative;
}
