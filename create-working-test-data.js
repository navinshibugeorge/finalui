const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://bkihtswnnrtpcrxftyqq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraWh0c3dubnJ0cGNyeGZ0eXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDg4NzEsImV4cCI6MjA2ODMyNDg3MX0.o7OuNoAaW3dPHdbOdkbwXSvGlvwI6s4FFGbMW4mPIBQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createWorkingTestData() {
  console.log('=== Creating Working Test Data ===\n');

  try {
    // 1. Use existing factory
    console.log('1. Using existing factory...');
    const { data: factories, error: factoriesError } = await supabase
      .from('factories')
      .select('*')
      .limit(1);
    
    if (factoriesError || !factories || factories.length === 0) {
      console.error('No factories found:', factoriesError);
      return;
    }

    const existingFactory = factories[0];
    console.log(`Using factory: ${existingFactory.factory_name} (ID: ${existingFactory.factory_id.slice(0, 8)}...)`);

    // 2. Create multiple pickup requests using the existing factory
    console.log('\n2. Creating pickup requests with existing factory...');
    
    const testRequests = [
      {
        user_type: 'industry',
        factory_id: existingFactory.factory_id,
        factory_name: existingFactory.factory_name,
        factory_contact: existingFactory.contact || '+1234567890',
        factory_address: existingFactory.address,
        waste_type: 'metal',
        estimated_quantity: 100.50,
        description: 'Metal scraps from manufacturing process',
        preferred_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending'
      },
      {
        user_type: 'industry',
        factory_id: existingFactory.factory_id,
        factory_name: existingFactory.factory_name,
        factory_contact: existingFactory.contact || '+1234567891',
        factory_address: existingFactory.address,
        waste_type: 'glass',
        estimated_quantity: 75.25,
        description: 'Glass waste from quality control',
        preferred_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending'
      },
      {
        user_type: 'industry',
        factory_id: existingFactory.factory_id,
        factory_name: existingFactory.factory_name,
        factory_contact: existingFactory.contact || '+1234567892',
        factory_address: existingFactory.address,
        waste_type: 'electronic',
        estimated_quantity: 25.75,
        description: 'Electronic waste from assembly line',
        preferred_date: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending'
      },
      {
        user_type: 'industry',
        factory_id: existingFactory.factory_id,
        factory_name: existingFactory.factory_name,
        factory_contact: existingFactory.contact || '+1234567893',
        factory_address: existingFactory.address,
        waste_type: 'plastic',
        estimated_quantity: 50.00,
        description: 'Plastic waste from packaging',
        preferred_date: new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending'
      }
    ];

    const createdRequests = [];
    for (const request of testRequests) {
      const { data, error: insertError } = await supabase
        .from('pickup_requests')
        .insert(request)
        .select();

      if (insertError) {
        console.error(`  ✗ Error creating pickup request for ${request.waste_type}:`, insertError);
      } else {
        console.log(`  ✓ Created pickup request for ${request.waste_type} waste`);
        if (data && data.length > 0) {
          createdRequests.push(data[0]);
        }
      }
    }

    // 3. Test vendor compatibility in detail
    console.log('\n3. Detailed vendor compatibility analysis...');
    const { data: vendors } = await supabase.from('vendors').select('*');
    const { data: pendingRequests } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

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

      console.log(`\nAnalyzing ${pendingRequests.length} recent pending requests:`);
      console.log(`Checking against ${vendors.length} vendors:`);
      
      // Show all vendors and their waste types
      console.log('\nVendor capabilities:');
      vendors.forEach(vendor => {
        console.log(`  ${vendor.name}: ${vendor.collecting_waste_types?.join(', ') || 'None'}`);
      });

      console.log('\nRequest compatibility:');
      for (const request of pendingRequests.slice(0, 4)) { // Check first 4 requests
        console.log(`\n  📦 Request: ${request.waste_type} waste (${request.estimated_quantity}kg)`);
        console.log(`     Created: ${request.created_at.split('T')[0]}`);
        console.log(`     Factory: ${request.factory_name}`);
        
        const mappedType = wasteTypeMapping[request.waste_type];
        console.log(`     Maps to vendor type: ${mappedType}`);
        
        const compatibleVendors = vendors.filter(vendor => {
          return vendor.collecting_waste_types && 
                 vendor.collecting_waste_types.includes(mappedType);
        });

        if (compatibleVendors.length > 0) {
          console.log(`     ✅ Compatible vendors (${compatibleVendors.length}):`);
          compatibleVendors.forEach(vendor => {
            console.log(`        • ${vendor.name} (${vendor.email})`);
            console.log(`          Types: ${vendor.collecting_waste_types.join(', ')}`);
          });
        } else {
          console.log(`     ❌ No compatible vendors found`);
          console.log(`        Looking for vendors that collect: ${mappedType}`);
        }
      }
    }

    // 4. Create a simple notification simulation (without notifications table)
    console.log('\n4. Simulating notification system...');
    if (createdRequests.length > 0 && vendors) {
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

      console.log('\nSimulated notifications that would be sent:');
      for (const request of createdRequests) {
        const mappedType = wasteTypeMapping[request.waste_type];
        const compatibleVendors = vendors.filter(vendor => {
          return vendor.collecting_waste_types && 
                 vendor.collecting_waste_types.includes(mappedType);
        });

        console.log(`\n  Request ${request.request_id.slice(0, 8)}... (${request.waste_type})`);
        if (compatibleVendors.length > 0) {
          console.log(`    Would notify ${compatibleVendors.length} vendors:`);
          compatibleVendors.forEach(vendor => {
            console.log(`      📧 ${vendor.name} (${vendor.email})`);
            console.log(`         Message: "New ${request.waste_type} pickup request available"`);
          });
        } else {
          console.log(`    ❌ No vendors to notify (no one collects ${mappedType})`);
        }
      }
    }

    // 5. Summary
    console.log('\n=== Test Data Summary ===');
    const { data: finalVendors } = await supabase.from('vendors').select('*');
    const { data: finalRequests } = await supabase.from('pickup_requests').select('*').eq('status', 'pending');
    const { data: finalFactories } = await supabase.from('factories').select('*');
    
    console.log(`✅ Total vendors: ${finalVendors?.length || 0}`);
    console.log(`✅ Total factories: ${finalFactories?.length || 0}`);
    console.log(`✅ Pending pickup requests: ${finalRequests?.length || 0}`);
    
    const vendorsWithWasteTypes = finalVendors?.filter(v => v.collecting_waste_types && v.collecting_waste_types.length > 0) || [];
    console.log(`✅ Vendors with waste types: ${vendorsWithWasteTypes.length}`);
    
    // Show recent requests for vendor dashboard testing
    if (finalRequests && finalRequests.length > 0) {
      console.log('\n📋 Recent requests for vendor dashboard testing:');
      finalRequests.slice(-3).forEach(request => {
        console.log(`   • ${request.waste_type} (${request.estimated_quantity}kg) - Status: ${request.status}`);
        console.log(`     ID: ${request.request_id.slice(0, 8)}... Created: ${request.created_at.split('T')[0]}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

createWorkingTestData();
