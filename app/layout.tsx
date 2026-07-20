import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import ServiceWorker from "@/components/ServiceWorker";

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
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MyBiomarker",
  },
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
        <a
          href="#main"
          className="sr-only z-20 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <BottomNav />
        <div className="flex flex-1 flex-col lg:pl-60">
          <header className="py-4 text-center text-sm font-semibold text-fg-secondary lg:hidden">
            MyBiomarker
          </header>
          <main id="main" className="mx-auto w-full max-w-md flex-1 px-5 pb-28 lg:max-w-3xl lg:pt-10 lg:pb-10">
            {children}
          </main>
        </div>
        <ServiceWorker />
      </body>
    </html>
  );
}
