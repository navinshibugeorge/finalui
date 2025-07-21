const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://bkihtswnnrtpcrxftyqq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraWh0c3dubnJ0cGNyeGZ0eXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDg4NzEsImV4cCI6MjA2ODMyNDg3MX0.o7OuNoAaW3dPHdbOdkbwXSvGlvwI6s4FFGbMW4mPIBQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVendorDashboard() {
  console.log('=== Testing Vendor Dashboard Flow ===\n');

  try {
    // 1. Show available vendors for testing
    console.log('1. Available vendors for testing:');
    const { data: vendors } = await supabase.from('vendors').select('*');
    
    if (vendors) {
      vendors.forEach((vendor, index) => {
        console.log(`   ${index + 1}. ${vendor.name} (${vendor.email})`);
        console.log(`      ID: ${vendor.vendor_id}`);
        console.log(`      Waste Types: ${vendor.collecting_waste_types?.join(', ') || 'None'}`);
        console.log('');
      });
    }

    // 2. Show compatible pickup requests for first vendor with waste types
    const vendorWithWasteTypes = vendors?.find(v => v.collecting_waste_types && v.collecting_waste_types.length > 0);
    
    if (vendorWithWasteTypes) {
      console.log(`2. Testing compatibility for: ${vendorWithWasteTypes.name}`);
      console.log(`   Vendor waste types: ${vendorWithWasteTypes.collecting_waste_types.join(', ')}`);

      // Get all pending pickup requests  
      const { data: pickupRequests } = await supabase
        .from('pickup_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      console.log(`   Total pending requests: ${pickupRequests?.length || 0}`);

      // Filter compatible requests
      const wasteTypeMapping = {
        'plastic': 'Plastic',
        'organic': 'Organic',
        'metal': 'Metal',
        'electronic': 'E-Waste',
        'e-waste': 'E-Waste',
        'glass': 'Glass',
        'paper': 'Organic',
        'mixed': 'Plastic'
      };

      const compatibleRequests = pickupRequests?.filter(request => {
        const mappedWasteType = wasteTypeMapping[request.waste_type];
        return vendorWithWasteTypes.collecting_waste_types.includes(mappedWasteType);
      }) || [];

      console.log(`   Compatible requests for ${vendorWithWasteTypes.name}: ${compatibleRequests.length}`);
      
      if (compatibleRequests.length > 0) {
        console.log('\n   📋 Compatible requests:');
        compatibleRequests.forEach(req => {
          console.log(`      • ${req.waste_type} waste (${req.estimated_quantity}kg)`);
          console.log(`        Factory: ${req.factory_name}`);
          console.log(`        Date: ${req.preferred_date}`);
          console.log(`        ID: ${req.request_id.slice(0, 8)}...`);
          console.log('');
        });
      } else {
        console.log('   ❌ No compatible requests found');
      }
    }

    // 3. Show login info for testing
    console.log('\n3. Testing information:');
    console.log(`   🔗 Vendor Dashboard URL: http://localhost:3000/vendor-dashboard`);
    console.log(`   📧 Test vendor emails you can use:`);
    
    vendors?.slice(0, 3).forEach(vendor => {
      console.log(`      • ${vendor.email} (${vendor.name})`);
      console.log(`        Collects: ${vendor.collecting_waste_types?.join(', ') || 'None'}`);
    });

    console.log('\n   💡 To test the vendor dashboard:');
    console.log('      1. Open the vendor dashboard URL above');
    console.log('      2. The system should show notifications for compatible pickup requests');
    console.log('      3. Check the browser console for debug logs');

    // 4. Test the pickupRequestService approach
    console.log('\n4. Testing pickupRequestService.getActivePickupRequests()...');
    
    // Simulate what the service would do
    const activeRequests = pickupRequests?.filter(req => req.status === 'pending') || [];
    console.log(`   Active pickup requests: ${activeRequests.length}`);
    
    if (activeRequests.length > 0) {
      console.log('   Recent active requests:');
      activeRequests.slice(0, 3).forEach(req => {
        console.log(`      • ${req.waste_type} - ${req.factory_name} (${req.estimated_quantity}kg)`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testVendorDashboard();
