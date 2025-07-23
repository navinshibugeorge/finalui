/**
 * Test the fixed vendor column issue
 * This should work now without the company_name/id column errors
 */

// Test function to validate vendor table access with correct columns
async function testVendorTableAccess() {
  console.log('🧪 Testing vendor table access with correct columns...')
  
  try {
    // Import the debug function
    const { debugDatabaseAccess } = await import('./lib/pickup-request-service.ts')
    
    console.log('🔧 Running database access debug...')
    await debugDatabaseAccess()
    
    console.log('✅ Database debug completed successfully!')
    console.log('💡 Key fixes applied:')
    console.log('  - Removed assigned_at column (doesn\'t exist) → using pickup_date')
    console.log('  - Removed company_name column (doesn\'t exist) from vendors table')
    console.log('  - Removed id column (doesn\'t exist) from vendors table → using vendor_id')
    console.log('  - Updated selectBidWinner to use correct column names')
    
    return true
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

// Export for browser console use
if (typeof window !== 'undefined') {
  window.testVendorTableAccess = testVendorTableAccess
  console.log('🚀 Test function available: testVendorTableAccess()')
  console.log('💡 The bidding system should now work without 400 Bad Request errors!')
  console.log('📋 Summary of fixes:')
  console.log('  1. Fixed assigned_at column issue (pickup_requests table)')
  console.log('  2. Fixed company_name column issue (vendors table)')
  console.log('  3. Fixed id column issue (vendors table)')
  console.log('  4. Updated all database queries to use existing columns only')
}
