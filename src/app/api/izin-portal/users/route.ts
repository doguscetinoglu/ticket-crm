import { NextResponse } from "next/server";
import { requireLeaveSession } from "@/lib/leave-session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireLeaveSession();
  const users = await prisma.leaveEmployee.findMany({
    select: { id: true, name: true, email: true, department: true, role: true, managerId: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}
