import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

// ---- CSV SOURCE ----
const RAW_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRbFkjDDJ7pKV0Hi4HFx5t5hPQFzbZ3v0XDdD8W981RQ01bbFhhvP5-Q6AmJ8Q2Qdg75SwgM4yQnFsx/pub?output=csv";

const CSV_URL = `https://skc-app-widgets.vercel.app/api/sheet?url=${encodeURIComponent(
  RAW_CSV_URL
)}`;

// ---- FILE PATHS ----
const HASH_FILE = path.join(process.cwd(), "public", "starting-eleven.hash");
const PNG_FILE = path.join(process.cwd(), "public", "starting-eleven.png");

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

    // ---- 5. Launch Puppeteer (19.11.1 compatible) ----
    console.log("▶ Launching Puppeteer…");

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process"
      ]
    });

    const page = await browser.newPage();

    // ---- 6. Load embed page ----
    console.log("▶ Loading embed page…");

    await page.goto(
      "https://skc-app-widgets.vercel.app/starting-eleven/embed",
      { waitUntil: "networkidle0" }
    );

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
