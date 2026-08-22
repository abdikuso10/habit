import type { Metadata, Viewport } from "next";
import { Fraunces, Figtree, IBM_Plex_Mono, Amiri } from "next/font/google";
import { MotionConfig } from "framer-motion";
import { AppChrome } from "@/components/AppChrome";
import { LocaleEffect } from "@/components/LocaleEffect";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { TrackerProvider } from "@/providers/TrackerProvider";
import "./globals.css";

// Fraunces carries the personality: an old-style serif with real warmth and
// a slight wonkiness that sits comfortably beside Amiri's calligraphic
// Arabic, without the polished neutrality of a standard display serif.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

// Figtree does the reading work — humanist, warm, and quiet enough to leave
// the display face and the hour colours as the things you notice.
const figtree = Figtree({
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
    "A private discipline and promise-keeping journey through 9 July 2027.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Yawm Wahid",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e1119",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${fraunces.variable} ${figtree.variable} ${ibmPlexMono.variable} ${amiri.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-night text-parchment font-body">
        <a
          href="#main-content"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-lg focus-visible:bg-gold focus-visible:px-4 focus-visible:py-2 focus-visible:text-night"
        >
          Skip to content
        </a>
        <MotionConfig reducedMotion="user">
          <div className="hour-line" aria-hidden="true" />
          <TrackerProvider>
            <LocaleEffect />
            <div id="main-content" className="flex flex-1 flex-col">
              <AppChrome>{children}</AppChrome>
            </div>
          </TrackerProvider>
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
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
