const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://bkihtswnnrtpcrxftyqq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraWh0c3dubnJ0cGNyeGZ0eXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDg4NzEsImV4cCI6MjA2ODMyNDg3MX0.o7OuNoAaW3dPHdbOdkbwXSvGlvwI6s4FFGbMW4mPIBQ';

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to select bid winner
async function selectBidWinner(requestId) {
  try {
    console.log(`\n=== Testing Bid Winner Selection for Request: ${requestId} ===`);
    
    // Get all bids for this request
    const { data: bids, error: bidsError } = await supabase
      .from('vendor_bids')
      .select('*')
      .eq('request_id', requestId);
    
    if (bidsError) {
      console.error('Error fetching bids:', bidsError);
      return false;
    }
    
    if (bids.length === 0) {
      console.log(`No bids found for request ${requestId}`);
      return false;
    }
    
    console.log(`Found ${bids.length} bids:`);
    bids.forEach((bid, index) => {
      console.log(`  ${index + 1}. Vendor ${bid.vendor_id}: ₹${bid.bid_amount}`);
    });
    
    // Find the highest bid
    const winningBid = bids.reduce((highest, current) => 
      current.bid_amount > highest.bid_amount ? current : highest
    );
    
    console.log(`\nWinning bid: ₹${winningBid.bid_amount} from vendor ${winningBid.vendor_id}`);
    
    // Get vendor details for the winner using correct column names
    const { data: vendorData, error: vendorError } = await supabase
      .from('vendors')
      .select('name, contact, address, email')
      .eq('vendor_id', winningBid.vendor_id)
      .single();
    
    if (vendorError) {
      console.error('Error fetching vendor details:', vendorError);
    } else {
      console.log('Winner vendor details:', vendorData);
    }
    
    // Update the pickup request with winner using correct column names
    const updateData = {
      status: 'assigned',
      assigned_vendor: winningBid.vendor_id,
      total_amount: winningBid.bid_amount
    };
    
    console.log('Updating request with:', updateData);
    
    const { error: updateError } = await supabase
      .from('pickup_requests')
      .update(updateData)
      .eq('request_id', requestId);
    
    if (updateError) {
      console.error('Error updating pickup request:', updateError);
      return false;
    }
    
    console.log('✅ Successfully assigned winning bid!');
    
    // Verify the update
    const { data: updatedRequest, error: verifyError } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('request_id', requestId)
      .single();
    
    if (verifyError) {
      console.error('Error verifying update:', verifyError);
    } else {
      console.log('Updated request status:', updatedRequest.status);
      console.log('Assigned vendor:', updatedRequest.assigned_vendor);
      console.log('Total amount:', updatedRequest.total_amount);
    }
    
    return true;
    
  } catch (error) {
    console.error('Error in selectBidWinner:', error);
    return false;
  }
}

async function main() {
  try {
    // Find a request with bids to test
    const { data: requestsWithBids, error } = await supabase
      .from('vendor_bids')
      .select('request_id')
      .limit(1);
    
    if (error) {
      console.error('Error finding requests with bids:', error);
      return;
    }
    
    if (requestsWithBids.length === 0) {
      console.log('No requests with bids found to test');
      return;
    }
    
    const testRequestId = requestsWithBids[0].request_id;
    await selectBidWinner(testRequestId);
    
  } catch (error) {
    console.error('Error in main:', error);
  }
}

main();
