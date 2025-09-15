// show_test_results.js - Run the test and capture full output
const { spawn } = require('child_process');

const testProcess = spawn('node', ['important/test_enhanced_reactivation.js'], {
  cwd: process.cwd(),
  stdio: 'pipe'
});

let output = '';
let errorOutput = '';

testProcess.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text);
});

testProcess.stderr.on('data', (data) => {
  const text = data.toString();
  errorOutput += text;
  process.stderr.write(text);
});

testProcess.on('close', (code) => {
  console.log(`\n\n📊 Test completed with exit code: ${code}`);
  if (code === 0) {
    console.log('🎉 All tests completed successfully!');
  } else {
    console.log('⚠️ Some tests may have failed.');
  }
});
