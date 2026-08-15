"use client";

import { useState } from "react";
import { changeOwnPassword } from "@/app/actions/users";

const fieldClass =
  "w-full p-3 rounded-lg border border-outline-variant bg-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none";

export function PasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <form
      action={async (formData) => {
        const result = await changeOwnPassword(formData);
        setError(result.error ?? null);
        setSaved(!result.error);
      }}
      className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-6 space-y-4 max-w-[520px]"
    >
      <div>
        <label className="block text-sm font-headline-md mb-2">Jelenlegi jelszó</label>
        <input name="currentPassword" type="password" required autoComplete="current-password" className={fieldClass} />
      </div>
      <div>
        <label className="block text-sm font-headline-md mb-2">Új jelszó</label>
        <input
          name="newPassword"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          className={fieldClass}
        />
      </div>
      <div>
        <label className="block text-sm font-headline-md mb-2">Új jelszó megerősítése</label>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          className={fieldClass}
        />
      </div>
      {error && <p className="text-error text-sm">{error}</p>}
      {saved && !error && <p className="text-on-surface-variant text-sm">A jelszó megváltozott.</p>}
      <button type="submit" className="bg-primary text-on-primary px-5 py-2 min-h-11 rounded-full font-medium">
        Jelszó mentése
      </button>
    </form>
  );
}
