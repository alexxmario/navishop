#!/usr/bin/env node
/**
 * Script to retrieve FAN Courier clientId from the /reports/branches endpoint
 * Run this on the VPS where FAN_COURIER_USERNAME and FAN_COURIER_PASSWORD are configured
 *
 * Usage: node scripts/getFanCourierClientId.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');

const FAN_API_BASE = 'https://api.fancourier.ro';

async function getClientId() {
  const username = process.env.FAN_COURIER_USERNAME;
  const password = process.env.FAN_COURIER_PASSWORD;

  if (!username || !password) {
    console.error('ERROR: FAN_COURIER_USERNAME and FAN_COURIER_PASSWORD must be set in .env');
    process.exit(1);
  }

  console.log('=== FAN Courier ClientId Retrieval ===\n');
  console.log(`Username: ${username}`);
  console.log(`Password: ${'*'.repeat(password.length)}\n`);

  try {
    // Step 1: Authenticate
    console.log('Step 1: Authenticating...');
    const authResponse = await axios.post(`${FAN_API_BASE}/login?username=${username}&password=${password}`);

    if (!authResponse.data?.data?.token) {
      console.error('Authentication failed - no token received');
      console.error('Response:', JSON.stringify(authResponse.data, null, 2));
      process.exit(1);
    }

    const token = authResponse.data.data.token;
    console.log('Authentication successful!\n');

    // Step 2: Get branches
    console.log('Step 2: Fetching branches...');
    const branchesResponse = await axios.get(`${FAN_API_BASE}/reports/branches`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n=== BRANCHES RESPONSE ===\n');
    console.log(JSON.stringify(branchesResponse.data, null, 2));

    // Extract clientId(s)
    if (branchesResponse.data?.data && Array.isArray(branchesResponse.data.data)) {
      console.log('\n=== YOUR CLIENT IDs ===\n');
      branchesResponse.data.data.forEach((branch, index) => {
        console.log(`Branch ${index + 1}:`);
        console.log(`  Name: ${branch.name || 'N/A'}`);
        console.log(`  Client ID: ${branch.clientId}`);
        console.log(`  Address: ${branch.address || 'N/A'}`);
        console.log('');
      });

      console.log('=== INSTRUCTIONS ===');
      console.log('Copy the clientId value and set it in your .env file:');
      console.log(`FAN_COURIER_CLIENT_ID=${branchesResponse.data.data[0]?.clientId || 'YOUR_CLIENT_ID'}`);
    }

  } catch (error) {
    console.error('\nERROR:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.error('\nAuthentication failed. Please check your username and password.');
    }
    process.exit(1);
  }
}

getClientId();
