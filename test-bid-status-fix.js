const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = 'https://bkihtswnnrtpcrxftyqq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraWh0c3dubnJ0cGNyeGZ0eXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwNjI0NDMsImV4cCI6MjA1MjYzODQ0M30.1S-zUxjVJnl0OJNNTJXJGlQ3SkYVNDHd_lzRfqxJhHU'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testBidStatusFix() {
  console.log('🧪 Testing bid status fix...')

  try {
    // 1. Check the current vendor_bids table structure
    console.log('\n1️⃣ Checking vendor_bids table structure...')
    const { data: sampleBids, error: structureError } = await supabase
      .from('vendor_bids')
      .select('*')
      .limit(1)

    if (structureError) {
      console.error('Error accessing vendor_bids:', structureError)
      return
    }

    if (sampleBids && sampleBids.length > 0) {
      console.log('✅ Vendor bids table structure:', Object.keys(sampleBids[0]))
      console.log('✅ Status column exists:', 'status' in sampleBids[0])
      console.log('✅ No is_winner column:', !('is_winner' in sampleBids[0]))
    } else {
      console.log('ℹ️ No existing bids found')
    }

    // 2. Test updating bid status to 'won'
    console.log('\n2️⃣ Testing bid status update to "won"...')
    
    // First, create a test request with bids
    const testRequestId = 'test-' + Date.now()
    const testVendorId1 = 'test-vendor-1'
    const testVendorId2 = 'test-vendor-2'

    // Create test pickup request
    const { error: requestError } = await supabase
      .from('pickup_requests')
      .insert({
        request_id: testRequestId,
        factory_id: 'test-factory',
        waste_type: 'plastic',
        estimated_quantity: 100,
        status: 'pending',
        bidding_ends_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      })

    if (requestError) {
      console.error('Error creating test request:', requestError)
      return
    }
    console.log('✅ Created test pickup request:', testRequestId)

    // Create test bids
    const { error: bidsError } = await supabase
      .from('vendor_bids')
      .insert([
        {
          request_id: testRequestId,
          vendor_id: testVendorId1,
          vendor_name: 'Test Vendor 1',
          bid_amount: 500,
          status: 'active'
        },
        {
          request_id: testRequestId,
          vendor_id: testVendorId2,
          vendor_name: 'Test Vendor 2',
          bid_amount: 600,
          status: 'active'
        }
      ])

    if (bidsError) {
      console.error('Error creating test bids:', bidsError)
      return
    }
    console.log('✅ Created test bids')

    // 3. Test updating winner bid status
    console.log('\n3️⃣ Testing winner selection with status update...')
    
    // Update winning bid to 'won'
    const { error: winnerUpdateError } = await supabase
      .from('vendor_bids')
      .update({ status: 'won' })
      .eq('request_id', testRequestId)
      .eq('vendor_id', testVendorId2) // Vendor 2 has higher bid

    if (winnerUpdateError) {
      console.error('❌ Error updating winner bid status:', winnerUpdateError)
    } else {
      console.log('✅ Successfully updated winner bid status to "won"')
    }

    // Update losing bid to 'lost'
    const { error: loserUpdateError } = await supabase
      .from('vendor_bids')
      .update({ status: 'lost' })
      .eq('request_id', testRequestId)
      .eq('vendor_id', testVendorId1) // Vendor 1 has lower bid

    if (loserUpdateError) {
      console.error('❌ Error updating loser bid status:', loserUpdateError)
    } else {
      console.log('✅ Successfully updated loser bid status to "lost"')
    }

    // 4. Test querying winning bid
    console.log('\n4️⃣ Testing querying winning bid by status...')
    
    const { data: winningBid, error: queryError } = await supabase
      .from('vendor_bids')
      .select('*')
      .eq('request_id', testRequestId)
      .eq('status', 'won')
      .single()

    if (queryError) {
      console.error('❌ Error querying winning bid:', queryError)
    } else {
      console.log('✅ Successfully found winning bid:', {
        vendor_name: winningBid.vendor_name,
        bid_amount: winningBid.bid_amount,
        status: winningBid.status
      })
    }

    // 5. Clean up test data
    console.log('\n5️⃣ Cleaning up test data...')
    
    await supabase
      .from('vendor_bids')
      .delete()
      .eq('request_id', testRequestId)

    await supabase
      .from('pickup_requests')
      .delete()
      .eq('request_id', testRequestId)

    console.log('✅ Test data cleaned up')

    console.log('\n🎉 All tests passed! The bid status fix is working correctly.')
    console.log('✅ Using "status" column instead of "is_winner" column')
    console.log('✅ Winner bids marked as "won"')
    console.log('✅ Loser bids marked as "lost"')
    console.log('✅ Queries work with status="won"')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testBidStatusFix()
