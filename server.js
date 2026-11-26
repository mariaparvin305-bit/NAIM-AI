import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json({ limit: "20kb" }));
app.use("/api", rateLimit({ windowMs: 60000, limit: 20 }));

function auth(req, res, next) {
  const expected = String(process.env.API_KEY || "");
  const supplied = String(req.headers["x-api-key"] || "");
  if (!expected || !supplied) {
    return res.status(401).json({ success: false, error: "API key required" });
  }
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ success: false, error: "Invalid API key" });
  }
  next();
}

app.get("/", (_req, res) => res.json({ name: "NAIM AI API", status: "online" }));
app.get("/api/status", (_req, res) => res.json({ success: true, status: "online" }));

app.post("/api/chat", auth, async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ success: false, error: "Server OpenAI key is not configured" });
    }
    const message = req.body?.message;
    if (typeof message !== "string" || !message.trim() || message.length > 10000) {
      return res.status(400).json({ success: false, error: "Send a message (max 10000 characters)." });
    }
    const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await ai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1",
      instructions: "You are NAIM AI, a helpful assistant. Support Bengali and English.",
      input: message.trim()
    });
    res.json({ success: true, bot: "NAIM AI", response: response.output_text, response_id: response.id });
  } catch (err) {
    console.error("AI request failed:", err.message);
    res.status(500).json({ success: false, error: "AI request failed. Check server configuration." });
  }
});

export default app;
