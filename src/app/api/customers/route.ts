import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const customers = await prisma.customer.findMany({
    include: {
      _count: { select: { tickets: true } },
      tickets: {
        select: { status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = customers.map((c) => ({
    ...c,
    openTickets: c.tickets.filter((t) => t.status !== "Kapalı" && t.status !== "Yanıtlandı").length,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const { email, name, company, phone, notes, companyIds } = await req.json();
    if (!email) return NextResponse.json({ error: "email zorunlu" }, { status: 400 });

    const customer = await prisma.customer.upsert({
      where: { email },
      update: {
        ...(name !== undefined && { name }),
        ...(company !== undefined && { company }),
        ...(phone !== undefined && { phone }),
        ...(notes !== undefined && { notes }),
      },
      create: { email, name, company, phone, notes },
    });

    if (Array.isArray(companyIds) && companyIds.length > 0) {
      await prisma.customerCompany.createMany({
        data: companyIds.map((cid: number) => ({ customerId: customer.id, companyId: cid })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json(customer, { status: 201 });
  } catch (err) {
    console.error("POST customer error:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
