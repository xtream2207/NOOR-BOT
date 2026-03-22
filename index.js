import { webcrypto } from "crypto";

// FORCE crypto BEFORE anything else
globalThis.crypto = webcrypto;

import express from "express";
import fs from "fs";
import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys";

const app = express();
app.use(express.json());
app.use(express.static("public"));

let sock;
let isConnected = false;

// 🚀 START BOT
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ["NOOR-X", "Chrome", "1.0.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection } = update;

    if (connection === "open") {
      console.log("✅ Connected to WhatsApp");
      isConnected = true;
    }

    if (connection === "close") {
      console.log("❌ Reconnecting...");
      isConnected = false;
      setTimeout(startBot, 3000);
    }
  });
}

startBot();

// 🔗 PAIR
app.post("/pair", async (req, res) => {
  const { number } = req.body;

  if (!number) {
    return res.json({ error: "Enter number" });
  }

  if (!isConnected) {
    return res.json({ error: "Bot not ready" });
  }

  try {
    await new Promise(r => setTimeout(r, 3000));
    const code = await sock.requestPairingCode(number);
    res.json({ code });
  } catch (err) {
    res.json({ error: "Pairing failed" });
  }
});

// 🔐 SESSION
app.get("/session", (req, res) => {
  try {
    if (!fs.existsSync("./auth/creds.json")) {
      return res.json({ error: "Not paired" });
    }

    const creds = fs.readFileSync("./auth/creds.json");
    const data = JSON.parse(creds);

    if (!data.me) {
      return res.json({ error: "Not connected" });
    }

    const session = Buffer.from(creds).toString("base64");
    res.json({ session });

  } catch {
    res.json({ error: "Session error" });
  }
});

// 🌐 SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
