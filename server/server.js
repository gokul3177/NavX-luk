// server.js
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
require("dotenv").config(); // Load environment variables from .env file (for local dev)

const app = express();
// Render sets the PORT environment variable. We use that, or a default for local development.
const PORT = process.env.PORT || 4000; 

// Configure CORS for your frontend application(s).
// Replace these with the actual deployed URLs of your Vercel frontend.
// Render services are typically HTTPS.
app.use(cors({
  origin: [
    'https://navx-luk.vercel.app', // Your primary Vercel domain
    // Add any specific Vercel preview URLs you want to allow for testing
    'https://navx-413iqj69d-gokuls-projects-18c993ea.vercel.app', // Example preview URL
    'http://localhost:3000' // Keep this for local frontend development
  ],
  credentials: true // Important if your frontend sends cookies or auth headers
}));

app.use(express.json());

// Create MySQL connection
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306,
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

// NEW: Basic root route to confirm server is running
app.get("/", (req, res) => {
  res.status(200).send("NavX Backend is running!");
});

// POST: Save a new simulation result
app.post("/api/path", (req, res) => {
  const { algorithm, start_point, goal_point, obstacles, path, path_length, time_taken } = req.body;
  const sql = `
    INSERT INTO logs (algorithm, start_point, goal_point, obstacles, path, path_length, time_taken)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [algorithm, start_point, goal_point, obstacles, path, path_length, time_taken], (err, result) => {
    if (err) {
      console.error("Error inserting path data:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: result.insertId });
  });
});

// GET: Retrieve all simulation results
app.get("/api/paths", (req, res) => {
  db.query("SELECT * FROM logs ORDER BY id DESC", (err, results) => {
    if (err) {
      console.error("Error retrieving paths:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// DELETE: Truncate the logs table
app.delete("/api/paths", (req, res) => {
  db.query("TRUNCATE TABLE logs", (err) => {
    if (err) {
      console.error("Error truncating logs table:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Logs cleared." });
  });
});

// Start the server
// Render uses the PORT environment variable and handles external accessibility.
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
