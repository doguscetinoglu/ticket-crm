import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import nodemailer from "nodemailer";

export async function GET() {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    from: process.env.EMAIL_FROM,
  };

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.verify();
    const info = await transporter.sendMail({
      from: `"Test" <${config.from}>`,
      to: config.user!,
      subject: "AnahtarDestek - SMTP Test",
      text: "SMTP bağlantısı çalışıyor.",
    });

    return NextResponse.json({ success: true, config, messageId: info.messageId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, config, error: msg }, { status: 500 });
  }
}
