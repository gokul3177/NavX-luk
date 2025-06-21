// server.js
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;

// Configure CORS to allow specific origins
// It's crucial to list all domains from which your frontend might access this backend.
// This includes your main Vercel domain, any Vercel preview URLs, and your local development server.
app.use(cors({
  origin: [
    'https://navx-luk.vercel.app', // Your primary Vercel domain
    'https://navx-413iqj69d-gokuls-projects-18c993ea.vercel.app', // The specific Vercel preview URL from your error
    'http://localhost:3000' // For local frontend development (adjust port if different)
  ],
  credentials: true // Important if you plan to send cookies or authorization headers
}));

app.use(express.json());

// Create MySQL connection
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err.message);
  } else {
    console.log("✅ Connected to MySQL");

    // Create table if not exists
    const createTable = `
      CREATE TABLE IF NOT EXISTS logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        algorithm VARCHAR(50),
        start_point TEXT,
        goal_point TEXT,
        obstacles TEXT,
        path TEXT,
        path_length INT,
        time_taken VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    db.query(createTable, (err) => {
      if (err) {
        console.error("❌ Failed to create logs table:", err.message);
      } else {
        console.log("✅ logs table is ready.");
      }
    });
  }
});

// POST: Save a new simulation result
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

// GET: Retrieve all simulation results
app.get("/api/paths", (req, res) => {
  db.query("SELECT * FROM logs ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// DELETE: Truncate the logs table
app.delete("/api/paths", (req, res) => {
  db.query("TRUNCATE TABLE logs", (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Logs cleared." });
  });
});

// Start the server
// Listen on '0.0.0.0' to be accessible from outside the container in deployment environments like Railway
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
