import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Threadwise — Your day, untangled", template: "%s · Threadwise" },
  description: "Threadwise turns Telegram messages into things people can find, remember, and finish.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  applicationName: "Threadwise",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/pwa/threadwise-icon-192-v2.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/pwa/threadwise-apple-touch-icon-v2.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Threadwise",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f2eb" },
    { media: "(prefers-color-scheme: dark)", color: "#121410" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js?63" strategy="beforeInteractive" />
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
