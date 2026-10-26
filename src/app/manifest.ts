import type { MetadataRoute } from "next";

/** Web app manifest: lets phones add Tripfolio to the home screen and open it like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tripfolio — Your travel map",
    short_name: "Tripfolio",
    description: "Color the countries you've visited, keep your trips and photos, and follow friends' maps.",
    id: "/",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#f0f9ff",
    theme_color: "#f0f9ff",
    categories: ["travel", "lifestyle", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
