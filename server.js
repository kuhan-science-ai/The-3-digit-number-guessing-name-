import express from "express";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIREBASE_HELPER_HOST = "the-number-guessing-game-dbdab.firebaseapp.com";
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE !== "false";
const DEV_ACCESS_PATH = process.env.DEV_ACCESS_PATH || "/dev-kuhan-access";
const DEV_EXIT_PATH = process.env.DEV_EXIT_PATH || "/dev-exit";
const DEV_ACCESS_COOKIE = "dev_maintenance_access";

const app = express();
const port = Number(process.env.PORT || 3000);

app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

function hasDevAccess(req) {
  const cookieHeader = req.headers.cookie || "";
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .includes(`${DEV_ACCESS_COOKIE}=true`);
}

function renderMaintenancePage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Be Right Back | 3 Digit Duel</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      color: #ecf3ff;
      font-family: Arial, sans-serif;
      background:
        radial-gradient(circle at 20% 20%, rgba(88, 230, 177, 0.2), transparent 28%),
        radial-gradient(circle at 80% 18%, rgba(99, 188, 255, 0.18), transparent 24%),
        linear-gradient(145deg, #140f33, #1a2658 48%, #14414a);
    }
    main {
      width: min(620px, 100%);
      padding: 36px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 28px;
      background: rgba(8, 14, 28, 0.72);
      box-shadow: 0 28px 70px rgba(0, 0, 0, 0.35);
      text-align: center;
    }
    p:first-child {
      margin: 0;
      color: #63bcff;
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.22em;
      text-transform: uppercase;
    }
    h1 {
      margin: 14px 0 10px;
      font-size: clamp(2.5rem, 9vw, 5rem);
      line-height: 0.95;
    }
    p:last-child {
      margin: 0;
      color: #aab8d8;
      line-height: 1.7;
    }
  </style>
</head>
<body>
  <main>
    <p>3 Digit Duel</p>
    <h1>Be right back.</h1>
    <p>The game is under maintenance while we tune the puzzle room. Please check again soon.</p>
  </main>
</body>
</html>`;
}

app.get(DEV_ACCESS_PATH, (_req, res) => {
  res.setHeader("Set-Cookie", `${DEV_ACCESS_COOKIE}=true; Path=/; Max-Age=86400; SameSite=Lax`);
  res.redirect("/game");
});

app.get(DEV_EXIT_PATH, (_req, res) => {
  res.setHeader("Set-Cookie", `${DEV_ACCESS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`);
  res.redirect("/");
});

app.use((req, res, next) => {
  if (!MAINTENANCE_MODE || hasDevAccess(req)) {
    next();
    return;
  }

  res.status(503).send(renderMaintenancePage());
});

app.use("/__", async (req, res, next) => {
  const targetUrl = `https://${FIREBASE_HELPER_HOST}${req.originalUrl}`;

  try {
    const forwardedHeaders = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (!value) {
        continue;
      }

      const lowered = key.toLowerCase();
      if (["host", "content-length", "connection"].includes(lowered)) {
        continue;
      }

      if (Array.isArray(value)) {
        forwardedHeaders.set(key, value.join(", "));
      } else {
        forwardedHeaders.set(key, value);
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardedHeaders,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : req,
      duplex: ["GET", "HEAD"].includes(req.method) ? undefined : "half",
      redirect: "manual",
    });

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (["content-encoding", "transfer-encoding", "content-length", "connection"].includes(key.toLowerCase())) {
        return;
      }
      res.setHeader(key, value);
    });

    if (!response.body) {
      res.end();
      return;
    }

    await pipeline(Readable.fromWeb(response.body), res);
  } catch (error) {
    console.error("Firebase helper proxy failed:", error);
    next(error);
  }
});

app.use(express.static(__dirname));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "signin.html"));
});

app.get("/signin", (_req, res) => {
  res.sendFile(path.join(__dirname, "signin.html"));
});

app.get("/game", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`Number Guessing Game is running at http://localhost:${port}`);
});
