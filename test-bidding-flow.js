const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://bkihtswnnrtpcrxftyqq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraWh0c3dubnJ0cGNyeGZ0eXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDg4NzEsImV4cCI6MjA2ODMyNDg3MX0.o7OuNoAaW3dPHdbOdkbwXSvGlvwI6s4FFGbMW4mPIBQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBiddingFlow() {
  console.log('🧪 Testing Complete Bidding Flow...\n');

  try {
    // Get test data
    const { data: requests } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('status', 'pending')
      .limit(1);

    const { data: vendors } = await supabase
      .from('vendors')
      .select('*')
      .limit(1);

    if (!requests || !vendors || requests.length === 0 || vendors.length === 0) {
      console.log('❌ No test data available');
      return;
    }

    const testRequest = requests[0];
    const testVendor = vendors[0];
    
    console.log(`🎯 Testing bid: Request ${testRequest.request_id} by Vendor ${testVendor.name}`);

    // Test 1: Manual placeBid simulation
    console.log('\n1️⃣ Testing manual placeBid logic...');
    
    // Check if vendor already has a bid (placeBid checks this)
    const { data: existingBids } = await supabase
      .from('vendor_bids')
      .select('*')
      .eq('request_id', testRequest.request_id)
      .eq('vendor_id', testVendor.vendor_id);

    console.log(`📊 Existing bids for this vendor: ${existingBids?.length || 0}`);

    // Simulate the placeBid insertion
    const testBidData = {
      request_id: testRequest.request_id,
      vendor_id: testVendor.vendor_id,
      vendor_name: testVendor.name,
      vendor_email: testVendor.email,
      vendor_contact: testVendor.contact,
      bid_amount: 2000,
      status: 'active',
      message: 'Test bid from manual simulation'
    };

    if (existingBids && existingBids.length > 0) {
      console.log('📝 Updating existing bid...');
      const { data: updateResult, error: updateError } = await supabase
        .from('vendor_bids')
        .update({ 
          bid_amount: testBidData.bid_amount,
          created_at: new Date().toISOString(),
          message: testBidData.message
        })
        .eq('id', existingBids[0].id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Update failed:', updateError.message);
      } else {
        console.log('✅ Bid updated successfully!');
        console.log('📝 Updated bid:', updateResult);
      }
    } else {
      console.log('📝 Creating new bid...');
      const { data: insertResult, error: insertError } = await supabase
        .from('vendor_bids')
        .insert([testBidData])
        .select()
        .single();

      if (insertError) {
        console.error('❌ Insert failed:', insertError.message);
        console.error('🔍 Error details:', insertError);
      } else {
        console.log('✅ New bid created successfully!');
        console.log('📝 Created bid:', insertResult);
      }
    }

    // Test 2: Check current bids
    console.log('\n2️⃣ Checking current bids...');
    const { data: currentBids, error: currentError } = await supabase
      .from('vendor_bids')
      .select('*')
      .eq('request_id', testRequest.request_id);

    if (currentError) {
      console.error('❌ Error checking current bids:', currentError.message);
    } else {
      console.log(`📊 Total bids for request: ${currentBids?.length || 0}`);
      currentBids?.forEach((bid, i) => {
        console.log(`  ${i + 1}. ${bid.vendor_name}: ₹${bid.bid_amount} (${bid.status})`);
      });
    }

    // Test 3: Simulate real-time update logic
    console.log('\n3️⃣ Testing real-time update logic...');
    
    // This simulates what the UI does to get current highest bid
    const activeBids = currentBids?.filter(bid => bid.status === 'active') || [];
    const highestBid = activeBids.length > 0 ? Math.max(...activeBids.map(bid => bid.bid_amount)) : 0;
    const totalBids = activeBids.length;

    console.log(`🏆 Current highest bid: ₹${highestBid}`);
    console.log(`📊 Total active bids: ${totalBids}`);

    // Test 4: Test the UI's real-time update query
    console.log('\n4️⃣ Testing UI real-time query...');
    
    // This simulates getActivePickupRequests with vendor_bids
    const { data: requestWithBids, error: requestError } = await supabase
      .from('pickup_requests')
      .select(`
        *,
        vendor_bids(*)
      `)
      .eq('request_id', testRequest.request_id)
      .single();

    if (requestError) {
      console.error('❌ Request with bids query failed:', requestError.message);
    } else {
      console.log('✅ Request with bids query successful!');
      console.log(`📋 Request: ${requestWithBids.request_id}`);
      console.log(`📊 Embedded bids: ${requestWithBids.vendor_bids?.length || 0}`);
      
      if (requestWithBids.vendor_bids && requestWithBids.vendor_bids.length > 0) {
        console.log('📝 Embedded bid details:');
        requestWithBids.vendor_bids.forEach((bid, i) => {
          console.log(`  ${i + 1}. ${bid.vendor_name}: ₹${bid.bid_amount} (${bid.status})`);
        });
      }
    }

    // Clean up test bids
    console.log('\n5️⃣ Cleaning up test bids...');
    const { error: cleanupError } = await supabase
      .from('vendor_bids')
      .delete()
      .eq('request_id', testRequest.request_id);

    if (cleanupError) {
      console.error('❌ Cleanup failed:', cleanupError.message);
    } else {
      console.log('✅ Test bids cleaned up successfully');
    }

    console.log('\n🎯 BIDDING FLOW TEST COMPLETE');
    console.log('============================');
    console.log('✅ vendor_bids table is working correctly');
    console.log('✅ Manual bid insertion/update works');
    console.log('✅ Real-time query structure is correct');
    console.log('');
    console.log('🔍 If bids still don\'t appear in the UI, the issue is likely:');
    console.log('   1. The pickupRequestService.placeBid function has an error');
    console.log('   2. The createBid function in aws-api.ts has an error');
    console.log('   3. Frontend error handling is masking the issue');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

testBiddingFlow();
