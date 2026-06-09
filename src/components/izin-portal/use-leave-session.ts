"use client";

import { useEffect, useState } from "react";

export interface LeaveSessionUser {
  id: string;
  email: string;
  name: string;
  role: "EMPLOYEE" | "MANAGER" | "HR_ADMIN";
}

export function useLeaveSession() {
  const [user, setUser] = useState<LeaveSessionUser | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/izin-portal/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  return {
    user: user ?? null,
    isLoading: user === undefined,
  };
}
