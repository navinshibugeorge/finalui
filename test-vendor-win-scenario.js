const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testVendorWinScenario() {
  console.log('🎯 VENDOR WIN SCENARIO TEST');
  console.log('===========================\n');

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get a vendor and a request to simulate winning
    console.log('📋 STEP 1: Getting test data');
    console.log('--------------------------------------------------');

    const { data: vendors } = await supabase
      .from('vendors')
      .select('*')
      .limit(1);

    const { data: requests } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('status', 'pending')
      .limit(1);

    if (!vendors || vendors.length === 0) {
      console.log('❌ No vendors found');
      return;
    }

    if (!requests || requests.length === 0) {
      console.log('❌ No pending requests found');
      return;
    }

    const vendor = vendors[0];
    const request = requests[0];

    console.log(`✅ Vendor: ${vendor.name} (${vendor.vendor_id})`);
    console.log(`✅ Request: ${request.waste_type} - ${request.estimated_quantity}L`);

    // Place a winning bid
    console.log('\n💰 STEP 2: Placing winning bid');
    console.log('--------------------------------------------------');

    const winningBidAmount = 10000; // High bid to ensure win

    const { data: bid, error: bidError } = await supabase
      .from('vendor_bids')
      .insert({
        request_id: request.request_id,
        vendor_id: vendor.vendor_id,
        vendor_name: vendor.name,
        vendor_email: vendor.email,
        vendor_contact: vendor.contact,
        bid_amount: winningBidAmount,
        status: 'active'
      })
      .select()
      .single();

    if (bidError) {
      console.error('❌ Error placing bid:', bidError);
      return;
    }

    console.log(`✅ Bid placed: ₹${winningBidAmount}`);

    // Simulate winner selection
    console.log('\n🏆 STEP 3: Simulating winner selection');
    console.log('--------------------------------------------------');

    // Update the request to assigned status
    const { error: requestUpdateError } = await supabase
      .from('pickup_requests')
      .update({
        status: 'assigned',
        assigned_vendor: vendor.vendor_id,
        total_amount: winningBidAmount
      })
      .eq('request_id', request.request_id);

    if (requestUpdateError) {
      console.error('❌ Error updating request:', requestUpdateError);
      return;
    }

    // Mark the bid as winner (update status to 'won')
    const { error: bidUpdateError } = await supabase
      .from('vendor_bids')
      .update({ status: 'won' })
      .eq('id', bid.id);

    if (bidUpdateError) {
      console.error('❌ Error marking winning bid:', bidUpdateError);
      return;
    }

    console.log('✅ Winner selection completed!');
    console.log(`   Assigned to: ${vendor.name}`);
    console.log(`   Company: ${vendor.company_name || 'N/A'}`);
    console.log(`   Winning amount: ₹${winningBidAmount}`);

    // Verify the assignment
    console.log('\n🔍 STEP 4: Verifying assignment');
    console.log('--------------------------------------------------');

    const { data: assignedRequest } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('request_id', request.request_id)
      .single();

    const { data: winningBid } = await supabase
      .from('vendor_bids')
      .select('*')
      .eq('id', bid.id)
      .single();

    console.log('📋 Request Status:');
    console.log(`   Status: ${assignedRequest.status}`);
    console.log(`   Assigned Vendor: ${assignedRequest.assigned_vendor}`);
    console.log(`   Total Amount: ₹${assignedRequest.total_amount}`);

    console.log('\n🏆 Winning Bid Status:');
    console.log(`   Status: ${winningBid.status}`);
    console.log(`   Vendor: ${winningBid.vendor_name}`);
    console.log(`   Amount: ₹${winningBid.bid_amount}`);

    console.log('\n🎉 SUCCESS! Vendor win scenario created!');
    console.log('=====================================');
    console.log('✅ The vendor dashboard should now show:');
    console.log('   • Winner announcement alert');
    console.log('   • Job in "My Jobs" tab');
    console.log('   • Updated stats');
    console.log('✅ The industry dashboard should show:');
    console.log('   • Assigned vendor in pickup requests');
    console.log('   • Vendor details in auction results');

    console.log('\n📍 Test Instructions:');
    console.log('1. Open vendor dashboard and check "My Jobs" tab');
    console.log('2. Open industry dashboard and check "Pickup Requests" tab');
    console.log('3. Check "Auction Results" tab in industry dashboard');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testVendorWinScenario();
