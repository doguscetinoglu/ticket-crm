"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SessionUser } from "@/lib/session";
import UserAvatar from "./UserAvatar";
import { useTheme } from "./ThemeProvider";

const Icon = ({ d, className = "w-5 h-5" }: { d: string; className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  home:    "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z",
  folder:  "M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z",
  inbox:   "M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.251 2.251 0 012.012 1.244l.256.512a2.251 2.251 0 002.013 1.244h3.218a2.251 2.251 0 002.013-1.244l.256-.512a2.251 2.251 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3",
  tickets: "M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
  users:   "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  person:  "M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z",
  chart:   "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
  survey:  "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z",
  moon:    "M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z",
  sun:     "M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z",
  logout:  "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9",
  calendar:  "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
  leave:     "M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0",
  megaphone: "M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46",
  cog:       "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
};

const NAV_MAIN = [
  { href: "/",        label: "Dashboard",    icon: ICONS.home,    roles: ["admin", "agent"] },
  { href: "/havuz",   label: "Havuz",        icon: ICONS.inbox,   roles: ["admin", "agent"] },
  { href: "/tickets", label: "Tüm Biletler", icon: ICONS.tickets, roles: ["admin", "agent"] },
  { href: "/projeler",label: "Projeler",     icon: ICONS.folder,  roles: ["admin", "agent"] },
  { href: "/takvim",  label: "Ekip Takvimi", icon: ICONS.calendar, roles: ["admin", "agent"] },
  { href: "/izinler", label: "İzinler",      icon: ICONS.leave,    roles: ["admin", "agent"] },
  { href: "/duyurular",label: "Duyurular",   icon: ICONS.megaphone, roles: ["admin", "agent"] },
];

const NAV_ADMIN = [
  { href: "/musteriler",   label: "Müşteriler",  icon: ICONS.users,  roles: ["admin"] },
  { href: "/kullanicilar", label: "Kullanıcılar", icon: ICONS.person, roles: ["admin"] },
  { href: "/anketler",     label: "Anketler",     icon: ICONS.survey, roles: ["admin"] },
  { href: "/raporlar",     label: "Raporlar",     icon: ICONS.chart,  roles: ["admin"] },
  { href: "/ayarlar",      label: "Ayarlar",      icon: ICONS.cog,    roles: ["admin"] },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const path = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [me, setMe] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(setMe);
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const isAdmin = me?.type === "admin";
  const roleLabel = me?.type === "admin" ? "Yönetici" : me?.type === "customer" ? "Müşteri" : "Kullanıcı";

  const NavLink = ({ href, label, icon }: { href: string; label: string; icon: string }) => {
    const active = path === href;
    return (
      <Link
        href={href}
        onClick={onClose}
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
          active
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
            : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
        }`}
      >
        <Icon d={icon} className={`w-[18px] h-[18px] shrink-0 transition-colors ${active ? "text-indigo-200" : "text-gray-500 group-hover:text-gray-300"}`} />
        <span className="flex-1">{label}</span>
        {active && <span className="w-1.5 h-1.5 rounded-full bg-indigo-300/70" />}
      </Link>
    );
  };

  return (
    <aside className="w-64 md:w-56 h-full min-h-screen bg-gray-950 border-r border-gray-800/60 flex flex-col select-none">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-600/30 shrink-0">
            A
          </div>
          <div>
            <p className="font-bold text-gray-100 text-sm leading-none tracking-tight">AnahtarDestek</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Destek &amp; Proje Yönetimi</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-3 mb-2">Genel</p>
          {NAV_MAIN.map(item => <NavLink key={item.href} {...item} />)}
        </div>

        {isAdmin && (
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-3 mb-2">Yönetim</p>
            {NAV_ADMIN.map(item => <NavLink key={item.href} {...item} />)}
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-gray-800/60 space-y-2">
        {/* User card */}
        {me && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-white/5">
            <UserAvatar name={me.name} color={(me as SessionUser & { color?: string }).color ?? "indigo"} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-200 truncate">{me.name}</p>
              <p className="text-[10px] text-gray-500">{roleLabel}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-all"
            title={theme === "dark" ? "Açık mod" : "Koyu mod"}
          >
            <Icon d={theme === "dark" ? ICONS.sun : ICONS.moon} className="w-4 h-4" />
            <span className="hidden md:inline">{theme === "dark" ? "Açık" : "Koyu"}</span>
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <Icon d={ICONS.logout} className="w-4 h-4" />
            <span className="hidden md:inline">Çıkış</span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-2 pt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-gray-600">Sistem aktif</span>
        </div>
      </div>
    </aside>
  );
}
