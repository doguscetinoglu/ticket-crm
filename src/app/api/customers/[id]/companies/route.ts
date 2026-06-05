import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const links = await prisma.customerCompany.findMany({
    where: { customerId: Number(id) },
    include: { company: true },
    orderBy: { company: { name: "asc" } },
  });
  return NextResponse.json(links.map(l => l.company));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.type !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "İsim zorunludur" }, { status: 400 });

  let company = await prisma.company.findFirst({ where: { name: { equals: name.trim(), mode: "insensitive" } } });
  if (!company) company = await prisma.company.create({ data: { name: name.trim() } });

  const link = await prisma.customerCompany.upsert({
    where: { customerId_companyId: { customerId: Number(id), companyId: company.id } },
    update: {},
    create: { customerId: Number(id), companyId: company.id },
    include: { company: true },
  });
  return NextResponse.json(link.company, { status: 201 });
}
