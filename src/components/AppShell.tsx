"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  if (path === "/login" || path === "/portal" || path.startsWith("/anket/")) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-gray-950">
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 md:static md:translate-x-0 transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <Sidebar onClose={() => setOpen(false)} />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar (mobile hamburger + desktop: sadece bell) */}
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 h-14 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800 shadow-sm dark:shadow-none">
          {/* Hamburger — sadece mobilde */}
          <button
            onClick={() => setOpen(true)}
            className="md:hidden p-2 rounded-xl text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Menüyü aç"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* Logo — sadece mobilde */}
          <div className="md:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs">F</div>
            <span className="font-semibold text-slate-800 dark:text-gray-100 text-sm">Fox CRM</span>
          </div>

          {/* Sağa yasla */}
          <div className="flex-1" />

          {/* Bildirim zili */}
          <NotificationBell />
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
