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
  title: "Slate — Your service. Your reputation. Wherever you work.",
  description:
    "Slate gives servers and bartenders a portable service record built from guest ratings — and lets guests follow the people who make their night.",
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
