const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testMobileSubscription() {
  try {
    console.log('🧪 Testing Mobile Subscription API...\n');

    // Test data
    const testData = {
      resident_id: 1,
      plan_id: 1, // Lite Plan
      payment_method: 'GCash'
    };

    console.log('📤 Sending request with data:', testData);

    // Make API call
    const response = await axios.post(`${API_BASE_URL}/billing/mobile-subscription`, testData, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('✅ Success! Response:');
    console.log(JSON.stringify(response.data, null, 2));

    // Test with Cash payment method
    console.log('\n🧪 Testing with Cash payment method...');
    
    const cashTestData = {
      resident_id: 1,
      plan_id: 2, // Essential Plan
      payment_method: 'Cash on Collection'
    };

    const cashResponse = await axios.post(`${API_BASE_URL}/billing/mobile-subscription`, cashTestData, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('✅ Cash payment test successful!');
    console.log(JSON.stringify(cashResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error testing mobile subscription:', error.response?.data || error.message);
  }
}

// Run the test
testMobileSubscription(); 