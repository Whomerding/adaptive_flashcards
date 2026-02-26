import dotenv from "dotenv";
import express from "express";
import pg from "pg";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";



dotenv.config();
const app = express();
const port = 5050;
const saltRounds = 10;

app.use(cors({ origin: "http://localhost:3000" })); // CRA
app.use(express.json());

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { parentId: ... }
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
});
db.connect();

app.get("/deck/:id", async (req, res, next) => {
  const deckId = req.params.id;
  try {
    const q = `
      SELECT f.id, f.prompt, f.answer, df.position
      FROM decks d
      JOIN deck_facts df ON d.id = df.deck_id
      JOIN facts f ON df.fact_id = f.id
      WHERE d.id = $1
      ORDER BY df.position;
    `;
    const result = await db.query(q, [req.params.id]);
    res.json({ facts: result.rows });
  } catch (err) {
    next(err);
  }
});

app.get("/me", requireAuth, async (req, res) => {
  const { parentId } = req.user;
  const parent = await db.query("SELECT id, email FROM parents WHERE id = $1", [parentId]);
  res.json({ parent: parent.rows[0] });
});



// Authentication
app.post("/auth/register", async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!email) return res.status(400).json({ error: "Email is required" });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

    const existing = await db.query("SELECT id FROM parents WHERE email = $1", [email]);
    if (existing.rows.length) return res.status(409).json({ error: "Account already exists" });

    const password_hash = await bcrypt.hash(password, saltRounds);

    const created = await db.query(
      "INSERT INTO parents (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email, password_hash]
    );

    const parent = created.rows[0];

    const token = jwt.sign(
      { parentId: parent.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.status(201).json({ token, parent });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const result = await db.query(
      "SELECT id, email, password_hash FROM parents WHERE email = $1",
      [email]
    );

    const parent = result.rows[0];
    if (!parent) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, parent.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { parentId: parent.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.json({ token, parent: { id: parent.id, email: parent.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});


   app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});