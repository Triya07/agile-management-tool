const http = require('http');

const BACKEND_URL = 'http://localhost:5000';
const ENDPOINTS = [
  { path: '/api/health', method: 'GET', name: 'Health Check' },
  { path: '/api/auth/register', method: 'POST', name: 'User Registration' },
  { path: '/api/auth/login', method: 'POST', name: 'User Login' },
  { path: '/api/projects', method: 'GET', name: 'Get Projects' },
  { path: '/api/tasks', method: 'GET', name: 'Get Tasks' }
];

console.log('🚀 FlowBoard Backend Status Checker');
console.log('=====================================\n');

// Check if server is running
function checkServerStatus() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: 'online',
          statusCode: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 'offline',
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 'timeout',
        error: 'Request timed out'
      });
    });

    req.end();
  });
}

// Test specific endpoint
function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 3000
    }, (res) => {
      resolve({
        name: endpoint.name,
        status: res.statusCode,
        success: res.statusCode < 400
      });
    });

    req.on('error', (error) => {
      resolve({
        name: endpoint.name,
        status: 'ERROR',
        success: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: endpoint.name,
        status: 'TIMEOUT',
        success: false,
        error: 'Request timed out'
      });
    });

    // Send test data for POST requests
    if (endpoint.method === 'POST') {
      if (endpoint.path.includes('register')) {
        req.write(JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
          password: 'test123',
          role: 'worker'
        }));
      } else if (endpoint.path.includes('login')) {
        req.write(JSON.stringify({
          email: 'admin@example.com',
          password: 'admin123'
        }));
      }
    }

    req.end();
  });
}

// Main checking function
async function runBackendCheck() {
  console.log('🔍 Checking backend server status...\n');
  
  // Check server status
  const serverStatus = await checkServerStatus();
  
  if (serverStatus.status === 'online') {
    console.log('✅ Backend server is ONLINE');
    console.log(`📡 Status Code: ${serverStatus.statusCode}`);
    console.log(`📊 Response: ${serverStatus.data}\n`);
    
    // Test all endpoints
    console.log('🧪 Testing API endpoints...\n');
    
    for (const endpoint of ENDPOINTS) {
      const result = await testEndpoint(endpoint);
      const icon = result.success ? '✅' : '❌';
      const status = result.success ? 'OK' : 'FAIL';
      
      console.log(`${icon} ${result.name}: ${status} (${result.status})`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
    
  } else {
    console.log('❌ Backend server is OFFLINE');
    console.log(`🚨 Error: ${serverStatus.error}\n`);
    
    console.log('🛠️  Troubleshooting steps:');
    console.log('   1. Make sure you\'re in the backend directory');
    console.log('   2. Run: npm install');
    console.log('   3. Run: npm start');
    console.log('   4. Check if port 5000 is available');
    console.log('   5. Verify database connection');
  }
  
  console.log('\n=====================================');
  console.log('📝 Backend check completed!');
  
  // Show how to start backend if offline
  if (serverStatus.status === 'offline') {
    console.log('\n🚀 To start the backend server:');
    console.log('   cd backend');
    console.log('   npm install');
    console.log('   npm start');
  }
}

// Run the check
runBackendCheck().catch(console.error);
