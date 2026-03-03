import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import flashcardRoutes from "./routes/flashcards.routes.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

// Health check
app.get("/health", (req, res) => res.json({ ok: true }));

// ✅ Separate namespaces:
app.use("/auth", authRoutes);       // /auth/login, /auth/register, /auth/logout
app.use("/api", flashcardRoutes);   // /api/decks, /api/cards, etc.

export default app;