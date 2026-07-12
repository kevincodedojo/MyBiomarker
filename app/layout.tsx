import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MyBiomarker",
  description:
    "Track your key biomarkers over time and get AI-powered insights into what they mean.",
};

export const viewport: Viewport = {
  themeColor: "#272c26",
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
      <body className="min-h-full flex flex-col">
        <header className="py-4 text-center text-sm font-semibold text-fg-secondary">
          MyBiomarker
        </header>
        <main className="mx-auto w-full max-w-md flex-1 px-5 pb-28">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
