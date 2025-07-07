const axios = require('axios');

async function testBillingAPI() {
  try {
    console.log('Testing billing API...');
    
    // Test subscription plans
    console.log('\n1. Testing subscription plans...');
    const plansResponse = await axios.get('http://localhost:5000/api/billing/subscription-plans');
    console.log('✅ Subscription plans:', plansResponse.data);
    
    // Test subscriptions
    console.log('\n2. Testing subscriptions...');
    const subscriptionsResponse = await axios.get('http://localhost:5000/api/billing/subscriptions');
    console.log('✅ Subscriptions:', subscriptionsResponse.data);
    
    // Test invoices
    console.log('\n3. Testing invoices...');
    const invoicesResponse = await axios.get('http://localhost:5000/api/billing/invoices');
    console.log('✅ Invoices:', invoicesResponse.data);

    // Test billing history
    console.log('\n4. Testing billing history...');
    const historyResponse = await axios.get('http://localhost:5000/api/billing/history');
    console.log('✅ Billing history:', historyResponse.data);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response && error.response.data && error.response.data.error) {
      console.error('❌ Backend error details:', error.response.data.error);
    }
  }
}

testBillingAPI(); 