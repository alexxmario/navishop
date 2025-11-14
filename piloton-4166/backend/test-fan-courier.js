#!/usr/bin/env node

require('dotenv').config();
const fanCourierService = require('./services/fanCourierService');

console.log('=== FAN Courier API Test Script ===\n');

// Check environment variables
console.log('1. Checking environment variables...');
console.log(`   Client ID: ${process.env.FAN_COURIER_CLIENT_ID ? '✓ Set' : '✗ Missing'}`);
console.log(`   Username: ${process.env.FAN_COURIER_USERNAME ? '✓ Set' : '✗ Missing'}`);
console.log(`   Password: ${process.env.FAN_COURIER_PASSWORD ? '✓ Set' : '✗ Missing'}`);

if (!process.env.FAN_COURIER_CLIENT_ID || !process.env.FAN_COURIER_USERNAME || !process.env.FAN_COURIER_PASSWORD) {
    console.log('\n❌ Missing required environment variables in .env file');
    process.exit(1);
}

console.log('\n2. Testing authentication...');

async function testAPI() {
    try {
        const authResult = await fanCourierService.authenticate();
        
        if (authResult.success) {
            console.log('✅ Authentication successful!');
            console.log('   Token received');
            
            // Test AWB creation with sample data
            console.log('\n3. Testing AWB creation...');
            const testOrder = {
                orderNumber: 'TEST001',
                recipientName: 'Test Customer',
                recipientPhone: '0700000000',
                recipientEmail: 'test@example.com',
                city: 'Bucuresti',
                county: 'Bucuresti',
                street: 'Calea Victoriei',
                streetNumber: '1',
                postalCode: '010061',
                weight: 1,
                declaredValue: 100,
                cashOnDelivery: 0,
                contents: 'Test package'
            };
            
            try {
                const awbResult = await fanCourierService.createAWB(testOrder, authResult.token);
                if (awbResult.success) {
                    console.log('✅ AWB creation successful!');
                    console.log(`   AWB Number: ${awbResult.awbNumber}`);
                    console.log(`   Cost: ${awbResult.cost} RON`);
                    
                    // Test tracking
                    console.log('\n4. Testing tracking...');
                    const trackingResult = await fanCourierService.trackShipment(awbResult.awbNumber, authResult.token);
                    if (trackingResult.success) {
                        console.log('✅ Tracking successful!');
                        console.log(`   Status: ${trackingResult.status}`);
                    } else {
                        console.log('❌ Tracking failed:', trackingResult.error);
                    }
                } else {
                    console.log('❌ AWB creation failed:', awbResult.error);
                }
            } catch (error) {
                console.log('❌ AWB test failed:', error.message);
            }
            
        } else {
            console.log('❌ Authentication failed:');
            console.log(`   Error: ${authResult.error}`);
            
            console.log('\n🔍 Troubleshooting suggestions:');
            console.log('   1. Verify your credentials are correct in the FAN Courier account');
            console.log('   2. Check if your account has API access enabled');
            console.log('   3. Ensure the client ID corresponds to your username');
            console.log('   4. Try logging into https://www.selfawb.ro manually to verify credentials');
        }
    } catch (error) {
        console.log('❌ Test failed with error:');
        console.log(`   ${error.message}`);
    }
}

testAPI();