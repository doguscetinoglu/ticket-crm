import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET() {
  const config = {
    EMAIL_FROM: process.env.EMAIL_FROM,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_PASS_length: process.env.SMTP_PASS?.length,
    SMTP_PASS_first4: process.env.SMTP_PASS?.substring(0, 4),
  };

  let smtpTest = "not tested";
  try {
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });
    await t.verify();
    smtpTest = "SUCCESS - bağlantı çalışıyor";
  } catch (e) {
    smtpTest = `FAILED: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json({ ...config, smtpTest });
}
