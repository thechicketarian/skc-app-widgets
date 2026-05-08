import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

export const config = {
  runtime: "nodejs",
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

    const png = new Resvg(svg).render().asPng();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.status(200).send(png);

  } catch (err) {
    console.error("Snapshot PNG generation failed:", err);
    res.status(500).json({ ok: false, error: err.toString() });
  }
}

function Snapshot({ starters, subs }) {
  return (
    <div style={{ fontFamily: "Inter", padding: 32 }}>
      <h3>Starting XI</h3>
      {starters.map(p => (
        <div key={p.jersey}>
          #{p.jersey} {p.roster} {p.captain ? " (C)" : ""}
        </div>
      ))}

      <h3 style={{ marginTop: 24 }}>Subs</h3>
      {subs.map(p => (
        <div key={p.jersey}>
          #{p.jersey} {p.roster}
        </div>
      ))}
    </div>
  );
}

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
