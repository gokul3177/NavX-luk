const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// Connect to SQLite database
const db = new sqlite3.Database("./navxlogs.db", (err) => {
  if (err) return console.error("❌ Failed to connect to DB", err.message);
  console.log("✅ Connected to SQLite DB");

  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      algorithm TEXT,
      start_point TEXT,
      goal_point TEXT,
      obstacles TEXT,
      path TEXT,
      path_length INTEGER,
      time_taken TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Add new simulation result
app.post("/api/path", (req, res) => {
  const { algorithm, start_point, goal_point, obstacles, path, path_length, time_taken } = req.body;
  const query = `
    INSERT INTO logs (algorithm, start_point, goal_point, obstacles, path, path_length, time_taken)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.run(query, [algorithm, start_point, goal_point, obstacles, path, path_length, time_taken], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// Fetch all history
app.get("/api/paths", (req, res) => {
  db.all("SELECT * FROM logs ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ✅ Delete all history (newly added)
app.delete("/api/paths", (req, res) => {
  db.run("DELETE FROM logs", function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "All logs deleted successfully." });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
