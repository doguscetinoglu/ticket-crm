import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LEAVE_COOKIE } from "@/lib/leave-session";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(LEAVE_COOKIE);
  return NextResponse.json({ ok: true });
}
