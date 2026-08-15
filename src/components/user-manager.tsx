"use client";

import { useState } from "react";
import { createUser, deleteUser, updateUser } from "@/app/actions/users";

type UserRow = {
  id: string;
  email: string;
  role: "ADMIN" | "EDITOR";
};

const fieldClass = "w-full p-3 rounded-lg border border-outline-variant bg-surface font-body-md text-base";

export function UserManager({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      <form
        action={async (formData) => {
          const result = await createUser(formData);
          setError(result.error ?? null);
        }}
        className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-6 space-y-4"
      >
        <h3 className="font-headline-md text-headline-md">Új munkatárs</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <input name="email" type="email" required placeholder="E-mail" className={fieldClass} />
          <input
            name="password"
            type="password"
            required
            minLength={12}
            placeholder="Jelszó (min. 12 karakter)"
            className={fieldClass}
          />
          <select name="role" defaultValue="EDITOR" className={fieldClass}>
            <option value="EDITOR">Szerkesztő</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        {error && <p className="text-error text-sm">{error}</p>}
        <button type="submit" className="bg-primary text-on-primary px-5 py-2 min-h-11 rounded-full font-medium">
          Felhasználó létrehozása
        </button>
      </form>

      <div className="space-y-4">
        {users.map((user) => (
          <div
            key={user.id}
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-6 space-y-3"
          >
            <p className="font-body-md text-on-surface break-all">{user.email}</p>
            <form
              className="grid gap-3 md:grid-cols-[8rem_1fr_auto] md:items-center"
              action={async (formData) => {
                const result = await updateUser(formData);
                setError(result.error ?? null);
              }}
            >
              <input type="hidden" name="id" value={user.id} />
              <select name="role" defaultValue={user.role} className={fieldClass}>
                <option value="EDITOR">Szerkesztő</option>
                <option value="ADMIN">Admin</option>
              </select>
              <input
                name="password"
                type="password"
                placeholder="Új jelszó (min. 12 karakter)"
                minLength={12}
                className={fieldClass}
              />
              <button type="submit" className="text-primary text-sm font-medium min-h-11 px-3 justify-self-start">
                Mentés
              </button>
            </form>
            {user.id !== currentUserId && (
              <form
                action={async (formData) => {
                  const result = await deleteUser(formData);
                  setError(result.error ?? null);
                }}
              >
                <input type="hidden" name="id" value={user.id} />
                <button type="submit" className="text-error text-sm min-h-11">
                  Törlés
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
