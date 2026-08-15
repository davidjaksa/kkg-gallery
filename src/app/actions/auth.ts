"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { safeCallbackUrl } from "@/lib/callback-url";
import { clientIp, loginAllowed, recordLoginFailure, recordLoginSuccess } from "@/lib/rate-limit";

const LOGIN_ERROR = { error: "Hibás e-mail cím vagy jelszó." };

export async function loginAction(formData: FormData): Promise<{ error: string } | void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = safeCallbackUrl(String(formData.get("callbackUrl") ?? "/admin"));
  const ip = await clientIp();

  if (!loginAllowed(ip, email)) {
    return LOGIN_ERROR;
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
    recordLoginSuccess(ip, email);
  } catch (error) {
    if (error instanceof AuthError) {
      recordLoginFailure(ip, email);
      return LOGIN_ERROR;
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
