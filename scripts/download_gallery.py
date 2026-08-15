#!/usr/bin/env python3
"""Download full-resolution photos from https://galeria.kkg.hu/

Folder layout on disk:
  photos/<school year or main folder>/<event or nested albums>/filename
which mirrors the gallery path (year / main folder / album / photos).
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

BASE = "https://galeria.kkg.hu"
API = f"{BASE}/galleryAPI.php"
PAGE_SIZE = 20
USER_AGENT = "KKG-Gallery-Downloader/1.0 (+https://galeria.kkg.hu/)"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".tif", ".tiff", ".heic", ".bmp"}

print_lock = threading.Lock()


def log(msg: str) -> None:
    with print_lock:
        print(msg, flush=True)


def sanitize_component(name: str) -> str:
    name = name.replace("\x00", "").replace("/", "_").replace("\\", "_").strip()
    name = name.rstrip(".")
    return name or "_unnamed"


def local_path_for(out_dir: Path, rel_path: str) -> Path:
    parts = [sanitize_component(p) for p in rel_path.split("/") if p]
    return out_dir.joinpath(*parts)


def get_full_res_url(thumbnail_url: str) -> str | None:
    try:
        thumbnail = urllib.parse.urlparse(thumbnail_url)
        qs = urllib.parse.parse_qs(thumbnail.query)
        doc_ids = qs.get("docid") or []
        if not doc_ids:
            return None
        original = urllib.parse.urlparse(doc_ids[0])
        path = original.path.rstrip("/")
        if not path.endswith("/content"):
            path = f"{path}/content"
        return urllib.parse.urlunparse(
            (original.scheme, original.netloc, path, original.params, original.query, original.fragment)
        )
    except Exception:
        return None


def http_get(url: str, timeout: int = 60) -> tuple[int, bytes, str]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, resp.read(), resp.headers.get("Content-Type", "")


def fetch_page(path: str, page: int, retries: int = 5) -> list[dict[str, Any]]:
    query = urllib.parse.urlencode({"event": path, "page": page}, quote_via=urllib.parse.quote)
    url = f"{API}?{query}"
    last_err: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            status, body, ctype = http_get(url, timeout=90)
            if not body:
                return []
            data = json.loads(body.decode("utf-8"))
            items = data.get("items") if isinstance(data, dict) else data
            if not isinstance(items, list):
                return []
            return items
        except Exception as exc:
            last_err = exc
            time.sleep(min(2**attempt, 20))
    log(f"  WARN failed listing {path!r} page {page}: {last_err}")
    return []


def list_folder(path: str) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    page = 1
    seen: set[str] = set()
    while True:
        batch = fetch_page(path, page)
        if not batch:
            break
        fresh = []
        for item in batch:
            key = f"{item.get('type')}:{item.get('path') or item.get('name')}"
            if key in seen:
                continue
            seen.add(key)
            fresh.append(item)
        if not fresh:
            break
        items.extend(fresh)
        if len(batch) < PAGE_SIZE:
            break
        page += 1
    return items


def crawl(out_dir: Path) -> dict[str, Any]:
    catalog_path = out_dir / "_catalog.json"
    folders: list[str] = [""]
    files: list[dict[str, str]] = []
    empty_folders: list[str] = []
    visited: set[str] = set()

    while folders:
        current = folders.pop(0)
        if current in visited:
            continue
        visited.add(current)
        label = current or "(root)"
        items = list_folder(current)
        child_folders = [i for i in items if i.get("type") == "folder"]
        child_files = [i for i in items if i.get("type") == "file"]
        log(f"Listed {label}: {len(child_folders)} folders, {len(child_files)} files")
        if not items:
            if current:
                empty_folders.append(current)
            continue
        for folder in child_folders:
            name = folder.get("name") or ""
            child_path = folder.get("path") or "/".join(p for p in [current, name] if p)
            folders.append(child_path)
        for file_item in child_files:
            name = file_item.get("name") or "unnamed"
            rel = file_item.get("path") or "/".join(p for p in [current, name] if p)
            thumb = file_item.get("thumbnail") or file_item.get("preview") or file_item.get("url") or ""
            files.append({"path": rel, "name": name, "folder": current, "thumbnail": thumb})

    catalog = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "folder_count": len(visited) - 1,
        "file_count": len(files),
        "empty_folders": empty_folders,
        "files": files,
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"Catalog written: {catalog_path} ({len(files)} files, {len(visited) - 1} folders)")
    return catalog


def download_one(
    file_item: dict[str, str],
    out_dir: Path,
    fresh_thumbs: dict[str, str],
    retries: int = 4,
) -> tuple[str, str, int]:
    rel = file_item["path"]
    dest = local_path_for(out_dir, rel)
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return rel, "skipped", dest.stat().st_size

    thumb = fresh_thumbs.get(rel) or file_item.get("thumbnail") or ""
    full_url = get_full_res_url(thumb) if thumb else None
    if not full_url:
        return rel, "no-docid", 0

    tmp = dest.with_suffix(dest.suffix + ".part")
    last_err = ""
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(full_url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=180) as resp:
                ctype = (resp.headers.get("Content-Type") or "").lower()
                if "json" in ctype or "html" in ctype or "text/plain" in ctype:
                    raise RuntimeError(f"unexpected content-type {ctype}")
                size = 0
                with open(tmp, "wb") as fh:
                    while True:
                        chunk = resp.read(1024 * 256)
                        if not chunk:
                            break
                        fh.write(chunk)
                        size += len(chunk)
            if size <= 0:
                raise RuntimeError("empty file")
            tmp.replace(dest)
            return rel, "downloaded", size
        except Exception as exc:
            last_err = str(exc)
            if tmp.exists():
                try:
                    tmp.unlink()
                except OSError:
                    pass
            time.sleep(min(2**attempt, 15))
    return rel, f"failed:{last_err}", 0


def refresh_folder_thumbs(folder: str) -> dict[str, str]:
    thumbs: dict[str, str] = {}
    for item in list_folder(folder):
        if item.get("type") != "file":
            continue
        name = item.get("name") or "unnamed"
        rel = item.get("path") or "/".join(p for p in [folder, name] if p)
        thumb = item.get("thumbnail") or item.get("preview") or item.get("url") or ""
        if thumb:
            thumbs[rel] = thumb
    return thumbs


def free_bytes(path: Path) -> int:
    return shutil.disk_usage(path).free


def download_all(out_dir: Path, catalog: dict[str, Any], workers: int) -> None:
    files: list[dict[str, str]] = catalog["files"]
    by_folder: dict[str, list[dict[str, str]]] = {}
    for item in files:
        by_folder.setdefault(item.get("folder") or "", []).append(item)

    downloaded = skipped = failed = nodoc = 0
    bytes_total = 0
    failures: list[str] = []
    done = 0
    total = len(files)
    start = time.time()

    for folder, folder_files in by_folder.items():
        pending = []
        for item in folder_files:
            dest = local_path_for(out_dir, item["path"])
            if dest.exists() and dest.stat().st_size > 0:
                skipped += 1
                done += 1
                bytes_total += dest.stat().st_size
            else:
                pending.append(item)
        if not pending:
            continue

        if free_bytes(out_dir) < 3 * 1024 * 1024 * 1024:
            log("Stopping: less than 3 GB free disk space remains")
            break
        log(f"Refreshing tokens for {folder or '(root)'} ({len(pending)} remaining)")
        thumbs = refresh_folder_thumbs(folder)
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = [pool.submit(download_one, item, out_dir, thumbs) for item in pending]
            for fut in as_completed(futures):
                rel, status, size = fut.result()
                done += 1
                bytes_total += size
                if status == "downloaded":
                    downloaded += 1
                elif status == "skipped":
                    skipped += 1
                elif status == "no-docid":
                    nodoc += 1
                    failures.append(rel)
                else:
                    failed += 1
                    failures.append(f"{rel} ({status})")
                if done % 10 == 0 or status.startswith("failed") or status == "no-docid":
                    elapsed = max(time.time() - start, 1)
                    mb = bytes_total / (1024 * 1024)
                    log(
                        f"[{done}/{total}] {status} {rel} "
                        f"({mb:.1f} MB, {downloaded} new, {skipped} skip, {failed} fail, "
                        f"{elapsed:.0f}s)"
                    )

    log(
        f"Done. downloaded={downloaded} skipped={skipped} failed={failed} "
        f"no-docid={nodoc} total_bytes={bytes_total}"
    )
    if failures:
        fail_path = out_dir / "_failures.txt"
        fail_path.write_text("\n".join(failures) + "\n", encoding="utf-8")
        log(f"Wrote {len(failures)} failures to {fail_path}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Download KKG gallery photos")
    parser.add_argument("--out", default="photos", help="Output directory")
    parser.add_argument("--workers", type=int, default=4, help="Parallel downloads")
    parser.add_argument("--crawl-only", action="store_true")
    parser.add_argument("--download-only", action="store_true", help="Use existing _catalog.json")
    args = parser.parse_args()

    out_dir = Path(args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    catalog_path = out_dir / "_catalog.json"

    if args.download_only:
        if not catalog_path.exists():
            log("No catalog found; run without --download-only first")
            return 1
        catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
        log(f"Loaded catalog with {catalog.get('file_count')} files")
    else:
        catalog = crawl(out_dir)

    if args.crawl_only:
        return 0

    download_all(out_dir, catalog, args.workers)
    return 0


if __name__ == "__main__":
    sys.exit(main())
