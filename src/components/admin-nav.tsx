"use client";

import { createContext, useContext, useMemo, useState } from "react";

type AdminNav = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const AdminNavContext = createContext<AdminNav | null>(null);

export function AdminNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);
  return <AdminNavContext.Provider value={value}>{children}</AdminNavContext.Provider>;
}

export function useAdminNav() {
  return useContext(AdminNavContext);
}
