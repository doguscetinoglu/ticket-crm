import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSettings, setSettings, SETTING_KEYS, type SettingKey } from "@/lib/settings";

export async function GET() {
  const session = await getSession();
  if (!session || session.type !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(await getSettings());
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const partial: Partial<Record<SettingKey, boolean>> = {};
  for (const key of SETTING_KEYS) {
    if (typeof body[key] === "boolean") partial[key] = body[key];
  }

  await setSettings(partial);
  return NextResponse.json(await getSettings());
}
