import dotenv from "dotenv";
import express from "express";
import pg from "pg";
import bodyParser from "body-parser";

dotenv.config();
const app = express();
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

const port = 5050;


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


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
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});

