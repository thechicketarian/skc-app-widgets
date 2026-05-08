import { fetchSheetAsJson } from "../utils/sheet.js";

const SHEET_ID = "1abtbXd-o1_v6ILPPquGz8Awr8_ELUVRHJi5aeVvaH4g";
const GID = "0"; // change if needed

async function loadStartingEleven() {
  try {
    const players = await fetchSheetAsJson(SHEET_ID, GID);
    const container = document.getElementById("starting-eleven");
    if (!container) return;

    const html = players
      .map(
        p => `
        <div class="player">
          ${p.photo ? `<img class="player-photo" src="${p.photo}" alt="${p.name}" />` : ""}
          <div class="player-info">
            <div class="player-name">${p.name || ""}</div>
            <div class="player-position">${p.position || ""}</div>
          </div>
        </div>
      `
      )
      .join("");

    container.innerHTML = `<div class="starting-eleven-widget">${html}</div>`;
  } catch (err) {
    console.error("Failed to load starting eleven:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadStartingEleven);
