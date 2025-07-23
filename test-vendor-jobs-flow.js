const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://bkihtswnnrtpcrxftyqq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraWh0c3dubnJ0cGNyeGZ0eXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDg4NzEsImV4cCI6MjA2ODMyNDg3MX0.o7OuNoAaW3dPHdbOdkbwXSvGlvwI6s4FFGbMW4mPIBQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVendorJobsFlow() {
  try {
    console.log('=== Testing Vendor Jobs Flow ===\n');
    
    // 1. Test fetching assigned jobs for a vendor
    const testVendorId = '46e19b87-80ba-4476-be94-970ba3788e73'; // A vendor ID from our previous tests
    
    console.log(`1. Fetching assigned jobs for vendor: ${testVendorId}`);
    const { data: assignedJobs, error: assignedError } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('assigned_vendor', testVendorId)
      .eq('status', 'assigned')
      .order('created_at', { ascending: false });
    
    if (assignedError) {
      console.error('Error fetching assigned jobs:', assignedError);
    } else {
      console.log(`Found ${assignedJobs.length} assigned jobs:`);
      assignedJobs.forEach((job, index) => {
        console.log(`  ${index + 1}. ${job.factory_name} - ${job.waste_type} (₹${job.total_amount})`);
        console.log(`     Address: ${job.factory_address}`);
        console.log(`     Quantity: ${job.estimated_quantity}L`);
        console.log(`     Status: ${job.status}`);
        console.log('');
      });
    }
    
    // 2. Test fetching completed jobs
    console.log(`2. Fetching completed jobs for vendor: ${testVendorId}`);
    const { data: completedJobs, error: completedError } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('assigned_vendor', testVendorId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
    
    if (completedError) {
      console.error('Error fetching completed jobs:', completedError);
    } else {
      console.log(`Found ${completedJobs.length} completed jobs:`);
      completedJobs.forEach((job, index) => {
        console.log(`  ${index + 1}. ${job.factory_name} - ${job.waste_type} (₹${job.total_amount})`);
      });
    }
    
    // 3. Test bid winning check for a specific request
    console.log('\\n3. Testing bid winning check...');
    if (assignedJobs.length > 0) {
      const testRequestId = assignedJobs[0].request_id;
      console.log(`Checking if vendor won bid for request: ${testRequestId}`);
      
      // This simulates what the vendor dashboard does to check if vendor won
      const { data: wonJob, error: wonError } = await supabase
        .from('pickup_requests')
        .select('*')
        .eq('request_id', testRequestId)
        .eq('assigned_vendor', testVendorId)
        .eq('status', 'assigned')
        .single();
      
      if (!wonError && wonJob) {
        console.log('✅ Vendor won the bid!');
        console.log(`Winner details: ${wonJob.factory_name} - ${wonJob.waste_type} (₹${wonJob.total_amount})`);
      } else {
        console.log('❌ Vendor did not win or error occurred:', wonError);
      }
    }
    
    // 4. Test checking for lost bids
    console.log('\\n4. Testing lost bid check...');
    const { data: lostBids, error: lostBidError } = await supabase
      .from('vendor_bids')
      .select('*')
      .eq('vendor_id', testVendorId)
      .eq('status', 'lost')
      .limit(3);
    
    if (lostBidError) {
      console.error('Error fetching lost bids:', lostBidError);
    } else {
      console.log(`Found ${lostBids.length} lost bids:`);
      lostBids.forEach((bid, index) => {
        console.log(`  ${index + 1}. Request ${bid.request_id} - ₹${bid.bid_amount} (Status: ${bid.status})`);
      });
    }
    
    console.log('\\n=== Test completed successfully ===');
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testVendorJobsFlow();
