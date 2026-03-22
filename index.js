const express = require("express");
const fs = require("fs");
const {
  default: makeWASocket,
  useMultiFileAuthState
} = require("@whiskeysockets/baileys");

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
    browser: ["NOOR-X", "Chrome", "1.0.0"], // IMPORTANT
  });

  // Save session
  sock.ev.on("creds.update", saveCreds);

  // Connection updates
  sock.ev.on("connection.update", (update) => {
    const { connection } = update;

    if (connection === "open") {
      console.log("✅ Bot Connected to WhatsApp");
      isConnected = true;
    }

    if (connection === "close") {
      console.log("❌ Connection closed. Reconnecting...");
      isConnected = false;
      setTimeout(() => startBot(), 3000);
    }
  });
}

startBot();


// 🔗 PAIR ROUTE
app.post("/pair", async (req, res) => {
  const { number } = req.body;

  if (!number) {
    return res.json({ error: "❌ Enter number with country code" });
  }

  if (!sock || !isConnected) {
    return res.json({ error: "❌ Bot not ready. Wait a few seconds." });
  }

  try {
    // small delay (IMPORTANT FIX)
    await new Promise(resolve => setTimeout(resolve, 3000));

    const code = await sock.requestPairingCode(number);

    console.log("📲 Pairing code generated:", code);

    res.json({ code });

  } catch (err) {
    console.log("PAIR ERROR:", err);
    res.json({ error: "❌ Pairing failed. Try again" });
  }
});


// 🔐 SESSION ROUTE (REAL ONLY)
app.get("/session", (req, res) => {
  try {
    if (!fs.existsSync("./auth/creds.json")) {
      return res.json({ error: "❌ Not paired yet" });
    }

    const creds = fs.readFileSync("./auth/creds.json");
    const data = JSON.parse(creds);

    // Ensure real connection exists
    if (!data.me) {
      return res.json({ error: "❌ Not connected to WhatsApp" });
    }

    const session = Buffer.from(creds).toString("base64");

    res.json({ session });

  } catch (err) {
    console.log("SESSION ERROR:", err);
    res.json({ error: "❌ Session error" });
  }
});


// 🌐 START SERVER
app.listen(3000, () => {
  console.log("🌐 Open in browser: http://127.0.0.1:3000");
});
