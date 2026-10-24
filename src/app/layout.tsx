import type { Metadata, Viewport } from "next";
import { Geist_Mono, Outfit, Work_Sans } from "next/font/google";
import { SiteAnalytics } from "@/components/analytics";
import { Providers } from "@/components/providers";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

// "Geometric Modern" pairing: Outfit headings, Work Sans body.
const heading = Outfit({
  variable: "--font-heading-face",
  subsets: ["latin"],
});

const body = Work_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Absolute base for Open Graph image and canonical URLs.
  metadataBase: new URL(siteUrl),
  title: "Tripfolio — Your world, your journeys",
  description: "Map the countries you've visited, keep your travel memories, and explore the world through other travelers.",
  // Search Console / Bing Webmaster Tools ownership tags, set as env vars in Vercel (verifying by DNS works too).
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0f9ff" },
    { media: "(prefers-color-scheme: dark)", color: "#050b18" },
  ],
};

// Applies the saved theme before first paint (no light/dark flash) and marks JS
// as available, which enables the scroll-reveal animations.
const themeScript = `document.documentElement.classList.add('js');try{var t=localStorage.getItem('tripfolio-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // Lets Next.js turn off smooth scrolling during route changes (pages jump to top instantly).
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${heading.variable} ${body.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Aurora: slow, blurred color fields behind every page. Decorative only. */}
        <div className="aurora" aria-hidden>
          <span />
          <span />
          <span />
          <span />
        </div>
        <Providers>{children}</Providers>
        <SiteAnalytics />
      </body>
    </html>
  );
}
