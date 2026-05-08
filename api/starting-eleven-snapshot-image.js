// /api/starting-eleven-snapshot-image.js
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { put } from "@vercel/blob";

export const config = {
  runtime: "nodejs", // important for Resvg
};

export default async function handler(req, res) {
  try {
    const RAW_CSV_URL =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRbFkjDDJ7pKV0Hi4HFx5t5hPQFzbZ3v0XDdD8W981RQ01bbFhhvP5-Q6AmJ8Q2Qdg75SwgM4yQnFsx/pub?output=csv";

    const CSV_URL =
      "https://skc-app-widgets.vercel.app/api/sheet?url=" +
      encodeURIComponent(RAW_CSV_URL);

    const csv = await fetch(CSV_URL).then(r => r.text());
    const players = parseCsv(csv);

    const starters = players.filter(p => p.starting);
    const subs = players.filter(p => !p.starting);

    starters.sort((a, b) => a.jerseyNum - b.jerseyNum);
    subs.sort((a, b) => (a.roster || "").localeCompare(b.roster || ""));

    // Load a font for Satori (Inter from Google Fonts)
    const fontData = await fetch(
      "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTcviYw.ttf"
    ).then(r => r.arrayBuffer());

    const svg = await satori(
      Snapshot({ starters, subs }),
      {
        width: 800,
        height: 600,
        fonts: [
          {
            name: "Inter",
            data: fontData,
            weight: 400,
            style: "normal",
          },
        ],
      }
    );

    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: 800 },
    });

    const png = resvg.render().asPng();

    const { url } = await put("snapshots/startingV1.png", png, {
      access: "public",
      contentType: "image/png",
      cacheControl: "public, max-age=2592000",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      allowOverwrite: true,
      addRandomSuffix: false,
    });

    res.status(200).json({
      ok: true,
      message: "Snapshot PNG updated",
      snapshotUrl: url,
    });
  } catch (err) {
    console.error("Snapshot PNG generation failed:", err);
    res.status(500).json({ ok: false, error: err.toString() });
  }
}

// --- JSX SNAPSHOT LAYOUT (Satori) ---

function Snapshot({ starters, subs }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#ffffff",
        color: "#111111",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: 32,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Starting XI
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {starters.map(p => (
            <div
              key={`starter-${p.jersey}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 16,
              }}
            >
              <div
                style={{
                  minWidth: 32,
                  fontWeight: 700,
                }}
              >
                #{p.jersey}
              </div>
              <div style={{ fontWeight: 500 }}>{p.roster}</div>
              {p.captain && (
                <div
                  style={{
                    marginLeft: 8,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "#0057b8",
                    color: "#ffffff",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  C
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Subs
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            fontSize: 13,
          }}
        >
          {subs.map(p => {
            const parts = (p.roster || "").split(" ");
            const short =
              parts.length > 1 ? parts.slice(1).join(" ") : p.roster;

            return (
              <div
                key={`sub-${p.jersey}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  borderRadius: 4,
                  background: "#f3f4f6",
                }}
              >
                <div style={{ fontWeight: 600 }}>#{p.jersey}</div>
                <div>{short}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- HELPERS ---

function parseCsv(csv) {
  const lines = csv.trim().split("\n");
  const headers = lines.shift().split(",").map(h => h.trim());

  return lines.map(line => {
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h, i) => (obj[h] = (cols[i] || "").trim()));

    obj.jerseyNum = parseInt(obj.jersey, 10) || 0;
    obj.starting = obj.starting === true || obj.starting === "true";
    obj.captain = obj.captain === true || obj.captain === "true";

    return obj;
  });
}
