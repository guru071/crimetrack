/**
 * Google Sheets Integration Example Component
 * 
 * This example shows how to integrate the Google Sheets API backend
 * with your React frontend application.
 * 
 * Location: Create a new file like src/GoogleSheetsExample.jsx
 * 
 * Usage:
 * 1. Copy this file to your src directory
 * 2. Adjust imports as needed
 * 3. Use the component in your app
 * 4. Ensure backend is running on http://localhost:3001
 */

import { useState, useEffect } from 'react';
import GoogleSheetsClient from '../backend/google-sheets-client.js';

// Initialize client
const sheetsClient = new GoogleSheetsClient();

// Example 1: Basic Authentication Component
export function AuthenticationExample() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await sheetsClient.isAuthenticated();
      setAuthenticated(isAuth);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAuth = async () => {
    try {
      setLoading(true);
      const { authUrl } = await sheetsClient.getAuthorizationUrl();
      
      // Open auth URL in new window
      const authWindow = window.open(authUrl, 'Google Auth', 'width=500,height=600');
      
      // Check if user is authenticated after some time
      const interval = setInterval(async () => {
        const isAuth = await sheetsClient.isAuthenticated();
        if (isAuth) {
          setAuthenticated(true);
          authWindow?.close();
          clearInterval(interval);
        }
      }, 1000);

      // Clear interval after 10 minutes
      setTimeout(() => clearInterval(interval), 600000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Google Sheets Authentication</h2>
      {authenticated ? (
        <div style={{ color: 'green' }}>✓ Authenticated with Google</div>
      ) : (
        <button onClick={handleAuth} disabled={loading}>
          {loading ? 'Authenticating...' : 'Sign in with Google'}
        </button>
      )}
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
    </div>
  );
}

// Example 2: Data Sync Component
export function DataSyncExample() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const SPREADSHEET_ID = 'your_spreadsheet_id'; // Replace with your ID
  const RANGE = 'Sheet1!A:Z';

  // Fetch data from Sheets
  const handleFetch = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await sheetsClient.fetchFromSheet(SPREADSHEET_ID, RANGE);
      
      if (result.success) {
        setRecords(result.data);
        console.log(`Fetched ${result.rowCount} records`);
      } else {
        setError('Failed to fetch data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Push data to Sheets
  const handleSync = async () => {
    try {
      setLoading(true);
      setError(null);

      // Example records with required headers
      const recordsToSync = [
        {
          id: '1',
          name: 'John Doe',
          status: 'Active',
          date: new Date().toISOString().split('T')[0],
        },
        {
          id: '2',
          name: 'Jane Smith',
          status: 'Pending',
          date: new Date().toISOString().split('T')[0],
        },
      ];

      const result = await sheetsClient.syncToSheet(
        SPREADSHEET_ID,
        RANGE,
        recordsToSync
      );

      if (result.success) {
        alert(`Successfully synced ${result.updatedRows} rows`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Data Sync</h2>
      <button onClick={handleFetch} disabled={loading}>
        {loading ? 'Loading...' : 'Fetch from Sheets'}
      </button>
      <button onClick={handleSync} disabled={loading} style={{ marginLeft: '10px' }}>
        {loading ? 'Syncing...' : 'Push to Sheets'}
      </button>

      {records.length > 0 && (
        <div>
          <h3>Records ({records.length})</h3>
          <pre>{JSON.stringify(records, null, 2)}</pre>
        </div>
      )}

      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
    </div>
  );
}

// Example 3: Image Upload Component
export function ImageUploadExample() {
  const [uploading, setUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [error, setError] = useState(null);

  const handleImageUpload = async (event) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setUploading(true);
      setError(null);

      // Upload image to Google Drive
      const result = await sheetsClient.uploadImage(
        file,
        file.name,
        file.type
      );

      if (result.success) {
        setUploadedImage({
          fileName: result.fileName,
          fileId: result.fileId,
          shareableLink: result.shareableLink,
          webViewLink: result.webViewLink,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    try {
      if (!uploadedImage) return;

      const result = await sheetsClient.deleteImage(uploadedImage.fileId);
      
      if (result.success) {
        setUploadedImage(null);
        alert('Image deleted successfully');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>Image Upload to Google Drive</h2>

      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        disabled={uploading}
      />

      {uploading && <p>Uploading...</p>}

      {uploadedImage && (
        <div>
          <h3>Uploaded Image</h3>
          <p>
            <strong>File:</strong> {uploadedImage.fileName}
          </p>
          <p>
            <strong>Shareable Link:</strong>{' '}
            <a href={uploadedImage.shareableLink} target="_blank" rel="noopener noreferrer">
              {uploadedImage.shareableLink}
            </a>
          </p>
          <img
            src={uploadedImage.webViewLink}
            alt="Uploaded"
            style={{ maxWidth: '200px', marginTop: '10px' }}
          />
          <br />
          <button onClick={handleDeleteImage} style={{ marginTop: '10px' }}>
            Delete Image
          </button>
        </div>
      )}

      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
    </div>
  );
}

// Main Example Component
export default function GoogleSheetsIntegration() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Google Sheets API Integration</h1>
      <p>This component demonstrates how to use the Google Sheets backend API.</p>

      <hr />
      <AuthenticationExample />

      <hr />
      <DataSyncExample />

      <hr />
      <ImageUploadExample />
    </div>
  );
}
