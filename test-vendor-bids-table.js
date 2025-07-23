const { createClientComponentClient } = require('@supabase/auth-helpers-nextjs')

async function testVendorBidsTable() {
  console.log('🧪 Testing Vendor Bids Table and Bidding System...\n')
  
  try {
    const supabase = createClientComponentClient()
    
    // 1. Check if vendor_bids table exists and is accessible
    console.log('1️⃣ Checking vendor_bids table access...')
    const { data: existingBids, error: selectError } = await supabase
      .from('vendor_bids')
      .select('*')
      .limit(5)
    
    if (selectError) {
      console.error('❌ Error accessing vendor_bids table:', selectError.message)
      console.error('🔍 Full error:', selectError)
      return
    }
    
    console.log('✅ vendor_bids table accessible')
    console.log(`📊 Current records in table: ${existingBids?.length || 0}`)
    
    if (existingBids && existingBids.length > 0) {
      console.log('📋 Existing bid structure:', Object.keys(existingBids[0]))
      console.log('🔍 Sample bid:', existingBids[0])
    } else {
      console.log('📭 No existing bids found - this is the problem!')
    }
    
    // 2. Test bid insertion
    console.log('\n2️⃣ Testing bid insertion...')
    const testBid = {
      request_id: 'test_request_' + Date.now(),
      vendor_id: 'test_vendor_001',
      vendor_name: 'Test Vendor',
      vendor_email: 'test@vendor.com',
      vendor_contact: '9876543210',
      bid_amount: 1000,
      status: 'active'
    }
    
    const { data: insertResult, error: insertError } = await supabase
      .from('vendor_bids')
      .insert([testBid])
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError.message)
      console.error('🔍 Insert error details:', insertError)
      
      // Check if it's a schema issue
      if (insertError.message.includes('column') || insertError.message.includes('does not exist')) {
        console.log('\n🚨 SCHEMA ISSUE DETECTED!')
        console.log('The vendor_bids table might be missing columns or have incorrect structure.')
      }
    } else {
      console.log('✅ Test bid inserted successfully!')
      console.log('📝 Inserted bid ID:', insertResult.id)
      
      // 3. Test bid retrieval
      console.log('\n3️⃣ Testing bid retrieval...')
      const { data: retrievedBid, error: retrieveError } = await supabase
        .from('vendor_bids')
        .select('*')
        .eq('id', insertResult.id)
        .single()
      
      if (retrieveError) {
        console.error('❌ Retrieval failed:', retrieveError.message)
      } else {
        console.log('✅ Bid retrieved successfully!')
        console.log('📝 Retrieved bid:', retrievedBid)
      }
      
      // 4. Clean up test bid
      console.log('\n4️⃣ Cleaning up test bid...')
      const { error: deleteError } = await supabase
        .from('vendor_bids')
        .delete()
        .eq('id', insertResult.id)
      
      if (deleteError) {
        console.error('❌ Cleanup failed:', deleteError.message)
      } else {
        console.log('✅ Test bid cleaned up successfully')
      }
    }
    
    // 5. Test the pickup request service directly
    console.log('\n5️⃣ Testing pickup request service bid placement...')
    try {
      const { pickupRequestService } = await import('./lib/pickup-request-service.js')
      
      // Get an active pickup request first
      const activeRequests = await pickupRequestService.getActivePickupRequests()
      console.log(`📋 Found ${activeRequests.length} active pickup requests`)
      
      if (activeRequests.length > 0) {
        const testRequest = activeRequests[0]
        console.log(`🎯 Testing bid on request: ${testRequest.request_id}`)
        
        try {
          const bidResult = await pickupRequestService.placeBid(
            testRequest.request_id,
            'test_vendor_002',
            1500,
            'Test bid from diagnostic script'
          )
          
          console.log('✅ Bid placed via service successfully!')
          console.log('📝 Service bid result:', bidResult)
          
          // Check if bid was actually stored
          const { data: serviceBid } = await supabase
            .from('vendor_bids')
            .select('*')
            .eq('bid_id', bidResult.bid_id)
            .single()
          
          if (serviceBid) {
            console.log('✅ Service bid found in database!')
            console.log('📝 Database record:', serviceBid)
            
            // Clean up service test bid
            await supabase
              .from('vendor_bids')
              .delete()
              .eq('bid_id', bidResult.bid_id)
            console.log('🗑️ Service test bid cleaned up')
          } else {
            console.log('❌ Service bid NOT found in database - this is the issue!')
          }
          
        } catch (serviceError) {
          console.error('❌ Service bid placement failed:', serviceError.message)
          console.error('🔍 Service error details:', serviceError)
        }
      } else {
        console.log('⚠️ No active pickup requests found to test bidding')
      }
      
    } catch (importError) {
      console.error('❌ Failed to import pickup request service:', importError.message)
    }
    
    console.log('\n🎯 DIAGNOSIS COMPLETE')
    console.log('====================')
    
  } catch (error) {
    console.error('💥 Unexpected error during testing:', error)
  }
}

testVendorBidsTable()
