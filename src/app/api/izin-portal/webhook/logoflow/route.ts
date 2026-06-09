import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const secret = process.env.LOGOFLOW_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers.get("x-logoflow-signature") ?? "";
    const body = await req.text();
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
      return NextResponse.json({ error: "Geçersiz imza." }, { status: 401 });
    return handlePayload(JSON.parse(body));
  }
  return handlePayload(await req.json());
}

async function handlePayload(payload: { event: string; requestId: string; status?: string; reason?: string }) {
  const { event, requestId } = payload;
  if (!requestId) return NextResponse.json({ error: "requestId zorunludur." }, { status: 400 });

  const request = await prisma.leaveRequest.findUnique({ where: { id: requestId } });
  if (!request) return NextResponse.json({ error: "Talep bulunamadı." }, { status: 404 });

  if (event === "approved") {
    await prisma.leaveRequest.update({ where: { id: requestId }, data: { status: "APPROVED", logoFlowStatus: "APPROVED" } });
    await prisma.leaveStatusHistory.create({
      data: { leaveRequestId: requestId, status: "APPROVED", changedBy: "LogoFlow", note: "LogoFlow üzerinden onaylandı." },
    });
    await prisma.leaveBalance.upsert({
      where: { employeeId_year_leaveType: { employeeId: request.employeeId, year: request.startDate.getFullYear(), leaveType: request.leaveType } },
      update: { usedDays: { increment: request.days } },
      create: { employeeId: request.employeeId, year: request.startDate.getFullYear(), leaveType: request.leaveType, totalDays: 20, usedDays: request.days },
    });
  } else if (event === "rejected") {
    await prisma.leaveRequest.update({ where: { id: requestId }, data: { status: "REJECTED", logoFlowStatus: "REJECTED" } });
    await prisma.leaveStatusHistory.create({
      data: { leaveRequestId: requestId, status: "REJECTED", changedBy: "LogoFlow", note: payload.reason ?? "LogoFlow üzerinden reddedildi." },
    });
  } else if (event === "synced") {
    await prisma.leaveRequest.update({ where: { id: requestId }, data: { logoFlowStatus: "SYNCED" } });
  }

  return NextResponse.json({ ok: true });
}
