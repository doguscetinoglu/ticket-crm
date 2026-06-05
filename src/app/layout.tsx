import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import ThemeProvider from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ticket CRM",
  description: "Müşteri Destek Yönetimi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('crm-theme');document.documentElement.classList.toggle('dark',t!=='light');}())` }} />
      </head>
      <body className={`${inter.className} bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-gray-100 min-h-screen transition-colors duration-200`}>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
