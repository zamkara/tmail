import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pusat Mail",
    short_name: "Pusat Mail",
    description: "Create temporary email easily, quickly, and practically.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/ic_tmail.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  }
}
