import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ADAP",
    short_name: "ADAP",
    description: "American Design And Printing — custom print, packaging, apparel.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#0047ab",
    background_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
