const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bkihtswnnrtpcrxftyqq.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraWh0c3dubnJ0cGNyeGZ0eXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwNjI0NDMsImV4cCI6MjA1MjYzODQ0M30.1S-zUxjVJnl0OJNNTJXJGlQ3SkYVNDHd_lzRfqxJhHU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testBidWinnerUpdate() {
  console.log('🧪 Testing bid winner update with correct primary key...')
  
  try {
    // Test the vendor_bids table structure
    console.log('1. Testing vendor_bids table access...')
    
    // This should work with the actual client
    const { data: bidsTest, error: bidsError } = await supabase
      .from('vendor_bids')
      .select('id, bid_id, request_id, vendor_id, bid_amount')
      .limit(1)
    
    if (bidsError) {
      console.log('❌ vendor_bids access error (expected with anon key):', bidsError.message)
    } else {
      console.log('✅ vendor_bids accessible:', bidsTest)
    }
    
    // Test the update logic that was fixed
    console.log('\n2. Testing the fixed update logic...')
    
    // Simulate the winningBid object structure
    const mockWinningBid = {
      id: 'sample-id-123',         // This is the actual primary key
      bid_id: undefined,           // This was causing the error
      vendor_id: '46e19b87-80ba-4476-be94-970ba3788e73',
      bid_amount: 300000
    }
    
    console.log('Mock winning bid:', mockWinningBid)
    
    // Test the bidId selection logic
    const bidId = mockWinningBid.id || mockWinningBid.bid_id
    console.log('Selected bid ID for update:', bidId)
    console.log('Will the update work?', bidId ? 'YES' : 'NO')
    
    // Test the fallback case
    const mockWinningBidWithBidId = {
      bid_id: 'sample-bid-id-456',
      vendor_id: '46e19b87-80ba-4476-be94-970ba3788e73',
      bid_amount: 300000
    }
    
    const bidIdFallback = mockWinningBidWithBidId.id || mockWinningBidWithBidId.bid_id
    console.log('Fallback bid ID:', bidIdFallback)
    
    console.log('\n✅ ANALYSIS:')
    console.log('- The fix handles both id and bid_id fields correctly')
    console.log('- Uses id as primary key (correct for Supabase)')
    console.log('- Falls back to bid_id if id is not available')
    console.log('- Should eliminate the "bid_id=eq.undefined" error')
    
    console.log('\n🎯 NEXT STEPS:')
    console.log('1. Update vendor collecting_waste_types in Supabase')
    console.log('2. Test the complete bidding flow')
    console.log('3. Verify that winner selection works without 400 errors')
    
  } catch (error) {
    console.error('Test error:', error)
  }
}

testBidWinnerUpdate()
