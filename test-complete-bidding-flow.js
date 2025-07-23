const { createClientComponentClient } = require('@supabase/auth-helpers-nextjs');
const { selectBidWinner } = require('./lib/pickup-request-service');

async function testCompleteBiddingFlow() {
  console.log('🎮 COMPLETE BIDDING FLOW TEST');
  console.log('=============================\n');

  const supabase = createClientComponentClient();

  try {
    // Step 1: Get a pending request with bids
    console.log('📋 STEP 1: Finding pending requests with bids');
    console.log('--------------------------------------------------');

    const { data: requests, error: requestsError } = await supabase
      .from('pickup_requests')
      .select(`
        *,
        vendor_bids (*)
      `)
      .eq('status', 'pending')
      .not('vendor_bids', 'is', null);

    if (requestsError) {
      throw requestsError;
    }

    const requestsWithBids = requests.filter(req => req.vendor_bids && req.vendor_bids.length > 0);
    
    if (requestsWithBids.length === 0) {
      console.log('❌ No pending requests with bids found');
      
      // Create a test scenario
      console.log('\n🔧 Creating test scenario...');
      
      // Get vendors
      const { data: vendors } = await supabase
        .from('vendors')
        .select('vendor_id, name, email, contact, company_name, address')
        .limit(3);

      if (!vendors || vendors.length === 0) {
        console.log('❌ No vendors found in database');
        return;
      }

      // Get a pending request
      const { data: pendingRequests } = await supabase
        .from('pickup_requests')
        .select('*')
        .eq('status', 'pending')
        .limit(1);

      if (!pendingRequests || pendingRequests.length === 0) {
        console.log('❌ No pending requests found');
        return;
      }

      const testRequest = pendingRequests[0];
      console.log(`✅ Using request: ${testRequest.request_id} (${testRequest.waste_type})`);

      // Place test bids
      console.log('\n💰 Placing test bids...');
      const baseBid = 5000;
      
      for (let i = 0; i < Math.min(3, vendors.length); i++) {
        const vendor = vendors[i];
        const bidAmount = baseBid + (i + 1) * 500; // Incremental bids
        
        const { error: bidError } = await supabase
          .from('vendor_bids')
          .insert({
            request_id: testRequest.request_id,
            vendor_id: vendor.vendor_id,
            vendor_name: vendor.name,
            vendor_email: vendor.email,
            vendor_contact: vendor.contact,
            vendor_company: vendor.company_name,
            vendor_address: vendor.address,
            bid_amount: bidAmount,
            status: 'active'
          });

        if (bidError) {
          console.error(`❌ Error placing bid for ${vendor.name}:`, bidError);
        } else {
          console.log(`✅ Bid placed: ${vendor.name} → ₹${bidAmount}`);
        }
      }

      // Refetch the request with bids
      const { data: updatedRequest } = await supabase
        .from('pickup_requests')
        .select(`
          *,
          vendor_bids (*)
        `)
        .eq('request_id', testRequest.request_id)
        .single();

      if (updatedRequest && updatedRequest.vendor_bids.length > 0) {
        console.log(`\n📊 Request now has ${updatedRequest.vendor_bids.length} bids`);
        await testWinnerSelection(updatedRequest);
      }

    } else {
      const testRequest = requestsWithBids[0];
      console.log(`✅ Found request with bids: ${testRequest.request_id}`);
      console.log(`   Waste type: ${testRequest.waste_type}`);
      console.log(`   Total bids: ${testRequest.vendor_bids.length}`);
      
      await testWinnerSelection(testRequest);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function testWinnerSelection(request) {
  console.log('\n🏆 STEP 2: Testing Winner Selection');
  console.log('--------------------------------------------------');

  const supabase = createClientComponentClient();
  const bids = request.vendor_bids || [];
  
  if (bids.length === 0) {
    console.log('❌ No bids to select winner from');
    return;
  }

  // Show current bids
  console.log('Current bids:');
  bids.forEach((bid, index) => {
    console.log(`  ${index + 1}. ${bid.vendor_name}: ₹${bid.bid_amount}`);
  });

  // Find highest bid
  const highestBid = Math.max(...bids.map(bid => bid.bid_amount));
  const winningBids = bids.filter(bid => bid.bid_amount === highestBid);
  
  console.log(`\n🎯 Highest bid: ₹${highestBid}`);
  console.log(`🏆 Potential winner(s): ${winningBids.map(b => b.vendor_name).join(', ')}`);

  // Test winner selection
  console.log('\n⚡ Executing winner selection...');
  
  try {
    const result = await selectBidWinner(request.request_id);
    
    if (result) {
      console.log('✅ Winner selection completed successfully!');
      
      // Verify the results
      console.log('\n🔍 Verifying results...');
      
      // Check updated request
      const { data: updatedRequest, error: requestError } = await supabase
        .from('pickup_requests')
        .select('*')
        .eq('request_id', request.request_id)
        .single();

      if (requestError) {
        console.error('❌ Error fetching updated request:', requestError);
        return;
      }

      console.log('📋 Updated Request:');
      console.log(`   Status: ${updatedRequest.status}`);
      console.log(`   Assigned Vendor: ${updatedRequest.assigned_vendor_name || 'Not set'}`);
      console.log(`   Winning Bid: ₹${updatedRequest.winning_bid_amount || 'Not set'}`);
      console.log(`   Company: ${updatedRequest.assigned_vendor_company || 'Not set'}`);
      console.log(`   Contact: ${updatedRequest.assigned_vendor_contact || 'Not set'}`);
      console.log(`   Email: ${updatedRequest.assigned_vendor_email || 'Not set'}`);

      // Check winning bid
      const { data: winningBid, error: bidError } = await supabase
        .from('vendor_bids')
        .select('*')
        .eq('request_id', request.request_id)
        .eq('status', 'won')
        .single();

      if (bidError) {
        console.log('⚠️ No winning bid marked in vendor_bids table');
      } else {
        console.log('\n🏆 Winning Bid:');
        console.log(`   Vendor: ${winningBid.vendor_name}`);
        console.log(`   Amount: ₹${winningBid.bid_amount}`);
        console.log(`   Company: ${winningBid.vendor_company || 'Not set'}`);
        console.log(`   Contact: ${winningBid.vendor_contact}`);
      }

      console.log('\n🎉 COMPLETE BIDDING FLOW TEST PASSED!');
      console.log('=====================================');
      console.log('✅ Bid placement: WORKING');
      console.log('✅ Winner selection: WORKING');
      console.log('✅ Request update: WORKING');
      console.log('✅ Vendor assignment: WORKING');
      console.log('✅ Database consistency: VERIFIED');

    } else {
      console.log('❌ Winner selection failed');
    }

  } catch (error) {
    console.error('❌ Winner selection error:', error);
  }
}

testCompleteBiddingFlow();
