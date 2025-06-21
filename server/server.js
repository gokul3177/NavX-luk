require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const app = express();
const PORT = process.env.PORT || 4000;

// ✅ Enable CORS from all origins (or customize as needed)
app.use(cors({ origin: "*" }));
app.use(express.json());

// ✅ MySQL connection setup
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306, // ✅ default MySQL port is 3306
});

// ✅ Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err.message);
  } else {
    console.log("✅ Connected to MySQL");

    // ✅ Create table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        algorithm VARCHAR(255),
        start_point TEXT,
        goal_point TEXT,
        obstacles TEXT,
        path TEXT,
        path_length INT,
        time_taken VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    db.query(createTableQuery, (err) => {
      if (err) console.error("❌ Failed to create logs table:", err.message);
      else console.log("✅ logs table is ready.");
    });
  }
});

// ✅ API routes
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

// ✅ Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});