import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "E-posta ve şifre zorunludur" }, { status: 400 });
    }

    // Önce User tablosunda ara
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.isActive && await bcrypt.compare(password, user.password)) {
      const token = await signToken({
        id: user.id,
        email: user.email,
        name: user.name,
        type: user.isAdmin ? "admin" : "agent",
        color: user.color,
        isAdmin: user.isAdmin,
      });
      const res = NextResponse.json({ ok: true, type: user.isAdmin ? "admin" : "agent", name: user.name });
      res.cookies.set(COOKIE, token, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax" });
      return res;
    }

    // Customer tablosunda ara
    const customer = await prisma.customer.findUnique({ where: { email } });
    if (customer && customer.isActive && customer.password && await bcrypt.compare(password, customer.password)) {
      const token = await signToken({
        id: customer.id,
        email: customer.email,
        name: customer.name ?? customer.email,
        type: "customer",
      });
      const res = NextResponse.json({ ok: true, type: "customer", name: customer.name ?? customer.email });
      res.cookies.set(COOKIE, token, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax" });
      return res;
    }

    return NextResponse.json({ error: "E-posta veya şifre hatalı" }, { status: 401 });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
