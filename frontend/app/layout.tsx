import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GradientBackground } from "@/app/components/motion";
import { PageViewBeacon } from "@/app/components/PageViewBeacon";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Slate — Book the experience. Follow the talent.",
  description:
    "Slate connects guests with the servers and bartenders who make their night — with verified ratings, portable on-chain profiles, and $SERVE token rewards.",
  manifest: '/manifest.json',
  themeColor: '#000000',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black',
    title: 'Slate',
  },
  icons: {
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white font-sans">
        <PageViewBeacon />
        <GradientBackground />
        <div className="relative z-[1] flex min-h-full flex-1 flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
