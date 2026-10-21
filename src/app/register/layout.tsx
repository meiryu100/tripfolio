import type { Metadata } from "next";

// The page itself is a client component, so its metadata lives here. Account pages
// aren't useful search results: keep them out of the index, but let crawlers follow links.
export const metadata: Metadata = {
  title: "Create your free account | Tripfolio",
  description: "Sign up for Tripfolio, the free travel map app, and start coloring the countries you've visited.",
  alternates: { canonical: "/register" },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: LayoutProps<"/register">) {
  return children;
}
