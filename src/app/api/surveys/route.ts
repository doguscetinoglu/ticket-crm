import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.type !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const surveys = await prisma.survey.findMany({
    include: {
      ticket: { select: { id: true, subject: true, fromEmail: true, fromName: true } },
      response: true,
    },
    orderBy: { sentAt: "desc" },
  });

  return NextResponse.json(surveys);
}
