const { createClientComponentClient } = require('@supabase/auth-helpers-nextjs');

async function testWinnerSelection() {
  console.log('🏆 WINNER SELECTION TEST');
  console.log('=======================\n');

  const supabase = createClientComponentClient();

  try {
    // Step 1: Check existing assigned requests
    console.log('📋 STEP 1: Checking for assigned requests');
    console.log('--------------------------------------------------');

    const { data: assignedRequests, error: assignedError } = await supabase
      .from('pickup_requests')
      .select(`
        request_id,
        waste_type,
        status,
        assigned_vendor_name,
        assigned_vendor_company,
        assigned_vendor_contact,
        assigned_vendor_email,
        assigned_vendor_address,
        winning_bid_amount,
        vendor_bids (
          vendor_name,
          vendor_company,
          vendor_contact,
          vendor_email,
          vendor_address,
          bid_amount,
          status
        )
      `)
      .eq('status', 'assigned');

    if (assignedError) {
      throw assignedError;
    }

    console.log(`✅ Found ${assignedRequests.length} assigned requests`);

    if (assignedRequests.length > 0) {
      assignedRequests.forEach((request, index) => {
        console.log(`\n🎯 Request ${index + 1}: ${request.waste_type.toUpperCase()}`);
        console.log(`   Request ID: ${request.request_id}`);
        console.log(`   Winner: ${request.assigned_vendor_name || 'Not set'}`);
        console.log(`   Company: ${request.assigned_vendor_company || 'Not set'}`);
        console.log(`   Contact: ${request.assigned_vendor_contact || 'Not set'}`);
        console.log(`   Email: ${request.assigned_vendor_email || 'Not set'}`);
        console.log(`   Winning Bid: ₹${request.winning_bid_amount || 'Not set'}`);
        
        const winningBids = request.vendor_bids?.filter(bid => bid.status === 'won') || [];
        console.log(`   Winning Bids Marked: ${winningBids.length}`);
        
        if (winningBids.length > 0) {
          winningBids.forEach(bid => {
            console.log(`     - ${bid.vendor_name}: ₹${bid.bid_amount}`);
          });
        }
      });
    }

    // Step 2: Check pending requests that could have winners selected
    console.log('\n📋 STEP 2: Checking pending requests with bids');
    console.log('--------------------------------------------------');

    const { data: pendingRequests, error: pendingError } = await supabase
      .from('pickup_requests')
      .select(`
        request_id,
        waste_type,
        status,
        bidding_ends_at,
        vendor_bids (
          vendor_name,
          vendor_company,
          vendor_contact,
          bid_amount,
          status
        )
      `)
      .eq('status', 'pending')
      .not('vendor_bids', 'is', null);

    if (pendingError) {
      throw pendingError;
    }

    const expiredRequests = pendingRequests.filter(req => {
      const endTime = new Date(req.bidding_ends_at);
      const now = new Date();
      return req.vendor_bids && req.vendor_bids.length > 0 && endTime < now;
    });

    console.log(`✅ Found ${expiredRequests.length} expired requests with bids that need winner selection`);

    if (expiredRequests.length > 0) {
      for (const request of expiredRequests) {
        console.log(`\n⚡ Processing: ${request.waste_type} (${request.request_id.substring(0, 8)}...)`);
        
        const bids = request.vendor_bids || [];
        console.log(`   Total bids: ${bids.length}`);
        
        // Show all bids
        bids.forEach((bid, index) => {
          console.log(`   ${index + 1}. ${bid.vendor_name}: ₹${bid.bid_amount}`);
        });

        // Find highest bid
        const highestBidAmount = Math.max(...bids.map(bid => bid.bid_amount));
        const winningBid = bids.find(bid => bid.bid_amount === highestBidAmount);
        
        console.log(`   🏆 Highest bid: ₹${highestBidAmount} by ${winningBid.vendor_name}`);

        // Simulate winner selection
        console.log(`   📝 Selecting winner...`);

        // Update pickup request
        const { error: updateError } = await supabase
          .from('pickup_requests')
          .update({
            status: 'assigned',
            assigned_vendor_name: winningBid.vendor_name,
            assigned_vendor_company: winningBid.vendor_company,
            assigned_vendor_contact: winningBid.vendor_contact,
            winning_bid_amount: winningBid.bid_amount,
            assigned_at: new Date().toISOString()
          })
          .eq('request_id', request.request_id);

        if (updateError) {
          console.error(`   ❌ Error updating request: ${updateError.message}`);
          continue;
        }

        // Mark winning bid
        const { error: bidUpdateError } = await supabase
          .from('vendor_bids')
          .update({ status: 'won' })
          .eq('request_id', request.request_id)
          .eq('bid_amount', highestBidAmount);

        if (bidUpdateError) {
          console.error(`   ❌ Error marking winning bid: ${bidUpdateError.message}`);
        } else {
          console.log(`   ✅ Winner selected: ${winningBid.vendor_name} (₹${winningBid.bid_amount})`);
        }

        // Mark losing bids
        const { error: losingBidsError } = await supabase
          .from('vendor_bids')
          .update({ status: 'lost' })
          .eq('request_id', request.request_id)
          .neq('bid_amount', highestBidAmount);

        if (losingBidsError) {
          console.error(`   ❌ Error marking losing bids: ${losingBidsError.message}`);
        } else {
          console.log(`   ✅ Losing bids marked for request ${request.request_id}`);
        }
      }
    }

    // Step 3: Summary
    console.log('\n📊 SUMMARY');
    console.log('--------------------------------------------------');
    
    const { data: finalAssigned } = await supabase
      .from('pickup_requests')
      .select('request_id, waste_type, assigned_vendor_name, winning_bid_amount')
      .eq('status', 'assigned');

    console.log(`✅ Total assigned requests: ${finalAssigned?.length || 0}`);
    
    if (finalAssigned && finalAssigned.length > 0) {
      console.log('\n🏆 Current Winners:');
      finalAssigned.forEach((req, index) => {
        console.log(`   ${index + 1}. ${req.waste_type}: ${req.assigned_vendor_name} (₹${req.winning_bid_amount})`);
      });
    }

    console.log('\n🎉 WINNER SELECTION TEST COMPLETED!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWinnerSelection();
