import mysql from "mysql2/promise";

const allowedOrigins = [
  "https://navx-luk.vercel.app", // ✅ frontend domain
  "https://n-a-v-x.vercel.app",  // ✅ optional: fallback frontend
];
function setCorsHeaders(res, origin) {
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");
}

async function getDbConnection() {
  return await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306
  });
}

let tableCreated = false;
async function ensureTable() {
  if (tableCreated) return;
  const conn = await getDbConnection();
  await conn.query(`
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
  `);
  await conn.end();
  tableCreated = true;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  setCorsHeaders(res, origin);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  await ensureTable();
  const conn = await getDbConnection();

  try {
    if (req.method === "GET") {
      const [rows] = await conn.query("SELECT * FROM logs ORDER BY id DESC");
      res.status(200).json(rows);

    } else if (req.method === "POST") {
      const {
        algorithm,
        start_point,
        goal_point,
        obstacles,
        path,
        path_length,
        time_taken
      } = req.body;

      const sql = `
        INSERT INTO logs (algorithm, start_point, goal_point, obstacles, path, path_length, time_taken)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await conn.execute(sql, [
        algorithm,
        start_point,
        goal_point,
        obstacles,
        path,
        path_length,
        time_taken
      ]);

      res.status(201).json({ id: result.insertId });

    } else if (req.method === "DELETE") {
      await conn.query("TRUNCATE TABLE logs");
      res.status(200).json({ message: "Logs cleared." });

    } else {
      res.setHeader("Allow", "GET,POST,DELETE,OPTIONS");
      res.status(405).json({ error: "Method Not Allowed" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    await conn.end();
  }
}
