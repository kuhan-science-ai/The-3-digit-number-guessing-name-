import express from "express";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIREBASE_HELPER_HOST = "the-number-guessing-game-dbdab.firebaseapp.com";

const app = express();
const port = Number(process.env.PORT || 3000);

app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
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
