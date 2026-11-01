import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aria · ఆరియా",
    short_name: "Aria",
    description: "తెలుగులో ఏదైనా నేర్చుకోండి. Learn anything in Telugu.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf8f3",
    theme_color: "#fbf8f3",
    lang: "te",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
