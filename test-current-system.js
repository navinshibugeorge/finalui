const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://bkihtswnnrtpcrxftyqq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraWh0c3dubnJ0cGNyeGZ0eXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDg4NzEsImV4cCI6MjA2ODMyNDg3MX0.o7OuNoAaW3dPHdbOdkbwXSvGlvwI6s4FFGbMW4mPIBQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVendorSystemWithCurrentData() {
  console.log('=== Testing Vendor System with Current Data ===\n');

  try {
    // 1. Get vendors with collecting_waste_types
    console.log('1. Checking vendors with waste types...');
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('*')
      .not('collecting_waste_types', 'is', null);
    
    if (vendorsError) {
      console.error('Error fetching vendors:', vendorsError);
      return;
    }

    console.log(`Found ${vendors.length} vendors with waste types:`);
    vendors.forEach(vendor => {
      console.log(`  - ${vendor.name} (${vendor.email}): ${vendor.collecting_waste_types || 'None'}`);
    });

    // 2. Update vendors without waste types
    console.log('\n2. Updating vendors without waste types...');
    const { data: emptyVendors } = await supabase
      .from('vendors')
      .select('*')
      .or('collecting_waste_types.is.null,collecting_waste_types.eq.{}');

    if (emptyVendors && emptyVendors.length > 0) {
      const wasteTypeOptions = [
        ['Plastic', 'Metal'],
        ['Glass', 'Paper'],
        ['E-Waste', 'Metal'],
        ['Organic', 'Plastic'],
        ['Metal', 'Glass'],
        ['Plastic', 'Glass', 'Metal']
      ];

      for (const vendor of emptyVendors) {
        const wasteTypes = wasteTypeOptions[Math.floor(Math.random() * wasteTypeOptions.length)];
        
        const { error: updateError } = await supabase
          .from('vendors')
          .update({ collecting_waste_types: wasteTypes })
          .eq('vendor_id', vendor.vendor_id);

        if (updateError) {
          console.error(`  ✗ Error updating vendor ${vendor.email}:`, updateError);
        } else {
          console.log(`  ✓ Updated vendor ${vendor.email} with waste types: ${wasteTypes.join(', ')}`);
        }
      }
    }

    // 3. Create some active pickup requests
    console.log('\n3. Creating active pickup requests...');
    
    // Generate proper UUIDs for factory_id
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
    const testRequests = [
      {
        user_type: 'industry',
        factory_id: generateUUID(),
        factory_name: 'Steel Works Ltd',
        factory_contact: '+1234567890',
        factory_address: '123 Industrial St, City',
        waste_type: 'metal',
        estimated_quantity: 100.50,
        description: 'Metal scraps from manufacturing',
        preferred_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending'
      },
      {
        user_type: 'industry',
        factory_id: generateUUID(),
        factory_name: 'Glass Manufacturing Co',
        factory_contact: '+1234567891',
        factory_address: '456 Glass Ave, City',
        waste_type: 'glass',
        estimated_quantity: 75.25,
        description: 'Glass waste from production',
        preferred_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending'
      },
      {
        user_type: 'industry',
        factory_id: generateUUID(),
        factory_name: 'Tech Electronics',
        factory_contact: '+1234567892',
        factory_address: '789 Tech Park, City',
        waste_type: 'electronic',
        estimated_quantity: 25.75,
        description: 'Electronic waste from assembly line',
        preferred_date: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending'
      }
    ];

    for (const request of testRequests) {
      const { error: insertError } = await supabase
        .from('pickup_requests')
        .insert(request);

      if (insertError) {
        console.error(`  ✗ Error creating pickup request:`, insertError);
      } else {
        console.log(`  ✓ Created pickup request for ${request.waste_type} waste`);
      }
    }

    // 4. Test vendor-waste compatibility
    console.log('\n4. Testing vendor-waste compatibility...');
    const { data: allVendors } = await supabase.from('vendors').select('*');
    const { data: pendingRequests } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('status', 'pending');

    console.log(`Found ${pendingRequests?.length || 0} pending requests`);
    console.log(`Found ${allVendors?.length || 0} vendors`);

    if (allVendors && pendingRequests) {
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

      for (const request of pendingRequests.slice(0, 5)) { // Check first 5 requests
        console.log(`\n  Request: ${request.waste_type} waste (ID: ${request.request_id.slice(0, 8)}...)`);
        const mappedType = wasteTypeMapping[request.waste_type];
        
        const compatibleVendors = allVendors.filter(vendor => {
          return vendor.collecting_waste_types && 
                 vendor.collecting_waste_types.includes(mappedType);
        });

        console.log(`    Compatible vendors: ${compatibleVendors.length}`);
        compatibleVendors.forEach(vendor => {
          console.log(`      - ${vendor.name} (${vendor.email})`);
        });
      }
    }

    // 5. Final summary
    console.log('\n=== Summary ===');
    const { data: finalVendors } = await supabase.from('vendors').select('*');
    const { data: finalRequests } = await supabase.from('pickup_requests').select('*').eq('status', 'pending');
    
    console.log(`✓ Total vendors: ${finalVendors?.length || 0}`);
    console.log(`✓ Pending pickup requests: ${finalRequests?.length || 0}`);
    
    const vendorsWithWasteTypes = finalVendors?.filter(v => v.collecting_waste_types && v.collecting_waste_types.length > 0) || [];
    console.log(`✓ Vendors with waste types: ${vendorsWithWasteTypes.length}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

testVendorSystemWithCurrentData();
