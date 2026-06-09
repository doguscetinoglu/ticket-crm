import { NextResponse } from "next/server";
import { getLeaveSession } from "@/lib/leave-session";

export async function GET() {
  const session = await getLeaveSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: session });
}
