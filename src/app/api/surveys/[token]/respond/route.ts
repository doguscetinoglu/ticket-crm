import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const survey = await prisma.survey.findUnique({
    where: { token },
    include: { response: true },
  });

  if (!survey) return NextResponse.json({ error: "Anket bulunamadı" }, { status: 404 });
  if (survey.response) return NextResponse.json({ error: "Bu anket zaten doldurulmuş" }, { status: 409 });

  const { q1, q2, q3, q4, q5, comment } = await req.json();
  const scores = [q1, q2, q3, q4, q5];
  if (scores.some((s) => typeof s !== "number" || s < 1 || s > 5)) {
    return NextResponse.json({ error: "Tüm sorular 1-5 arası değer almalıdır" }, { status: 400 });
  }

  const response = await prisma.surveyResponse.create({
    data: { surveyId: survey.id, q1, q2, q3, q4, q5, comment: comment?.trim() || null },
  });

  return NextResponse.json(response, { status: 201 });
}
