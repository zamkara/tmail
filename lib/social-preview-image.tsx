import { readFile } from "node:fs/promises"
import path from "node:path"

import { ImageResponse } from "next/og"

export const socialPreviewSize = {
  width: 1200,
  height: 630,
}

export const socialPreviewAlt =
  "Pusat Mail - Create temporary email easily, quickly, and practically."

export async function createSocialPreviewImage() {
  const logo = await readFile(
    path.join(process.cwd(), "public", "ic_tmail.svg"),
    "utf8"
  )
  const socialLogo = logo
    .replace(/<\?xml[^>]*\?>/i, "")
    .replace(/<!DOCTYPE[^>]*>/i, "")
    .replace('width="1000pt"', 'width="1000"')
    .replace('height="1000pt"', 'height="1000"')
  const logoDataUrl = `data:image/svg+xml;base64,${Buffer.from(socialLogo).toString("base64")}`

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        color: "#fafafa",
        background:
          "radial-gradient(circle at 18% 20%, #25263c 0%, #141414 38%, #050505 74%)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 480,
          height: 480,
          right: -120,
          bottom: -260,
          borderRadius: 999,
          background: "#443d8d",
          opacity: 0.28,
        }}
      />
      <div
        style={{
          width: 1040,
          height: 470,
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: "56px 68px",
          border: "2px solid #322e5c",
          borderRadius: 36,
          background: "rgba(20, 20, 20, 0.92)",
          boxShadow: "0 28px 80px rgba(0, 0, 0, 0.45)",
        }}
      >
        <div
          style={{
            width: 280,
            height: 280,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 64,
            border: "2px solid #5b5c9a",
            background: "#f4f4f5",
            boxShadow: "0 18px 48px rgba(68, 61, 141, 0.35)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoDataUrl}
            alt=""
            width={238}
            height={238}
            style={{ objectFit: "contain" }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              color: "#a9a4ff",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            Temporary Email
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 14,
              color: "#fafafa",
              fontSize: 76,
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 1,
            }}
          >
            Pusat Mail
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 570,
              marginTop: 28,
              color: "#b8b8b8",
              fontSize: 30,
              lineHeight: 1.4,
            }}
          >
            Create temporary email easily, quickly, and practically.
          </div>
        </div>
      </div>
    </div>,
    socialPreviewSize
  )
}
