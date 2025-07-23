const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://bkihtswnnrtpcrxftyqq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraWh0c3dubnJ0cGNyeGZ0eXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDg4NzEsImV4cCI6MjA2ODMyNDg3MX0.o7OuNoAaW3dPHdbOdkbwXSvGlvwI6s4FFGbMW4mPIBQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVendorBidsTable() {
  console.log('🧪 Testing Vendor Bids Table and Bidding System...\n');

  try {
    // 1. Check current vendor_bids table
    console.log('1️⃣ Checking vendor_bids table...');
    const { data: existingBids, error: selectError } = await supabase
      .from('vendor_bids')
      .select('*');
    
    if (selectError) {
      console.error('❌ Error accessing vendor_bids table:', selectError.message);
      console.error('🔍 Error details:', selectError);
      
      // Check if table exists by checking error type
      if (selectError.message.includes('relation') && selectError.message.includes('does not exist')) {
        console.log('🚨 CRITICAL: vendor_bids table does not exist!');
        console.log('💡 Solution: Run database schema creation script');
        return;
      }
    } else {
      console.log('✅ vendor_bids table accessible');
      console.log(`📊 Current records: ${existingBids?.length || 0}`);
      
      if (existingBids && existingBids.length > 0) {
        console.log('📋 Existing bids:');
        existingBids.forEach((bid, i) => {
          console.log(`  ${i + 1}. ${bid.vendor_name}: ₹${bid.bid_amount} for ${bid.request_id} (${bid.status})`);
        });
      } else {
        console.log('📭 No bids found in vendor_bids table!');
        console.log('🔍 This confirms that bids are not being stored.');
      }
    }

    // 2. Get a real pickup request and vendor for testing
    console.log('\n2️⃣ Getting real data for testing...');
    
    const { data: requests, error: requestsError } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('status', 'pending')
      .limit(1);

    if (requestsError) {
      console.error('❌ Error getting pickup requests:', requestsError.message);
      return;
    }

    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('*')
      .limit(1);

    if (vendorsError) {
      console.error('❌ Error getting vendors:', vendorsError.message);
      return;
    }

    if (!requests || requests.length === 0) {
      console.log('⚠️ No pending pickup requests found');
      return;
    }

    if (!vendors || vendors.length === 0) {
      console.log('⚠️ No vendors found');
      return;
    }

    const testRequest = requests[0];
    const testVendor = vendors[0];

    console.log(`📋 Test request: ${testRequest.request_id} (${testRequest.waste_type})`);
    console.log(`👤 Test vendor: ${testVendor.name} (${testVendor.vendor_id})`);

    // 3. Test direct bid insertion
    console.log('\n3️⃣ Testing direct bid insertion...');
    
    const testBid = {
      request_id: testRequest.request_id,
      vendor_id: testVendor.vendor_id,
      vendor_name: testVendor.name,
      vendor_email: testVendor.email,
      vendor_contact: testVendor.contact,
      bid_amount: 1234,
      status: 'active'
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('vendor_bids')
      .insert([testBid])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Direct insertion failed:', insertError.message);
      console.error('🔍 Insert error:', insertError);
      
      // Analyze the error
      if (insertError.message.includes('violates check constraint')) {
        console.log('🚨 Check constraint violation - invalid status value or constraint issue');
      } else if (insertError.message.includes('violates foreign key constraint')) {
        console.log('🚨 Foreign key constraint violation - referenced record might not exist');
      } else if (insertError.message.includes('column') && insertError.message.includes('does not exist')) {
        console.log('🚨 Column does not exist - schema mismatch');
      }
    } else {
      console.log('✅ Direct bid insertion successful!');
      console.log(`📝 Inserted bid ID: ${insertResult.id}`);
      
      // 4. Verify the bid was stored
      console.log('\n4️⃣ Verifying bid storage...');
      const { data: verifyBid, error: verifyError } = await supabase
        .from('vendor_bids')
        .select('*')
        .eq('id', insertResult.id)
        .single();

      if (verifyError) {
        console.error('❌ Verification failed:', verifyError.message);
      } else {
        console.log('✅ Bid verified in database!');
        console.log('📝 Stored bid:', verifyBid);
      }

      // 5. Test update operation
      console.log('\n5️⃣ Testing bid update...');
      const { data: updateResult, error: updateError } = await supabase
        .from('vendor_bids')
        .update({ bid_amount: 1500 })
        .eq('id', insertResult.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Update failed:', updateError.message);
      } else {
        console.log('✅ Bid updated successfully!');
        console.log(`📝 New amount: ₹${updateResult.bid_amount}`);
      }

      // 6. Clean up test bid
      console.log('\n6️⃣ Cleaning up test bid...');
      const { error: deleteError } = await supabase
        .from('vendor_bids')
        .delete()
        .eq('id', insertResult.id);

      if (deleteError) {
        console.error('❌ Cleanup failed:', deleteError.message);
      } else {
        console.log('✅ Test bid cleaned up');
      }
    }

    // 7. Test the createBid function from aws-api
    console.log('\n7️⃣ Testing createBid function...');
    try {
      // Dynamic import to test the actual function used by the UI
      const { createBid } = await import('./lib/aws-api.js');
      
      const bidData = {
        request_id: testRequest.request_id,
        vendor_id: testVendor.vendor_id,
        bid_amount: 1750,
        message: 'Test bid from createBid function'
      };

      const createBidResult = await createBid(bidData);
      
      if (createBidResult.error) {
        console.error('❌ createBid failed:', createBidResult.error);
      } else {
        console.log('✅ createBid function successful!');
        console.log('📝 Result:', createBidResult.data);
        
        // Check if this bid was stored
        const { data: createBidCheck, error: createBidCheckError } = await supabase
          .from('vendor_bids')
          .select('*')
          .eq('bid_id', createBidResult.data.bid_id)
          .single();

        if (createBidCheckError) {
          console.log('❌ createBid result not found in database:', createBidCheckError.message);
          console.log('🔍 This might be the source of the issue!');
        } else {
          console.log('✅ createBid result found in database!');
          console.log('📝 Database record:', createBidCheck);
          
          // Clean up createBid test
          await supabase
            .from('vendor_bids')
            .delete()
            .eq('bid_id', createBidResult.data.bid_id);
          console.log('🗑️ createBid test cleaned up');
        }
      }
      
    } catch (importError) {
      console.error('❌ Failed to test createBid:', importError.message);
    }

    console.log('\n🎯 VENDOR BIDS DIAGNOSIS COMPLETE');
    console.log('===================================');
    
  } catch (error) {
    console.error('💥 Unexpected error during testing:', error);
  }
}

testVendorBidsTable();
