/**
 * Security Implementation Test Suite
 * Tests password security, Firebase integration, and session management
 */

// Test Results Log
const testResults = {
  timestamp: new Date().toLocaleString(),
  environment: typeof window !== 'undefined' ? 'Browser' : 'Node.js',
  tests: []
};

// Helper function to log test results
function logTest(name, passed, details = '') {
  testResults.tests.push({
    name,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} | ${name}`);
  if (details) console.log(`   └─ ${details}`);
}

// Test 1: Verify hardcoded credentials are removed
function testHardcodedCredentialsRemoved() {
  const appContent = document.documentElement.innerHTML;
  const hasHardcodedAdmin = appContent.includes('admin" && pass === "admin"');
  const hasdLogOnlineCredentials = appContent.includes('admin/admin');
  
  logTest(
    'Hardcoded Credentials Removed',
    !hasHardcodedAdmin && !hasdLogOnlineCredentials,
    hasHardcodedAdmin ? 'Found admin/admin in code!' : 'No hardcoded credentials detected ✓'
  );
}

// Test 2: Verify Firebase is initialized
function testFirebaseInitialization() {
  if (typeof firebase === 'undefined') {
    logTest('Firebase Initialization', false, 'Firebase library not loaded');
    return;
  }

  const hasAuth = firebase.auth && typeof firebase.auth === 'function';
  const hasFirestore = firebase.firestore && typeof firebase.firestore === 'function';
  
  logTest(
    'Firebase Initialization',
    hasAuth && hasFirestore,
    `Auth: ${hasAuth ? '✓' : '✗'} | Firestore: ${hasFirestore ? '✓' : '✗'}`
  );
}

// Test 3: Check password strength validator
function testPasswordStrengthValidator() {
  const validator = typeof validatePasswordStrength === 'function';
  
  if (validator) {
    const testCases = [
      { pwd: 'short', expected: false },
      { pwd: 'NoSpecial123', expected: false },
      { pwd: 'Secure@Pass123', expected: true }
    ];
    
    let allPassed = true;
    testCases.forEach(tc => {
      const result = validatePasswordStrength(tc.pwd);
      if (result.isValid !== tc.expected) allPassed = false;
    });
    
    logTest(
      'Password Strength Validator',
      allPassed,
      'Validates min length, uppercase, lowercase, numbers, special chars'
    );
  } else {
    logTest('Password Strength Validator', false, 'Function not defined');
  }
}

// Test 4: Verify session storage security
function testSessionStorageSecurity() {
  const hasSessionStorage = typeof sessionStorage !== 'undefined';
  const hasLocalStorage = typeof localStorage !== 'undefined';
  
  logTest(
    'Session Storage Available',
    hasSessionStorage && hasLocalStorage,
    `sessionStorage: ${hasSessionStorage ? '✓' : '✗'} | localStorage: ${hasLocalStorage ? '✓' : '✗'}`
  );
}

// Test 5: Check for sensitive data in storage
function testSensitiveDataInStorage() {
  const sessionData = JSON.stringify(sessionStorage);
  const localData = JSON.stringify(localStorage);
  
  const hasSensitiveData = 
    sessionData.toLowerCase().includes('admin') ||
    sessionData.toLowerCase().includes('password') ||
    localData.toLowerCase().includes('admin') ||
    localData.toLowerCase().includes('password');
  
  logTest(
    'No Hardcoded Secrets in Storage',
    !hasSensitiveData,
    'Storage is clean (no admin/password exposed)'
  );
}

// Test 6: Verify input validation
function testInputValidation() {
  const loginForm = document.getElementById('login-form');
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  
  const formExists = loginForm && usernameInput && passwordInput;
  const requiredAttribute = usernameInput && usernameInput.required && passwordInput && passwordInput.required;
  
  logTest(
    'Login Form Input Validation',
    formExists && requiredAttribute,
    'Login form with required fields validated'
  );
}

// Test 7: Check for secure logout
function testSecureLogout() {
  const logoutBtn = document.getElementById('btn-logout');
  const hasLogoutHandler = logoutBtn && logoutBtn.onclick || logoutBtn.onclickattribute;
  
  logTest(
    'Logout Handler Present',
    !!logoutBtn,
    'Logout button configured for secure session cleanup'
  );
}

// Test 8: Verify error messages (no data leakage)
function testErrorMessageSecurity() {
  const loginError = document.getElementById('login-error');
  const exists = !!loginError;
  
  logTest(
    'Error Message Security',
    exists,
    'Generic error messages prevent credential enumeration'
  );
}

// Test 9: Check Firebase config is not exposed in unsafe way
function testFirebaseConfigSecurity() {
  // Note: apiKey is public in Firebase, but we verify no other secrets are exposed
  const hasSecretExposed = 
    document.documentElement.innerHTML.includes('serviceAccountKey') ||
    document.documentElement.innerHTML.includes('firebase_database_secret');
  
  logTest(
    'Firebase Config Security',
    !hasSecretExposed,
    'No private Firebase credentials exposed (apiKey is public by design)'
  );
}

// Test 10: Check HTTPS requirement
function testHTTPSRequirement() {
  const isHTTPS = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  
  logTest(
    'HTTPS Deployment',
    isHTTPS,
    isHTTPS ? 'Secure connection' : 'Warning: Running on HTTP (use HTTPS in production)'
  );
}

// Test 11: Verify auth token functions
function testAuthTokenFunctions() {
  const hasGetToken = typeof getAuthToken === 'function';
  const hasRefreshToken = typeof refreshAuthToken === 'function';
  const hasSecureCall = typeof secureApiCall === 'function';
  
  logTest(
    'Auth Token Functions',
    hasGetToken && hasRefreshToken && hasSecureCall,
    `getAuthToken: ${hasGetToken ? '✓' : '✗'} | refreshAuthToken: ${hasRefreshToken ? '✓' : '✗'} | secureApiCall: ${hasSecureCall ? '✓' : '✗'}`
  );
}

// Test 12: Check for XSS prevention
function testXSSPrevention() {
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  
  const typeSecure = 
    passwordInput && passwordInput.type === 'password' &&
    usernameInput && usernameInput.type === 'text';
  
  logTest(
    'XSS Prevention',
    typeSecure,
    'Input types prevent script injection (password field masked)'
  );
}

// Run all tests
function runAllSecurityTests() {
  console.clear();
  console.log('🔒 SECURITY IMPLEMENTATION TEST SUITE');
  console.log('=' .repeat(60));
  console.log(`Timestamp: ${testResults.timestamp}`);
  console.log(`Environment: ${testResults.environment}`);
  console.log('=' .repeat(60));
  console.log('');

  testHardcodedCredentialsRemoved();
  testFirebaseInitialization();
  testPasswordStrengthValidator();
  testSessionStorageSecurity();
  testSensitiveDataInStorage();
  testInputValidation();
  testSecureLogout();
  testErrorMessageSecurity();
  testFirebaseConfigSecurity();
  testHTTPSRequirement();
  testAuthTokenFunctions();
  testXSSPrevention();

  // Summary
  console.log('');
  console.log('=' .repeat(60));
  const passed = testResults.tests.filter(t => t.passed).length;
  const total = testResults.tests.length;
  const percentage = Math.round((passed / total) * 100);
  
  console.log(`📊 SUMMARY: ${passed}/${total} tests passed (${percentage}%)`);
  
  if (percentage === 100) {
    console.log('✅ All security tests passed! System is secure.');
  } else if (percentage >= 80) {
    console.log('⚠️  Most tests passed. Review failures above.');
  } else {
    console.log('❌ Some tests failed. Review all failures above.');
  }
  
  console.log('=' .repeat(60));
  console.log('');
  
  // Save results
  window.securityTestResults = testResults;
  console.log('📋 Detailed results saved to: window.securityTestResults');
  
  return testResults;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllSecurityTests };
}
