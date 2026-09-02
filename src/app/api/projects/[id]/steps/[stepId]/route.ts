import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function syncProjectStatus(projectId: number) {
  const steps = await prisma.projectStep.findMany({ where: { projectId } });
  const allDone = steps.length > 0 && steps.every(s => s.status === "Tamamlandı");
  const anyInProgress = steps.some(s => s.status === "Devam Ediyor");
  const newStatus = allDone ? "Tamamlandı" : anyInProgress ? "Devam Ediyor" : "Beklemede";
  await prisma.project.update({ where: { id: projectId }, data: { status: newStatus } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; stepId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.type === "customer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, stepId } = await params;
  const { name, status, attachments } = await req.json();

  const before = attachments !== undefined
    ? await prisma.projectStep.findUnique({ where: { id: parseInt(stepId) }, select: { attachments: true } })
    : null;

  const step = await prisma.projectStep.update({
    where: { id: parseInt(stepId) },
    data: {
      ...(name !== undefined && { name }),
      ...(status !== undefined && { status }),
      ...(attachments !== undefined && { attachments: JSON.stringify(Array.isArray(attachments) ? attachments : []) }),
    },
    include: { tasks: true },
  });

  if (attachments !== undefined) {
    const oldCount = JSON.parse(before?.attachments || "[]").length;
    const newCount = Array.isArray(attachments) ? attachments.length : 0;
    if (newCount !== oldCount) {
      await prisma.projectLog.create({
        data: {
          projectId: parseInt(id), userId: session.id, userName: session.name,
          action: newCount > oldCount
            ? `Adım "${step.name}": ${newCount - oldCount} ek eklendi`
            : `Adım "${step.name}": ${oldCount - newCount} ek kaldırıldı`,
        },
      });
    }
  }

  if (status) {
    await syncProjectStatus(parseInt(id));
    await prisma.projectLog.create({
      data: { projectId: parseInt(id), userId: session.id, userName: session.name, action: `Adım "${step.name}": ${status}` },
    });
  }

  return NextResponse.json(step);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; stepId: string }> }) {
  const session = await getSession();
  if (!session || session.type !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, stepId } = await params;

  const step = await prisma.projectStep.delete({ where: { id: parseInt(stepId) } });
  await prisma.projectLog.create({
    data: { projectId: parseInt(id), userId: session.id, userName: session.name, action: `Adım silindi: ${step.name}` },
  });

  return NextResponse.json({ success: true });
}
