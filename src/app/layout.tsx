import type { Metadata } from "next";
import { Marcellus, Sora, IBM_Plex_Mono, Amiri } from "next/font/google";
import { MotionConfig } from "framer-motion";
import "./globals.css";

const marcellus = Marcellus({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

const sora = Sora({
  variable: "--font-body",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-numeric",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const amiri = Amiri({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Yawm Wahid — Day One",
  description:
    "A personal 365-day discipline tracker for rebuilding spiritual, physical, and mental discipline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${marcellus.variable} ${sora.variable} ${ibmPlexMono.variable} ${amiri.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-night text-parchment font-body">
        <MotionConfig reducedMotion="user">
          <div className="dawn-line" aria-hidden="true" />
          <div className="flex flex-1 flex-col">{children}</div>
          <footer className="border-t border-white/10 px-4 py-8 text-center">
            <p dir="rtl" className="font-arabic text-base text-gold">
              وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا
            </p>
            <p className="mt-1.5 text-xs text-slate">
              &ldquo;Those who strive for Us — We will surely guide them to
              Our ways.&rdquo; — Qur&apos;an 29:69
            </p>
          </footer>
        </MotionConfig>
      </body>
    </html>
  );
}
