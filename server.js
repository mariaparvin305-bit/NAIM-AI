import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json({ limit: "20kb" }));
app.use("/api", rateLimit({ windowMs: 60000, limit: 20 }));

function auth(req, res, next) {
  const expected = String(process.env.API_KEY || "");
  const supplied = String(req.headers["x-api-key"] || req.query.key || "");
  if (!expected || !supplied) return res.status(401).json({ success: false, error: "API key required" });
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ success: false, error: "Invalid API key" });
  }
  next();
}

app.get("/", (_req, res) => res.json({ name: "NAIM AI API", status: "online" }));
app.get("/api/status", (_req, res) => res.json({
  success: true, status: "online",
  model_configured: Boolean(process.env.GEMINI_API_KEY)
}));

async function generateAnswer(message, res) {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(503).json({ success: false, error: "Gemini API key is not configured on the server" });

    if (typeof message !== "string" || !message.trim() || message.length > 10000) {
      return res.status(400).json({ success: false, error: "Send a message (max 10000 characters)." });
    }

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You are NAIM AI, a helpful assistant. Support Bengali and English." }] },
        contents: [{ role: "user", parts: [{ text: message.trim() }] }]
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("Gemini API error:", data?.error?.message || upstream.status);
      return res.status(502).json({ success: false, error: "AI provider request failed" });
    }

    const answer = data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "").join("") || "No response was returned.";
    return res.json({ success: true, bot: "NAIM AI", model, response: answer });
  } catch (err) {
    console.error("AI request failed:", err.message);
    return res.status(500).json({ success: false, error: "AI request failed. Check server configuration." });
  }
}

app.post("/api/chat", auth, (req, res) => generateAnswer(req.body?.message, res));

// Browser-friendly GET format: /api/chat?message=Hello&key=YOUR_API_KEY
app.get("/api/chat", auth, (req, res) => generateAnswer(req.query.message, res));

export default app;
