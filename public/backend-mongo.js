// backend-mongo.js
// CrimeTrack Pro - MongoDB Backend Server
// Auto-creates the database and collection when you insert records.

const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database Configuration
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'crimetrack_db';
const collectionName = 'records';
const logsCollectionName = 'logs';

const API_SECRET = process.env.API_SECRET || "CHANGE_ME";

let db;

async function initDatabase() {
  try {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    console.log("MongoDB Connected Successfully!");
    db = client.db(dbName);
    console.log("CrimeTrack MongoDB Initialized Successfully!");
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
    const records = await db.collection(collectionName).find({}).toArray();
    res.json(records.map(r => { delete r._id; return r; }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/records', async (req, res) => {
  try {
    const records = req.body.records;
    if (!Array.isArray(records)) return res.status(400).json({ error: 'Body must contain records array' });
    
    const collection = db.collection(collectionName);
    await collection.deleteMany({});
    
    if (records.length > 0) {
      await collection.insertMany(records);
    }
    res.json({ success: true, count: records.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logs', async (req, res) => {
  try {
    const payload = req.body.payload;
    if (!payload) return res.status(400).json({ error: 'Missing log payload' });
    
    await db.collection(logsCollectionName).insertOne({
      timestamp: payload.timestamp,
      officerId: payload.officerId,
      event: payload.event,
      details: payload.details
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    const logs = await db.collection(logsCollectionName)
      .find({})
      .sort({ _id: -1 }) // Sort by insertion order descending
      .limit(20)
      .toArray();
    res.json({ logs: logs.reverse().map(l => { delete l._id; return l; }) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CrimeTrack MongoDB API running on http://localhost:${PORT}`));
