import fs from "fs";
import path from "path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

// ---- CSV SOURCE ----
const RAW_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRbFkjDDJ7pKV0Hi4HFx5t5hPQFzbZ3v0XDdD8W981RQ01bbFhhvP5-Q6AmJ8Q2Qdg75SwgM4yQnFsx/pub?output=csv";

const CSV_URL = `https://skc-app-widgets.vercel.app/api/sheet?url=${encodeURIComponent(
  RAW_CSV_URL
)}`;

// ---- FILE PATHS ----
  const isProd = process.env.VERCEL_ENV === "production";
console.log("▶ ENV:", process.env.VERCEL, process.env.VERCEL_ENV);

const PNG_FILE = isProd
  ? "/tmp/starting-eleven.png"
  : path.join(process.cwd(), "public", "starting-eleven.png");

const HASH_FILE = isProd
  ? "/tmp/starting-eleven.hash"
  : path.join(process.cwd(), "public", "starting-eleven.hash");

// ---- Tiny hash function ----
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

export default async function handler(req, res) {
  try {
    console.log("▶ Starting screenshot pipeline…");

    const host = req.headers.host || "";
    const isLocal =
      host.includes("localhost") || host.includes("127.0.0.1");

    const EMBED_URL = isLocal
      ? "http://localhost:3000/starting-eleven/embed"
      : "https://skc-app-widgets.vercel.app/starting-eleven/embed";

    console.log("▶ Environment:", isLocal ? "LOCAL" : "PRODUCTION");
    console.log("▶ Using embed URL:", EMBED_URL);

    // ---- 1. Fetch CSV ----
    const csvRes = await fetch(CSV_URL);
    const csv = await csvRes.text();

    // ---- 2. Compute hash ----
    const newHash = hashString(csv);

    // ---- 3. Load last hash ----
    let oldHash = null;
    if (fs.existsSync(HASH_FILE)) {
      oldHash = fs.readFileSync(HASH_FILE, "utf8");
    }

    // ---- 4. If unchanged → exit fast ----
    if (oldHash === newHash) {
      console.log("✔ No change detected — skipping screenshot");
      return res.status(200).json({ updated: false, reason: "no-change" });
    }

    // ---- 5. Launch Puppeteer (Node 24 compatible) ----
    console.log("▶ Launching Puppeteer…");

    const executablePath = isLocal
      ? undefined // local uses full Chrome
      : await chromium.executablePath();

    const browser = await puppeteer.launch({
      executablePath,
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // ---- 6. Load embed page ----
    console.log("▶ Loading embed page…");

    await page.goto(EMBED_URL, { waitUntil: "networkidle0" });

    // ---- 7. Wait for widget to fully render ----
    console.log("▶ Waiting for widget to render…");

    await page.waitForFunction(
      () => {
        const el = document.querySelector("#starting-eleven");
        return el && el.innerText.trim().length > 0;
      },
      { timeout: 15000 }
    );

    // ---- 8. Screenshot widget ----
    console.log("▶ Taking screenshot…");

    const element = await page.$("#starting-eleven");
    await element.screenshot({ path: PNG_FILE });

    await browser.close();

    // ---- 9. Save new hash ----
    fs.writeFileSync(HASH_FILE, newHash);

    console.log("✔ Screenshot updated successfully");

    return res.status(200).json({ updated: true });
  } catch (err) {
    console.error("❌ Screenshot error:", err);
    return res.status(500).json({ error: "failed" });
  }
}
