import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Lütfen Ticket CRM üzerinden giriş yapın." },
    { status: 400 }
  );
}
