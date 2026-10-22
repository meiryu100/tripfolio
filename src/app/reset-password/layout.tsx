import type { Metadata } from "next";

// The page itself is a client component, so its metadata lives here. Account pages
// aren't useful search results: keep them out of the index, but let crawlers follow links.
export const metadata: Metadata = {
  title: "Reset password | Tripfolio",
  description: "Choose a new Tripfolio password.",
  alternates: { canonical: "/reset-password" },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: LayoutProps<"/reset-password">) {
  return children;
}
