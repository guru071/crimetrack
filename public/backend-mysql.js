// backend-mysql.js
// CrimeTrack Pro - MySQL Backend Server
// Auto-creates the database and tables if they don't exist.

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database Configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crimetrack_db'
};

const API_SECRET = process.env.API_SECRET || "CHANGE_ME";

let pool;

async function initDatabase() {
  try {
    const connection = await mysql.createConnection({ host: dbConfig.host, user: dbConfig.user, password: dbConfig.password });
    console.log("MySQL Connected. Ensuring database exists...");
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
    await connection.end();

    pool = mysql.createPool(dbConfig);
    
    // Dynamic Schema for E2E Encryption support
    console.log("Ensuring 'records' table exists...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS records (
        id VARCHAR(50) PRIMARY KEY,
        data JSON
      )
    `);

    console.log("Ensuring 'logs' table exists...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timestamp VARCHAR(50),
        officerId VARCHAR(100),
        officerName VARCHAR(150),
        station VARCHAR(150),
        event VARCHAR(100),
        details TEXT
      )
    `);
    await pool.query('ALTER TABLE logs ADD COLUMN officerName VARCHAR(150)').catch(() => {});
    await pool.query('ALTER TABLE logs ADD COLUMN station VARCHAR(150)').catch(() => {});

    console.log("CrimeTrack Database Initialized Successfully!");
  } catch (err) {
    console.error("Database Initialization Failed:", err);
  }
}
initDatabase();

// Authentication Middleware
app.use((req, res, next) => {
  const secret = req.query.secret || req.body.secret || req.headers['x-api-secret'];
  if (API_SECRET !== "CHANGE_ME" && secret !== API_SECRET) {
    return res.status(401).json({ error: "Unauthorized: Invalid API Secret Key" });
  }
  next();
});

// API Endpoints
app.get('/api/records', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT data FROM records');
    res.json(rows.map(r => r.data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/records', async (req, res) => {
  try {
    const records = req.body.records;
    if (!Array.isArray(records)) return res.status(400).json({ error: 'Body must contain records array' });
    
    await pool.query('TRUNCATE TABLE records');
    if (records.length === 0) return res.json({ success: true, message: 'Database cleared' });

    const values = records.map(rec => [rec.id, JSON.stringify(rec)]);
    await pool.query('INSERT INTO records (id, data) VALUES ?', [values]);

    res.json({ success: true, count: records.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logs', async (req, res) => {
  try {
    const payload = req.body.payload;
    if (!payload) return res.status(400).json({ error: 'Missing log payload' });
    
    await pool.query('INSERT INTO logs (timestamp, officerId, officerName, station, event, details) VALUES (?, ?, ?, ?, ?, ?)', [
      payload.timestamp, payload.officerId, payload.officerName || '', payload.station || '', payload.event, payload.details
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM logs ORDER BY id DESC LIMIT 20');
    res.json({ logs: rows.reverse() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CrimeTrack MySQL API running on http://localhost:${PORT}`));
