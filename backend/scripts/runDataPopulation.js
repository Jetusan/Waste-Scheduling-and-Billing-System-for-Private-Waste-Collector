const { populateRealisticData } = require('./populateRealisticData');

console.log('🚀 WSBS Realistic Data Population');
console.log('==================================');
console.log('This script will populate your database with realistic sample data:');
console.log('• 15 realistic users with human names');
console.log('• Subscriptions and billing data');
console.log('• Payment records with various methods');
console.log('• Collection events and activities');
console.log('• Special pickup requests');
console.log('');

populateRealisticData()
  .then(() => {
    console.log('');
    console.log('🎉 SUCCESS! Your WSBS database now has realistic data.');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Go to Admin Dashboard → Insights → Reports');
    console.log('2. Generate a monthly report for October 2024');
    console.log('3. View the realistic business data in your PDF report');
    console.log('');
    console.log('✅ Ready for testing and demonstration!');
  })
  .catch((error) => {
    console.error('');
    console.error('❌ FAILED to populate data:', error.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('• Make sure your database is running');
    console.error('• Check your database connection settings');
    console.error('• Ensure you have subscription plans created');
  });
