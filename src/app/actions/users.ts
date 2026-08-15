"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { MIN_PASSWORD_LENGTH, passwordTooShort } from "@/lib/password";
import { requireAdmin, requireStaff } from "@/lib/session";

function parseRole(raw: string): Role | null {
  if (raw === "ADMIN" || raw === "EDITOR") return raw;
  return null;
}

export async function createUser(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = parseRole(String(formData.get("role") ?? "EDITOR"));

  if (!email || !email.includes("@")) return { error: "Érvényes e-mail cím szükséges." };
  if (passwordTooShort(password)) {
    return { error: `A jelszó legalább ${MIN_PASSWORD_LENGTH} karakter legyen.` };
  }
  if (!role) return { error: "Érvénytelen szerepkör." };

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "Ez az e-mail cím már foglalt." };

  await prisma.user.create({
    data: {
      email,
      role,
      passwordHash: await bcrypt.hash(password, 12),
    },
  });

  revalidatePath("/admin/users");
  return {};
}

export async function updateUser(formData: FormData): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const role = parseRole(String(formData.get("role") ?? ""));
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "A felhasználó nem található." };
  if (!role) return { error: "Érvénytelen szerepkör." };
  if (user.id === admin.id && role !== "ADMIN") {
    return { error: "Saját admin jogosultságát nem vonhatja vissza." };
  }
  if (password && passwordTooShort(password)) {
    return { error: `A jelszó legalább ${MIN_PASSWORD_LENGTH} karakter legyen.` };
  }

  await prisma.user.update({
    where: { id },
    data: {
      role,
      ...(password
        ? { passwordHash: await bcrypt.hash(password, 12) }
        : {}),
    },
  });

  revalidatePath("/admin/users");
  return {};
}

export async function deleteUser(formData: FormData): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id === admin.id) return { error: "Saját fiókját nem törölheti." };

  const user = await prisma.user.findUnique({
    where: { id },
    include: { _count: { select: { albums: true, photos: true } } },
  });
  if (!user) return { error: "A felhasználó nem található." };
  if (user._count.albums > 0 || user._count.photos > 0) {
    return {
      error: "A felhasználó nem törölhető, amíg albumok vagy feltöltött képek tartoznak hozzá.",
    };
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
  return {};
}

export async function changeOwnPassword(formData: FormData): Promise<{ error?: string }> {
  const staff = await requireStaff();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!current || !next) return { error: "Adja meg a jelenlegi és az új jelszót." };
  if (next !== confirm) return { error: "Az új jelszó megerősítése nem egyezik." };
  if (passwordTooShort(next)) {
    return { error: `A jelszó legalább ${MIN_PASSWORD_LENGTH} karakter legyen.` };
  }

  const user = await prisma.user.findUnique({ where: { id: staff.id } });
  if (!user) return { error: "A felhasználó nem található." };

  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) return { error: "A jelenlegi jelszó hibás." };

  await prisma.user.update({
    where: { id: staff.id },
    data: { passwordHash: await bcrypt.hash(next, 12) },
  });

  revalidatePath("/admin/account");
  return {};
}
