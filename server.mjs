import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { TikTokLiveConnection, WebcastEvent } from "tiktok-live-connector";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

let tiktokConnection = null;
let currentUsername = "";
let status = { connected: false, message: "● TIKTOK NO CONECTADO" };
const browserClients = new Set();

function broadcast(message) {
  const text = JSON.stringify(message);
  for (const ws of browserClients) {
    if (ws.readyState === 1) ws.send(text);
  }
}

function setStatus(message, connected = false) {
  status = { connected, message };
  broadcast({ type: "status", text: message, connected });
  console.log(message);
}

function cleanUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");
}

function getGiftCoins(data) {
  const perGift =
    Number(data?.extendedGiftInfo?.diamond_count) ||
    Number(data?.diamondCount) ||
    0;

  const repeatCount = Math.max(1, Number(data?.repeatCount) || 1);
  return perGift * repeatCount;
}

async function disconnectTikTok() {
  if (tiktokConnection) {
    try { await tiktokConnection.disconnect(); } catch {}
    tiktokConnection = null;
  }
}

async function connectTikTok(username) {
  username = cleanUsername(username);
  if (!username) throw new Error("Falta el usuario de TikTok.");

  await disconnectTikTok();
  currentUsername = username;
  setStatus(`● CONECTANDO A @${username}…`, false);

  const options = {
    processInitialData: false,
    enableExtendedGiftInfo: true
  };

  // Optional: if you provide EULER_SIGN_API_KEY, the connector will use it.
  if (process.env.EULER_SIGN_API_KEY) {
    options.signApiKey = process.env.EULER_SIGN_API_KEY;
  }

  const connection = new TikTokLiveConnection(username, options);
  tiktokConnection = connection;

  connection.on(WebcastEvent.GIFT, (data) => {
    // Streakable gifts emit multiple events. Process the final event only.
    const giftType = Number(data?.giftDetails?.giftType ?? data?.giftType ?? 0);
    if (giftType === 1 && data?.repeatEnd === false) return;

    const username =
      data?.user?.uniqueId ||
      data?.uniqueId ||
      data?.user?.nickname ||
      data?.nickname;

    if (!username) return;

    const coins = getGiftCoins(data);
    if (!coins) {
      console.log("Regalo recibido, pero no se pudo determinar su valor:", data);
      return;
    }

    const avatarUrl =
      data?.user?.profilePictureUrl ||
      data?.profilePictureUrl ||
      data?.user?.userDetails?.profilePictureUrls?.[0] ||
      "";

    const giftName =
      data?.giftDetails?.giftName ||
      data?.giftName ||
      data?.extendedGiftInfo?.name ||
      "Regalo";

    console.log(`🎁 ${username} -> ${giftName} = ${coins} monedas`);

    broadcast({
      type: "gift",
      username,
      coins,
      avatarUrl,
      giftName
    });
  });

  connection.on("connected", () => {
    setStatus(`● TIKTOK LIVE CONECTADO: @${username}`, true);
  });

  connection.on("disconnected", () => {
    setStatus(`● TIKTOK DESCONECTADO: @${username}`, false);
  });

  connection.on("error", ({ info, exception }) => {
    console.error("TikTok connector error:", info, exception);
    setStatus("● ERROR DE TIKTOK LIVE", false);
  });

  try {
    const state = await connection.connect();
    setStatus(`● TIKTOK LIVE CONECTADO: @${username}`, true);
    return state;
  } catch (error) {
    tiktokConnection = null;
    setStatus(`● NO SE PUDO CONECTAR A @${username}`, false);
    throw error;
  }
}

function serveFile(res, fileName, contentType) {
  const filePath = path.join(__dirname, fileName);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Archivo no encontrado");
    return;
  }
  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/") {
    serveFile(res, "elim_game_tiktok.html", "text/html; charset=utf-8");
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/status") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      ...status,
      username: currentUsername
    }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/connect") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const data = JSON.parse(body || "{}");
        const username = cleanUsername(data.username);
        await connectTikTok(username);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          ok: true,
          message: `● TIKTOK LIVE CONECTADO: @${username}`
        }));
      } catch (error) {
        console.error(error);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          ok: false,
          message: `● ERROR: ${error?.message || "No se pudo conectar"}`
        }));
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

const wss = new WebSocketServer({ server });

wss.on("connection", ws => {
  browserClients.add(ws);
  ws.send(JSON.stringify({
    type: "status",
    text: status.message,
    connected: status.connected
  }));
  ws.on("close", () => browserClients.delete(ws));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("==============================================");
  console.log(" ELIM GAME + TIKTOK LIVE");
  console.log(` Abre: http://localhost:${PORT}`);
  console.log(" Escribe tu @usuario de TikTok LIVE y conecta.");
  console.log("==============================================");
});
