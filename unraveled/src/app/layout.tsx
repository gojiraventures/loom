import type { Metadata } from "next";
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Analytics } from "@vercel/analytics";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://unraveled.ai';

export const metadata: Metadata = {
  title: {
    default: "Unraveled — Cross-Tradition Evidence Index",
    template: "%s | Unraveled",
  },
  description:
    "When geographically isolated civilizations independently describe the same phenomena with structural specificity — that's not coincidence. That's a pattern worth investigating.",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: "Unraveled — Where Ancient Threads Meet",
    description:
      "Cross-referencing religious texts, ancient records, and physical evidence across civilizations that had no contact.",
    siteName: "Unraveled",
    type: "website",
    url: BASE_URL,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Unraveled — Cross-Tradition Evidence Index' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@unraveledtruth',
    title: 'Unraveled — Cross-Tradition Evidence Index',
    description: 'When isolated civilizations describe the same phenomena independently — that\'s a pattern worth investigating.',
    images: ['/og-default.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
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
      className={`${newsreader.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Anti-flash: apply stored theme before first paint — must be in <head> so React doesn't reconcile it */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})();`,
          }}
        />
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-1DNZZ9R40M" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-1DNZZ9R40M');`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
