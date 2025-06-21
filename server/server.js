const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err.message);
  } else {
    console.log("✅ Connected to MySQL");
  }
});

app.post("/api/path", (req, res) => {
  const { algorithm, start_point, goal_point, obstacles, path, path_length, time_taken } = req.body;
  const sql = `
    INSERT INTO logs (algorithm, start_point, goal_point, obstacles, path, path_length, time_taken)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [algorithm, start_point, goal_point, obstacles, path, path_length, time_taken], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId });
  });
});

app.get("/api/paths", (req, res) => {
  db.query("SELECT * FROM logs ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.delete("/api/paths", (req, res) => {
  db.query("TRUNCATE TABLE logs", (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Logs cleared." });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});