import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; companyId: string }> }
) {
  const session = await getSession();
  if (!session || session.type !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, companyId } = await params;
  await prisma.customerCompany.deleteMany({
    where: { customerId: Number(id), companyId: Number(companyId) },
  });
  return NextResponse.json({ success: true });
}
