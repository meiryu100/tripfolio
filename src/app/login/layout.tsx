import type { Metadata } from "next";

// The page itself is a client component, so its metadata lives here. Account pages
// aren't useful search results: keep them out of the index, but let crawlers follow links.
export const metadata: Metadata = {
  title: "Log in | Tripfolio",
  description: "Log in to Tripfolio to see your travel map, trips and friends.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: LayoutProps<"/login">) {
  return children;
}
