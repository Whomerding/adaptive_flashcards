import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import authRoutes from "./routes/auth.routes.js";
import flashcardRoutes from "./routes/flashcards.routes.js";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

// Health check
app.get("/health", (req, res) => res.json({ ok: true }));

// ✅ Separate namespaces:
app.use("/auth", authRoutes);       // /auth/login, /auth/register, /auth/logout
app.use("/api", flashcardRoutes);   // /api/decks, /api/cards, etc.

export default app;