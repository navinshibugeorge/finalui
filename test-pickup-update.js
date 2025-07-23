/**
 * Test script to verify the pickup request update works without the assigned_at column error
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPickupRequestUpdate() {
  try {
    console.log('🧪 Testing pickup request update without assigned_at column...')
    
    // First, get a sample pickup request
    const { data: requests, error: fetchError } = await supabase
      .from('pickup_requests')
      .select('request_id, status, assigned_vendor')
      .eq('status', 'pending')
      .limit(1)
    
    if (fetchError) {
      console.error('❌ Error fetching pickup requests:', fetchError)
      return
    }
    
    if (!requests || requests.length === 0) {
      console.log('⚠️  No pending pickup requests found to test with')
      return
    }
    
    const testRequest = requests[0]
    console.log('📋 Found test request:', testRequest.request_id)
    
    // Test the correct update format (without assigned_at)
    const updateData = {
      status: 'assigned',
      assigned_vendor: 'test-vendor-id',
      winning_bid: 100,
      pickup_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('🔄 Testing update with correct columns:', updateData)
    
    const { error: updateError } = await supabase
      .from('pickup_requests')
      .update(updateData)
      .eq('request_id', testRequest.request_id)
    
    if (updateError) {
      console.error('❌ Update test failed:', updateError)
      console.log('💡 This suggests there are still column issues')
    } else {
      console.log('✅ Update test successful!')
      
      // Revert the test change
      await supabase
        .from('pickup_requests')
        .update({ 
          status: 'pending', 
          assigned_vendor: null, 
          winning_bid: null,
          pickup_date: null 
        })
        .eq('request_id', testRequest.request_id)
      
      console.log('🔄 Reverted test changes')
    }
    
  } catch (error) {
    console.error('❌ Test script error:', error)
  }
}

// Test column existence
async function testColumnStructure() {
  try {
    console.log('🔍 Testing column structure...')
    
    // Try to select with the problematic assigned_at column
    const { data, error } = await supabase
      .from('pickup_requests')
      .select('request_id, status, assigned_vendor, pickup_date, updated_at, created_at')
      .limit(1)
    
    if (error) {
      console.error('❌ Column structure test failed:', error)
    } else {
      console.log('✅ Available columns confirmed:', Object.keys(data[0] || {}))
    }
    
    // Test the problematic assigned_at column specifically
    console.log('🧪 Testing assigned_at column specifically...')
    const { data: assignedAtTest, error: assignedAtError } = await supabase
      .from('pickup_requests')
      .select('assigned_at')
      .limit(1)
    
    if (assignedAtError) {
      console.log('❌ assigned_at column does NOT exist (this is expected):', assignedAtError.message)
      console.log('✅ This confirms we need to use pickup_date instead!')
    } else {
      console.log('⚠️  assigned_at column exists?:', assignedAtTest)
    }
    
  } catch (error) {
    console.error('❌ Column structure test error:', error)
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting pickup request update tests...\n')
  
  await testColumnStructure()
  console.log('\n' + '='.repeat(50) + '\n')
  await testPickupRequestUpdate()
  
  console.log('\n✅ Tests completed!')
}

runTests()
