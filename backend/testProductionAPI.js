/**
 * Test the production API on Render to see if it has the same data
 */

const https = require('https');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function testProductionAPI() {
  console.log('🧪 Testing Production API on Render...');
  
  const PRODUCTION_API = 'https://waste-scheduling-and-billing-system-for.onrender.com';
  
  try {
    // Test 1: Check if API is alive
    console.log('\n🔍 Step 1: Testing if production API is alive...');
    const healthUrl = `${PRODUCTION_API}/health`;
    console.log(`🔗 Testing: ${healthUrl}`);
    
    try {
      const healthResponse = await makeRequest(healthUrl);
      console.log(`   Status: ${healthResponse.status}`);
      if (healthResponse.status === 200) {
        console.log('✅ Production API is alive');
      } else {
        console.log('⚠️ Production API responded but with non-200 status');
      }
    } catch (error) {
      console.log('❌ Production API health check failed:', error.message);
    }
    
    // Test 2: Test the collection API endpoint
    console.log('\n🔍 Step 2: Testing collection assignments endpoint...');
    const collectionUrl = `${PRODUCTION_API}/api/collector/assignments/today?collector_id=6&barangay_id=19`;
    console.log(`🔗 Testing: ${collectionUrl}`);
    
    try {
      const collectionResponse = await makeRequest(collectionUrl);
      console.log(`   Status: ${collectionResponse.status}`);
      
      if (collectionResponse.status === 200) {
        const data = collectionResponse.data;
        console.log('✅ Production API responded successfully');
        console.log(`📊 Response data:`);
        console.log(`   Assignment: ${data.assignment ? 'Found' : 'None'}`);
        console.log(`   Stops: ${data.stops ? data.stops.length : 0}`);
        console.log(`   Message: ${data.message || 'None'}`);
        
        if (data.stops && data.stops.length > 0) {
          console.log(`\n👥 First few residents:`);
          data.stops.slice(0, 3).forEach((stop, i) => {
            console.log(`     ${i + 1}. ${stop.resident_name || 'Unknown'} - ${stop.subscription_status || 'Unknown'}`);
          });
          console.log('\n🎯 CONCLUSION: ✅ Production API has residents - frontend should work!');
        } else {
          console.log('\n🎯 CONCLUSION: ❌ Production API has NO residents - this explains the frontend issue!');
          console.log('   Possible reasons:');
          console.log('   1. Production database is empty or different from local');
          console.log('   2. Collection schedules not set up on production');
          console.log('   3. No residents with active subscriptions on production');
          console.log('   4. Different barangay IDs on production vs local');
        }
        
        // Show full response for debugging
        console.log('\n📦 Full API Response:');
        console.log(JSON.stringify(data, null, 2));
        
      } else {
        console.log('❌ Production API failed');
        console.log('   Response:', collectionResponse.data);
      }
    } catch (error) {
      console.log('❌ Collection API test failed:', error.message);
    }
    
    // Test 3: Check if barangays exist on production
    console.log('\n🔍 Step 3: Testing barangays endpoint...');
    const barangaysUrl = `${PRODUCTION_API}/api/barangays`;
    console.log(`🔗 Testing: ${barangaysUrl}`);
    
    try {
      const barangaysResponse = await makeRequest(barangaysUrl);
      console.log(`   Status: ${barangaysResponse.status}`);
      
      if (barangaysResponse.status === 200) {
        const barangays = barangaysResponse.data;
        console.log(`✅ Found ${barangays.length || 0} barangays on production`);
        
        if (barangays && barangays.length > 0) {
          console.log('   Barangays:');
          barangays.slice(0, 10).forEach(b => {
            console.log(`     ID: ${b.barangay_id}, Name: ${b.barangay_name}`);
          });
          
          // Check if City Heights exists
          const cityHeights = barangays.find(b => 
            b.barangay_name && b.barangay_name.toLowerCase().includes('city heights')
          );
          
          if (cityHeights) {
            console.log(`\n🏘️ City Heights found: ID ${cityHeights.barangay_id}`);
            if (cityHeights.barangay_id !== 19) {
              console.log(`⚠️ WARNING: City Heights has different ID on production (${cityHeights.barangay_id}) vs local (19)`);
            }
          } else {
            console.log(`❌ City Heights NOT found on production!`);
          }
        }
      } else {
        console.log('❌ Barangays API failed');
      }
    } catch (error) {
      console.log('❌ Barangays API test failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Production API test failed:', error);
  }
}

// Run the test
testProductionAPI().then(() => {
  console.log('\n✅ Production API test completed!');
}).catch(error => {
  console.error('❌ Test failed:', error);
});
