import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Threadwise",
    short_name: "Threadwise",
    description: "Find, remember, and finish what you capture in Telegram.",
    id: "/dashboard",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f5f2eb",
    theme_color: "#f5f2eb",
    orientation: "any",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/pwa/threadwise-icon-192-v2.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/threadwise-icon-512-v2.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/threadwise-maskable-512-v2.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
