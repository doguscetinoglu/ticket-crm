import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/session";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  // Çıkış yapan ekip üyesi anında çevrimdışı görünsün.
  const session = await getSession();
  if (session && session.type !== "customer") {
    try {
      await prisma.user.update({
        where: { id: session.id },
        data: { lastSeenAt: null, lastSeenPath: null },
      });
    } catch {}
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
