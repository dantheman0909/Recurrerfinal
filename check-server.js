#!/usr/bin/env node

// Simple server checker
import fetch from 'node-fetch';

// Get port from environment or default to common options
const testPorts = process.env.PORT 
  ? [parseInt(process.env.PORT)] 
  : [3000, 3001, 5000, 5001, 7000, 8000, 8080];

// Endpoint paths to test
const endpoints = [
  '/health',
  '/api/status',
  '/api/customers',
  '/api/mysql/companies'
];

// Test a single endpoint
async function testEndpoint(port, path) {
  const url = `http://localhost:${port}${path}`;
  
  try {
    console.log(`Testing ${url}...`);
    const start = Date.now();
    const response = await fetch(url, { timeout: 3000 });
    const end = Date.now();
    
    console.log(`  Status: ${response.status} (${end - start}ms)`);
    
    if (response.ok) {
      try {
        const data = await response.json();
        console.log(`  Response: ${JSON.stringify(data).substring(0, 100)}${JSON.stringify(data).length > 100 ? '...' : ''}`);
      } catch (err) {
        console.log(`  Response: Could not parse JSON: ${err.message}`);
      }
    }
    
    return {
      port,
      path,
      status: response.status,
      success: response.ok,
      time: end - start
    };
  } catch (err) {
    console.log(`  Error: ${err.message}`);
    return {
      port,
      path,
      status: 0,
      success: false,
      error: err.message
    };
  }
}

// Test all ports
async function testAllPorts() {
  console.log(`\n=== Server Check - Testing ports: ${testPorts.join(', ')} ===\n`);
  
  const results = {
    working: [],
    notWorking: []
  };
  
  // Test each port
  for (const port of testPorts) {
    console.log(`\nTesting port ${port}...`);
    let portWorking = false;
    
    for (const endpoint of endpoints) {
      const result = await testEndpoint(port, endpoint);
      
      if (result.success) {
        portWorking = true;
        results.working.push(result);
      } else {
        results.notWorking.push(result);
      }
    }
    
    if (portWorking) {
      console.log(`\n✓ Port ${port} has working endpoints\n`);
    } else {
      console.log(`\n✗ Port ${port} has no working endpoints\n`);
    }
  }
  
  return results;
}

// Run tests and report results
async function runTests() {
  try {
    const results = await testAllPorts();
    
    console.log(`\n=== TEST SUMMARY ===`);
    
    if (results.working.length > 0) {
      console.log(`\nWORKING ENDPOINTS:`);
      results.working.forEach(r => {
        console.log(`  ✓ http://localhost:${r.port}${r.path} (${r.status}, ${r.time}ms)`);
      });
    } else {
      console.log(`\nNO WORKING ENDPOINTS FOUND`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(`\nTEST ERROR: ${err.message}`);
    process.exit(1);
  }
}

// Run tests
runTests();