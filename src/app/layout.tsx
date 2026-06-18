import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReportButton } from "@/components/support/ReportButton";
import { Providers } from "@/components/Providers";
import { Toaster } from "sonner";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ConsoleLoggerInit } from "@/components/ConsoleLoggerInit";
import { Suspense } from "react";
import { SystemNotices } from "@/components/SystemNotices";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "E-Learning - Viện Phương Nam",
  description: "Hệ thống học tập trực tuyến Viện Phương Nam",
  icons: {
    icon: "https://i.ibb.co/twbq42gB/Logo-VPN.png",
    shortcut: "https://i.ibb.co/twbq42gB/Logo-VPN.png",
    apple: "https://i.ibb.co/twbq42gB/Logo-VPN.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ConsoleLoggerInit />
          <Providers>
            <Navbar />
            <div className="min-h-screen pt-11">
              {children}
            </div>
            <ReportButton />
            <Toaster position="top-center" richColors />
            <Suspense fallback={null}>
              <SystemNotices />
            </Suspense>
          </Providers>
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
