const axios = require('axios');
const { schedulingPool } = require('./config/db');

const API_URL = 'http://localhost:5000/api';

async function testResidentUpdate() {
    try {
        // First get all residents
        console.log('\nTesting resident update:');
        const residentsResponse = await axios.get(`${API_URL}/residents`);
        const residents = residentsResponse.data;
        
        if (residents.length === 0) {
            console.log('❌ No residents found to test update');
            return;
        }

        const testResident = residents[0];
        console.log('Original resident data:', testResident);

        // Try to update the first resident
        const updateData = {
            first_name: 'UpdatedFirstName',
            last_name: 'UpdatedLastName',
            contact_number: '09999999999',
            street_address: 'Updated Street',
            barangay: 'Updated Barangay',
            city: 'GenSan',
            subscription_status: 'active'
        };

        const updateResponse = await axios.put(
            `${API_URL}/residents/${testResident.resident_id}`,
            updateData
        );

        console.log('Update response:', updateResponse.data);
        console.log('✅ Resident update test completed');
    } catch (err) {
        console.error('❌ Error testing resident update:', err.response?.data || err.message);
    }
}

async function testCollectorUpdate() {
    try {
        // First get all collectors
        console.log('\nTesting collector update:');
        const collectorsResponse = await axios.get(`${API_URL}/collectors`);
        const collectors = collectorsResponse.data;
        
        if (collectors.length === 0) {
            console.log('❌ No collectors found to test update');
            return;
        }

        const testCollector = collectors[0];
        console.log('Original collector data:', testCollector);

        // Try to update the first collector
        const updateData = {
            username: 'updated_collector',
            contact_number: '09888888888',
            truck_number: 'TRUCK-001',
            license_number: 'LICENSE-001',
            status: 'active'
        };

        const updateResponse = await axios.put(
            `${API_URL}/collectors/${testCollector.collector_id}`,
            updateData
        );

        console.log('Update response:', updateResponse.data);
        console.log('✅ Collector update test completed');
    } catch (err) {
        console.error('❌ Error testing collector update:', err.response?.data || err.message);
    }
}

async function runTests() {
    try {
        console.log('Starting API tests...');
        await testResidentUpdate();
        await testCollectorUpdate();
        console.log('\nAll tests completed');
    } catch (err) {
        console.error('Error running tests:', err);
    } finally {
        process.exit();
    }
}

runTests(); 