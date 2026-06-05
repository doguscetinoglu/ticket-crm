import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const survey = await prisma.survey.findUnique({
    where: { token },
    include: {
      ticket: { select: { id: true, subject: true, fromName: true } },
      response: true,
    },
  });

  if (!survey) return NextResponse.json({ error: "Anket bulunamadı" }, { status: 404 });
  return NextResponse.json(survey);
}
