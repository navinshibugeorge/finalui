const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://bkihtswnnrtpcrxftyqq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraWh0c3dubnJ0cGNyeGZ0eXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDg4NzEsImV4cCI6MjA2ODMyNDg3MX0.o7OuNoAaW3dPHdbOdkbwXSvGlvwI6s4FFGbMW4mPIBQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPickupRequests() {
  console.log('=== Fixing Pickup Requests ===\n');

  try {
    // 1. Check existing factories
    console.log('1. Checking existing factories...');
    const { data: factories, error: factoriesError } = await supabase
      .from('factories')
      .select('*');
    
    if (factoriesError) {
      console.error('Error fetching factories:', factoriesError);
    } else {
      console.log(`Found ${factories?.length || 0} factories:`);
      if (factories && factories.length > 0) {
        factories.forEach(factory => {
          console.log(`  - ${factory.factory_name} (ID: ${factory.factory_id.slice(0, 8)}...)`);
        });
      }
    }

    // 2. Create some test factories first
    console.log('\n2. Creating test factories...');
    
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    const testFactories = [
      {
        factory_id: generateUUID(),
        factory_name: 'Steel Works Ltd',
        contact: '+1234567890',
        address: '123 Industrial St, City',
        email: 'steel@works.com',
        factory_type: 'Steel Manufacturing',
        waste_types_produced: ['metal', 'plastic']
      },
      {
        factory_id: generateUUID(),
        factory_name: 'Glass Manufacturing Co',
        contact: '+1234567891',
        address: '456 Glass Ave, City',
        email: 'glass@mfg.com',
        factory_type: 'Glass Production',
        waste_types_produced: ['glass', 'metal']
      },
      {
        factory_id: generateUUID(),
        factory_name: 'Tech Electronics',
        contact: '+1234567892',
        address: '789 Tech Park, City',
        email: 'tech@electronics.com',
        factory_type: 'Electronics Manufacturing',
        waste_types_produced: ['electronic', 'e-waste', 'plastic']
      }
    ];

    const createdFactories = [];
    for (const factory of testFactories) {
      const { data, error: insertError } = await supabase
        .from('factories')
        .insert(factory)
        .select();

      if (insertError) {
        console.error(`  ✗ Error creating factory ${factory.factory_name}:`, insertError);
      } else {
        console.log(`  ✓ Created factory: ${factory.factory_name}`);
        createdFactories.push(factory);
      }
    }

    // 3. Now create pickup requests using the factory IDs
    if (createdFactories.length > 0) {
      console.log('\n3. Creating pickup requests...');
      
      const testRequests = [
        {
          user_type: 'industry',
          factory_id: createdFactories[0].factory_id,
          factory_name: createdFactories[0].factory_name,
          factory_contact: createdFactories[0].contact,
          factory_address: createdFactories[0].address,
          waste_type: 'metal',
          estimated_quantity: 100.50,
          description: 'Metal scraps from manufacturing',
          preferred_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'pending'
        },
        {
          user_type: 'industry',
          factory_id: createdFactories[1].factory_id,
          factory_name: createdFactories[1].factory_name,
          factory_contact: createdFactories[1].contact,
          factory_address: createdFactories[1].address,
          waste_type: 'glass',
          estimated_quantity: 75.25,
          description: 'Glass waste from production',
          preferred_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'pending'
        },
        {
          user_type: 'industry',
          factory_id: createdFactories[2].factory_id,
          factory_name: createdFactories[2].factory_name,
          factory_contact: createdFactories[2].contact,
          factory_address: createdFactories[2].address,
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
    }

    // 4. Test vendor compatibility
    console.log('\n4. Testing vendor compatibility...');
    const { data: vendors } = await supabase.from('vendors').select('*');
    const { data: pendingRequests } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('status', 'pending');

    if (vendors && pendingRequests) {
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

      console.log(`\nCompatibility check for ${pendingRequests.length} pending requests:`);
      
      for (const request of pendingRequests.slice(-3)) { // Check last 3 requests
        console.log(`\n  Request: ${request.waste_type} waste`);
        const mappedType = wasteTypeMapping[request.waste_type];
        
        const compatibleVendors = vendors.filter(vendor => {
          return vendor.collecting_waste_types && 
                 vendor.collecting_waste_types.includes(mappedType);
        });

        console.log(`    Mapped to: ${mappedType}`);
        console.log(`    Compatible vendors: ${compatibleVendors.length}`);
        compatibleVendors.forEach(vendor => {
          console.log(`      ✓ ${vendor.name} (${vendor.email}) - Types: ${vendor.collecting_waste_types.join(', ')}`);
        });
        
        if (compatibleVendors.length === 0) {
          console.log(`      ✗ No compatible vendors found for ${mappedType}`);
        }
      }
    }

    // 5. Summary
    console.log('\n=== Final Summary ===');
    const { data: finalVendors } = await supabase.from('vendors').select('*');
    const { data: finalRequests } = await supabase.from('pickup_requests').select('*').eq('status', 'pending');
    const { data: finalFactories } = await supabase.from('factories').select('*');
    
    console.log(`✓ Total vendors: ${finalVendors?.length || 0}`);
    console.log(`✓ Total factories: ${finalFactories?.length || 0}`);
    console.log(`✓ Pending pickup requests: ${finalRequests?.length || 0}`);
    
    const vendorsWithWasteTypes = finalVendors?.filter(v => v.collecting_waste_types && v.collecting_waste_types.length > 0) || [];
    console.log(`✓ Vendors with waste types: ${vendorsWithWasteTypes.length}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

fixPickupRequests();
