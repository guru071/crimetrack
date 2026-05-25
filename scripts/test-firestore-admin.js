import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

const SERVICE_ACCOUNT_FILE = path.join(process.cwd(), 'backend', 'service-account.json');

async function testFirestoreConnection() {
  console.log('Testing Firestore connection using Service Account...');
  
  if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
    console.error('Service account file not found!');
    return;
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_FILE,
    scopes: [
      'https://www.googleapis.com/auth/datastore',
      'https://www.googleapis.com/auth/cloud-platform',
    ],
  });

  const firestore = google.firestore({ version: 'v1', auth });
  
  try {
    // Attempt to list collections in the 'case' database
    // The parent format is: projects/{projectId}/databases/{databaseId}/documents
    const parent = 'projects/case-3791e/databases/case/documents';
    
    console.log(`Connecting to: ${parent}`);
    
    // Write a test document to prove full read/write access
    const testDocPath = `${parent}/test_connection/ping`;
    
    console.log('Writing test document...');
    await firestore.projects.databases.documents.patch({
      name: testDocPath,
      requestBody: {
        fields: {
          timestamp: { stringValue: new Date().toISOString() },
          status: { stringValue: "Connection Successful!" }
        }
      }
    });
    
    console.log('✅ Write successful! Reading the document back...');
    
    const readResponse = await firestore.projects.databases.documents.get({
      name: testDocPath
    });
    
    console.log('✅ Read successful! Document data:');
    console.log(JSON.stringify(readResponse.data.fields, null, 2));

    const usersResponse = await firestore.projects.databases.documents.list({
      parent,
      collectionId: 'users',
      pageSize: 10,
    });
    const officers = usersResponse.data.documents || [];
    const registeredCount = officers.filter((document) => {
      const fields = document.fields || {};
      return fields.policeId?.stringValue && fields.station?.stringValue;
    }).length;

    console.log(`\n✅ Registered police profile documents found: ${registeredCount}`);
    officers.slice(0, 5).forEach((document, index) => {
      const fields = document.fields || {};
      console.log(`   ${index + 1}. ${fields.policeId?.stringValue || 'NO_POLICE_ID'} | ${fields.station?.stringValue || 'NO_STATION'} | provider=${fields.provider?.stringValue || 'unknown'}`);
    });

    const authClient = await auth.getClient();
    const authResponse = await authClient.request({
      url: 'https://identitytoolkit.googleapis.com/v1/projects/case-3791e/accounts:query',
      method: 'POST',
      data: { returnUserInfo: true, maxResults: 10 },
    });
    const authUsers = authResponse.data?.userInfo || [];
    const verifiedUsers = authUsers.filter((user) => user.emailVerified).length;
    console.log(`\n✅ Firebase Authentication users found: ${authUsers.length} (${verifiedUsers} email-verified)`);
    authUsers.slice(0, 5).forEach((user, index) => {
      const providers = (user.providerUserInfo || []).map((provider) => provider.providerId).join(',') || 'unknown';
      console.log(`   ${index + 1}. uid=${user.localId} | verified=${user.emailVerified} | provider=${providers}`);
    });
    
    console.log('\n✅ FIRESTORE "case" DATABASE IS FULLY CONNECTED AND WORKING!');
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error(error.message);
  }
}

testFirestoreConnection();
