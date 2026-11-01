import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Telugu } from "next/font/google";
import "./globals.css";

const telugu = Noto_Sans_Telugu({
  variable: "--font-telugu",
  subsets: ["telugu"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const latin = Noto_Sans({
  variable: "--font-latin",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aria · ఆరియా — తెలుగులో ఏదైనా నేర్చుకోండి",
  description:
    "Aria is a friendly Telugu guide. Ask anything — UPI, Gen Z slang, new languages, what's happening in India — and she explains it in simple Telugu, out loud.",
  applicationName: "Aria",
  appleWebApp: { capable: true, title: "Aria", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#14132b" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="te" className={`${telugu.variable} ${latin.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
