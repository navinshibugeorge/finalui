const { createClientComponentClient } = require('@supabase/auth-helpers-nextjs')

// Set up environment variables for Supabase
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dshzoyoflrcziptvxvzu.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaHpveW9mbHJjemlwdHZ4dnp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5MzE4NzUsImV4cCI6MjA0NzUwNzg3NX0.dOsH1QHdvVP3CKL6z0V2L7SfZQJ2sJ6R2A-vUTi8nIA'

async function testBiddingSystem() {
  console.log('🧪 Testing Vendor Bidding System...\n')
  
  try {
    const supabase = createClientComponentClient()
    
    // 1. Check existing vendor_bids
    console.log('1️⃣ Checking current vendor_bids...')
    const { data: existingBids, error: selectError } = await supabase
      .from('vendor_bids')
      .select('*')
    
    if (selectError) {
      console.error('❌ Error:', selectError.message)
      return
    }
    
    console.log(`📊 Current vendor_bids count: ${existingBids?.length || 0}`)
    if (existingBids && existingBids.length > 0) {
      console.log('📋 Recent bids:')
      existingBids.slice(0, 3).forEach((bid, i) => {
        console.log(`  ${i + 1}. ${bid.vendor_name}: ₹${bid.bid_amount} (${bid.status})`)
      })
    }
    
    // 2. Get active pickup requests
    console.log('\n2️⃣ Getting active pickup requests...')
    const { data: requests, error: requestError } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('status', 'pending')
      .limit(3)
    
    if (requestError) {
      console.error('❌ Error getting requests:', requestError.message)
      return
    }
    
    console.log(`📋 Found ${requests?.length || 0} pending requests`)
    
    if (!requests || requests.length === 0) {
      console.log('⚠️ No pending requests found to test bidding')
      return
    }
    
    // 3. Get vendors
    console.log('\n3️⃣ Getting vendors...')
    const { data: vendors, error: vendorError } = await supabase
      .from('vendors')
      .select('*')
      .limit(3)
    
    if (vendorError) {
      console.error('❌ Error getting vendors:', vendorError.message)
      return
    }
    
    console.log(`👥 Found ${vendors?.length || 0} vendors`)
    
    if (!vendors || vendors.length === 0) {
      console.log('⚠️ No vendors found to test bidding')
      return
    }
    
    // 4. Test bid placement manually
    console.log('\n4️⃣ Testing manual bid placement...')
    const testRequest = requests[0]
    const testVendor = vendors[0]
    
    console.log(`🎯 Testing bid: Request ${testRequest.request_id} by Vendor ${testVendor.name}`)
    
    const testBid = {
      request_id: testRequest.request_id,
      vendor_id: testVendor.vendor_id,
      vendor_name: testVendor.name,
      vendor_email: testVendor.email,
      vendor_contact: testVendor.contact,
      bid_amount: 1500,
      status: 'active'
    }
    
    const { data: insertResult, error: insertError } = await supabase
      .from('vendor_bids')
      .insert([testBid])
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Manual bid insertion failed:', insertError.message)
      console.error('🔍 Error details:', insertError)
    } else {
      console.log('✅ Manual bid inserted successfully!')
      console.log(`📝 Bid ID: ${insertResult.id}`)
      
      // 5. Test the pickup request service
      console.log('\n5️⃣ Testing pickup request service...')
      try {
        // Import the service
        const service = await import('./lib/pickup-request-service.js')
        
        // Test placeBid function
        const serviceBid = await service.pickupRequestService.placeBid(
          testRequest.request_id,
          testVendor.vendor_id,
          2000,
          'Service test bid'
        )
        
        console.log('✅ Service bid placed successfully!')
        console.log('📝 Service result:', serviceBid)
        
        // 6. Verify both bids are in database
        console.log('\n6️⃣ Verifying bids in database...')
        const { data: finalBids, error: finalError } = await supabase
          .from('vendor_bids')
          .select('*')
          .eq('request_id', testRequest.request_id)
        
        if (finalError) {
          console.error('❌ Error checking final bids:', finalError.message)
        } else {
          console.log(`📊 Total bids for request: ${finalBids?.length || 0}`)
          finalBids?.forEach((bid, i) => {
            console.log(`  ${i + 1}. ${bid.vendor_name}: ₹${bid.bid_amount} (${bid.status})`)
          })
        }
        
        // 7. Clean up test bids
        console.log('\n7️⃣ Cleaning up test bids...')
        const { error: cleanupError } = await supabase
          .from('vendor_bids')
          .delete()
          .eq('request_id', testRequest.request_id)
        
        if (cleanupError) {
          console.error('❌ Cleanup failed:', cleanupError.message)
        } else {
          console.log('✅ Test bids cleaned up successfully')
        }
        
      } catch (serviceError) {
        console.error('❌ Service error:', serviceError.message)
      }
    }
    
    console.log('\n🎯 BIDDING SYSTEM TEST COMPLETE')
    console.log('================================')
    
  } catch (error) {
    console.error('💥 Unexpected error:', error)
  }
}

testBiddingSystem()
