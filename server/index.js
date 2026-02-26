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

app.get("/", (req, res) => {
  console.log("Received request for /");
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});

