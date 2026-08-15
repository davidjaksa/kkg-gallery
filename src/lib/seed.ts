import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { MIN_PASSWORD_LENGTH, passwordTooShort } from "@/lib/password";

const EXAMPLE_SECRET = "replace-with-a-long-random-string";
const EXAMPLE_PASSWORD = "change-me";

export function assertAuthSecrets() {
  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret || secret === EXAMPLE_SECRET || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET must be set to a random string of at least 32 characters (openssl rand -base64 32).",
    );
  }
}

export async function ensureAdmin() {
  assertAuthSecrets();

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  if (email === "admin@example.com") {
    throw new Error("ADMIN_EMAIL must be set to a real staff address, not the example value.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  if (password === EXAMPLE_PASSWORD || passwordTooShort(password)) {
    throw new Error(
      `ADMIN_PASSWORD must not be the example value and must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }

  await prisma.user.create({
    data: {
      email,
      role: "ADMIN",
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
}
