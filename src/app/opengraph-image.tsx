import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "JobHunt — Know which tech jobs are worth applying to";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 34, opacity: 0.8, marginBottom: 20 }}>JobHunt</div>
      <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>
        Know which tech jobs are worth applying to.
      </div>
      <div style={{ fontSize: 30, opacity: 0.75, marginTop: 28 }}>
        AI job matching · CV tailoring · interview prep — US &amp; UK
      </div>
    </div>,
    size,
  );
}
