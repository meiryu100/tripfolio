import type { Metadata, Viewport } from "next";
import { Figtree, Geist_Mono, Noto_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// "Medical Clean" pairing: Figtree headings, Noto Sans body.
const heading = Figtree({
  variable: "--font-heading-face",
  subsets: ["latin"],
});

const body = Noto_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Travora — Your world, your journeys",
  description: "Map the countries you've visited, keep your travel memories, and explore the world through other travelers.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0fdfa" },
    { media: "(prefers-color-scheme: dark)", color: "#071416" },
  ],
};

// Applies the saved theme before first paint to avoid a light/dark flash.
const themeScript = `try{var t=localStorage.getItem('travora-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${heading.variable} ${body.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
