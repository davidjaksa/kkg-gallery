"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return (await loginAction(formData)) ?? null;
    },
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div>
        <label htmlFor="email" className="block font-headline-md text-on-surface mb-2 text-sm">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full p-3 rounded-lg border border-outline-variant bg-surface-container-lowest font-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        />
      </div>
      <div>
        <label htmlFor="password" className="block font-headline-md text-on-surface mb-2 text-sm">
          Jelszó
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full p-3 rounded-lg border border-outline-variant bg-surface-container-lowest font-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        />
      </div>
      {state?.error && <p className="text-error font-body-md text-sm">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-primary text-on-primary py-3 rounded-full font-headline-md font-medium hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Belépés…" : "Bejelentkezés"}
      </button>
    </form>
  );
}
