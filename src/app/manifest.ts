import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EstateFlow CRM",
    short_name: "EstateFlow",
    description:
      "Mobile-first real estate CRM — instant lead calling, one-click property sharing, follow-ups, inventory, attendance and social planning.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7fafa",
    theme_color: "#0F766E",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
