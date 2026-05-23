import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import GoogleSheetsHandler from './google-sheets-handler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));
app.use(cors());

// Initialize Google Sheets Handler
let sheetsHandler = null;

const initializeSheetsHandler = () => {
  if (!sheetsHandler) {
    sheetsHandler = new GoogleSheetsHandler(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }
  return sheetsHandler;
};

// ===== OAuth Endpoints =====

/**
 * GET /api/sheets/auth/url - Get OAuth authorization URL
 */
app.get('/api/sheets/auth/url', (req, res) => {
  try {
    const handler = initializeSheetsHandler();
    const authUrl = handler.getAuthorizationUrl();
    res.json({
      success: true,
      authUrl,
      message: 'Visit this URL to authorize the application',
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/sheets/auth/callback - OAuth callback handler
 */
app.post('/api/sheets/auth/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required',
      });
    }

    const handler = initializeSheetsHandler();
    const result = await handler.handleCallback(code);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error in auth callback:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/sheets/auth/status - Check authentication status
 */
app.get('/api/sheets/auth/status', (req, res) => {
  try {
    const handler = initializeSheetsHandler();
    const authenticated = handler.isAuthenticated();

    res.json({
      success: true,
      authenticated,
      message: authenticated ? 'Authenticated' : 'Not authenticated',
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ===== Sheets Data Endpoints =====

/**
 * POST /api/sheets/sync - Push local records to Sheets
 * Body: { spreadsheetId, range, records }
 */
app.post('/api/sheets/sync', async (req, res) => {
  try {
    const { spreadsheetId, range, records } = req.body;

    if (!spreadsheetId || !range || !records) {
      return res.status(400).json({
        success: false,
        error: 'spreadsheetId, range, and records are required',
      });
    }

    const handler = initializeSheetsHandler();
    const result = await handler.syncToSheet(spreadsheetId, range, records);

    res.json(result);
  } catch (error) {
    console.error('Error syncing to sheet:', error);
    const statusCode = error.message.includes('Quota') ? 429 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/sheets/fetch - Pull data from Sheets
 * Query: spreadsheetId, range
 */
app.get('/api/sheets/fetch', async (req, res) => {
  try {
    const { spreadsheetId, range } = req.query;

    if (!spreadsheetId || !range) {
      return res.status(400).json({
        success: false,
        error: 'spreadsheetId and range query parameters are required',
      });
    }

    const handler = initializeSheetsHandler();
    const result = await handler.readFromSheet(spreadsheetId, range);

    res.json(result);
  } catch (error) {
    console.error('Error fetching from sheet:', error);
    const statusCode = error.message.includes('Quota') ? 429 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/sheets/import - Import from Sheets to local
 * Body: { spreadsheetId, range }
 */
app.post('/api/sheets/import', async (req, res) => {
  try {
    const { spreadsheetId, range } = req.body;

    if (!spreadsheetId || !range) {
      return res.status(400).json({
        success: false,
        error: 'spreadsheetId and range are required',
      });
    }

    const handler = initializeSheetsHandler();
    const result = await handler.importFromSheet(spreadsheetId, range);

    res.json(result);
  } catch (error) {
    console.error('Error importing from sheet:', error);
    const statusCode = error.message.includes('Quota') ? 429 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/sheets/two-way-sync - Two-way sync between local and Sheets
 * Body: { spreadsheetId, range, localRecords }
 */
app.post('/api/sheets/two-way-sync', async (req, res) => {
  try {
    const { spreadsheetId, range, localRecords } = req.body;

    if (!spreadsheetId || !range || !localRecords) {
      return res.status(400).json({
        success: false,
        error: 'spreadsheetId, range, and localRecords are required',
      });
    }

    const handler = initializeSheetsHandler();
    const result = await handler.twoWaySync(
      spreadsheetId,
      range,
      localRecords
    );

    res.json(result);
  } catch (error) {
    console.error('Error in two-way sync:', error);
    const statusCode = error.message.includes('Quota') ? 429 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
});

// ===== Google Drive Endpoints =====

/**
 * POST /api/sheets/upload-image - Upload image to Google Drive
 * Body: { base64Data, fileName, mimeType, folderId (optional) }
 */
app.post('/api/sheets/upload-image', async (req, res) => {
  try {
    const { base64Data, fileName, mimeType = 'image/jpeg', folderId } =
      req.body;

    if (!base64Data || !fileName) {
      return res.status(400).json({
        success: false,
        error: 'base64Data and fileName are required',
      });
    }

    const handler = initializeSheetsHandler();

    // Create temporary file from base64
    const tempFilePath = `/tmp/${Date.now()}-${fileName}`;
    const buffer = Buffer.from(base64Data, 'base64');

    // Note: Writing to project temp directory instead of /tmp
    const fs = await import('fs');
    const path = await import('path');
    const projectTempDir = path.join(process.cwd(), '.temp-uploads');

    // Create temp directory if it doesn't exist
    if (!fs.existsSync(projectTempDir)) {
      fs.mkdirSync(projectTempDir, { recursive: true });
    }

    const tempFilePath2 = path.join(projectTempDir, `${Date.now()}-${fileName}`);
    fs.writeFileSync(tempFilePath2, buffer);

    try {
      const result = await handler.uploadImageToDrive(
        tempFilePath2,
        fileName,
        mimeType,
        folderId
      );

      // Clean up temp file
      if (fs.existsSync(tempFilePath2)) {
        fs.unlinkSync(tempFilePath2);
      }

      res.json(result);
    } catch (uploadError) {
      // Clean up temp file on error
      if (fs.existsSync(tempFilePath2)) {
        fs.unlinkSync(tempFilePath2);
      }
      throw uploadError;
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    const statusCode = error.message.includes('Quota') ? 429 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/sheets/delete-image - Delete image from Google Drive
 * Body: { fileId }
 */
app.post('/api/sheets/delete-image', async (req, res) => {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'fileId is required',
      });
    }

    const handler = initializeSheetsHandler();
    const result = await handler.deleteFileFromDrive(fileId);

    res.json(result);
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ===== Utility Endpoints =====

/**
 * GET /api/sheets/info - Get spreadsheet metadata
 * Query: spreadsheetId
 */
app.get('/api/sheets/info', async (req, res) => {
  try {
    const { spreadsheetId } = req.query;

    if (!spreadsheetId) {
      return res.status(400).json({
        success: false,
        error: 'spreadsheetId query parameter is required',
      });
    }

    const handler = initializeSheetsHandler();
    const result = await handler.getSpreadsheetInfo(spreadsheetId);

    res.json(result);
  } catch (error) {
    console.error('Error getting sheet info:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/health - Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Google Sheets API server is running',
    port: PORT,
  });
});

// ===== Error Handling =====

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

/**
 * Global error handler
 */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// ===== Start Server =====

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Google Sheets API Server Running on Port ${PORT}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\n📋 Available Endpoints:`);
    console.log(`  Auth:`);
    console.log(`    GET  /api/sheets/auth/url`);
    console.log(`    POST /api/sheets/auth/callback`);
    console.log(`    GET  /api/sheets/auth/status`);
    console.log(`\n  Sheets Data:`);
    console.log(`    POST /api/sheets/sync`);
    console.log(`    GET  /api/sheets/fetch`);
    console.log(`    POST /api/sheets/import`);
    console.log(`    POST /api/sheets/two-way-sync`);
    console.log(`\n  Google Drive:`);
    console.log(`    POST /api/sheets/upload-image`);
    console.log(`    POST /api/sheets/delete-image`);
    console.log(`\n  Utility:`);
    console.log(`    GET  /api/sheets/info`);
    console.log(`    GET  /api/health`);
    console.log(`\n${'='.repeat(60)}\n`);
  });
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down server gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nTerminating server...');
  process.exit(0);
});

// Start the server
startServer();

export default app;
