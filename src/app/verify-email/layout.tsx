import type { Metadata } from "next";

// The page itself is a client component, so its metadata lives here. Account pages
// aren't useful search results: keep them out of the index, but let crawlers follow links.
export const metadata: Metadata = {
  title: "Confirm your email | Tripfolio",
  description: "Confirm your email address to open your Tripfolio account.",
  alternates: { canonical: "/verify-email" },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: LayoutProps<"/verify-email">) {
  return children;
}
