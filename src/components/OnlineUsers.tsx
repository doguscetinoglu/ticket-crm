"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import UserAvatar from "./UserAvatar";
import { pageLabel, STATUS_LABEL, type PresenceStatus } from "@/lib/presence";

interface PresenceUser {
  id: number;
  name: string;
  email: string;
  role: string;
  color: string;
  isAdmin: boolean;
  status: PresenceStatus;
  lastSeenAt: string | null;
  lastSeenPath: string | null;
}

const REFRESH_MS = 25_000;

const DOT: Record<PresenceStatus, string> = {
  online: "bg-emerald-500",
  idle: "bg-amber-400",
  offline: "bg-slate-300 dark:bg-gray-600",
};

function lastSeenText(iso: string | null): string {
  if (!iso) return "bilinmiyor";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 90) return "Az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  return `${Math.floor(diff / 86400)} gün önce`;
}

/** Üst barda tüm ekip üyelerine görünen çevrimiçi ekip göstergesi. */
export default function OnlineUsers() {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [visible, setVisible] = useState(false); // yetkisi olmayan (müşteri portalı) oturumlarda gizli
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const fetchPresence = useCallback(async () => {
    try {
      const res = await fetch("/api/presence");
      if (!res.ok) { setVisible(false); return; }
      const data = await res.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
      setVisible(true);
    } catch {}
  }, []);

  useEffect(() => {
    fetchPresence();
    const id = setInterval(fetchPresence, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchPresence]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        panelRef.current && btnRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!visible) return null;

  const onlineCount = users.filter((u) => u.status === "online").length;
  const idleCount = users.filter((u) => u.status === "idle").length;
  const offline = users.filter((u) => u.status === "offline");
  const active = users.filter((u) => u.status !== "offline");

  const Row = ({ u }: { u: PresenceUser }) => {
    const page = pageLabel(u.lastSeenPath);
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 dark:border-gray-800/60 last:border-0">
        <div className="relative shrink-0">
          <UserAvatar name={u.name} color={u.color} size="sm" />
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-gray-900 ${DOT[u.status]}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-800 dark:text-gray-100 truncate">
            {u.name}
            {u.isAdmin && (
              <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 align-middle">
                Yönetici
              </span>
            )}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-gray-500 truncate">
            {u.status === "offline"
              ? u.lastSeenAt ? `Son görülme: ${lastSeenText(u.lastSeenAt)}` : u.role
              : page
                ? `${STATUS_LABEL[u.status]} · ${page}`
                : STATUS_LABEL[u.status]}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => { setOpen((v) => !v); fetchPresence(); }}
        className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition-all"
        title="Çevrimiçi ekip"
        aria-label="Çevrimiçi ekip"
      >
        <span className="relative flex w-2.5 h-2.5">
          {onlineCount > 0 && (
            <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
          )}
          <span className={`relative inline-flex w-2.5 h-2.5 rounded-full ${onlineCount > 0 ? "bg-emerald-500" : "bg-slate-300 dark:bg-gray-600"}`} />
        </span>
        <span className="text-xs font-semibold tabular-nums">{onlineCount}</span>
        <span className="hidden sm:inline text-xs font-medium">çevrimiçi</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl dark:shadow-black/40 overflow-hidden z-50"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-gray-800">
            <span className="text-sm font-bold text-slate-800 dark:text-gray-100">Ekip Durumu</span>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-gray-500">
              {onlineCount} çevrimiçi{idleCount > 0 ? ` · ${idleCount} boşta` : ""}
            </span>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
            {active.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-slate-400 dark:text-gray-600">
                Şu anda kimse çevrimiçi değil
              </p>
            ) : (
              active.map((u) => <Row key={u.id} u={u} />)
            )}

            {offline.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-gray-600 bg-slate-50/60 dark:bg-gray-800/30">
                  Çevrimdışı · {offline.length}
                </p>
                <div className="opacity-60">
                  {offline.map((u) => <Row key={u.id} u={u} />)}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
