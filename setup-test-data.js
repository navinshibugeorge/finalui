const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://bkihtswnnrtpcrxftyqq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraWh0c3dubnJ0cGNyeGZ0eXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDg4NzEsImV4cCI6MjA2ODMyNDg3MX0.o7OuNoAaW3dPHdbOdkbwXSvGlvwI6s4FFGbMW4mPIBQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTestData() {
  console.log('=== Setting up Test Data ===\n');

  try {
    // 1. First, let's create the missing tables (notifications and industries)
    console.log('1. Creating missing tables...');
    
    // Create notifications table
    const createNotificationsTable = `
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('pickup_request', 'bid_update', 'payment', 'system')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const createIndustriesTable = `
      CREATE TABLE IF NOT EXISTS industries (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        contact TEXT NOT NULL,
        address TEXT NOT NULL,
        factory_type TEXT,
        waste_types_produced TEXT[],
        monthly_waste_volume DECIMAL(10,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Execute table creation using RPC
    try {
      await supabase.rpc('exec_sql', { sql: createNotificationsTable });
      console.log('  ✓ Notifications table created/verified');
    } catch (error) {
      console.log('  - Notifications table might already exist or error:', error.message);
    }

    try {
      await supabase.rpc('exec_sql', { sql: createIndustriesTable });
      console.log('  ✓ Industries table created/verified');
    } catch (error) {
      console.log('  - Industries table might already exist or error:', error.message);
    }

    // 2. Get all vendors and add proper IDs and waste types
    console.log('\n2. Updating vendor data...');
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('*');
    
    if (vendorsError) {
      console.error('Error fetching vendors:', vendorsError);
      return;
    }

    console.log(`Found ${vendors.length} vendors to update`);

    // Update vendors with proper IDs and waste types
    for (const vendor of vendors) {
      if (!vendor.id) {
        // Generate a proper UUID for vendor
        const vendorId = crypto.randomUUID();
        
        // Update the vendor with ID and waste types if empty
        const updateData = {
          id: vendorId,
        };

        // If waste types are empty, assign some
        if (!vendor.collecting_waste_types || vendor.collecting_waste_types.length === 0) {
          const wasteTypeOptions = [
            ['Plastic', 'Metal'],
            ['Glass', 'Paper'],
            ['E-Waste', 'Metal'],
            ['Organic', 'Plastic'],
            ['Metal', 'Glass'],
            ['Plastic', 'Glass', 'Metal']
          ];
          updateData.collecting_waste_types = wasteTypeOptions[Math.floor(Math.random() * wasteTypeOptions.length)];
        }

        const { error: updateError } = await supabase
          .from('vendors')
          .update(updateData)
          .eq('email', vendor.email);

        if (updateError) {
          console.error(`  ✗ Error updating vendor ${vendor.email}:`, updateError);
        } else {
          console.log(`  ✓ Updated vendor ${vendor.email} with ID and waste types`);
        }
      }
    }

    // 3. Create some test industries
    console.log('\n3. Creating test industries...');
    const testIndustries = [
      {
        email: 'steel@company.com',
        name: 'Steel Manufacturing Co.',
        contact: '+1234567890',
        address: '123 Industrial Ave, City',
        factory_type: 'Steel Manufacturing',
        waste_types_produced: ['metal', 'plastic'],
        monthly_waste_volume: 500.00
      },
      {
        email: 'electronics@tech.com',
        name: 'Tech Electronics Ltd.',
        contact: '+1234567891',
        address: '456 Tech Park, City',
        factory_type: 'Electronics Manufacturing',
        waste_types_produced: ['electronic', 'e-waste', 'plastic'],
        monthly_waste_volume: 200.00
      },
      {
        email: 'glass@factory.com',
        name: 'Glass Works Inc.',
        contact: '+1234567892',
        address: '789 Glass St, City',
        factory_type: 'Glass Manufacturing',
        waste_types_produced: ['glass', 'metal'],
        monthly_waste_volume: 300.00
      }
    ];

    for (const industry of testIndustries) {
      const { error: insertError } = await supabase
        .from('industries')
        .insert(industry);

      if (insertError) {
        console.error(`  ✗ Error creating industry ${industry.name}:`, insertError);
      } else {
        console.log(`  ✓ Created industry: ${industry.name}`);
      }
    }

    // 4. Create some active pickup requests
    console.log('\n4. Creating active pickup requests...');
    const { data: industriesData } = await supabase
      .from('industries')
      .select('*')
      .limit(2);

    if (industriesData && industriesData.length > 0) {
      const testPickupRequests = [
        {
          user_type: 'industry',
          factory_id: industriesData[0].id,
          factory_name: industriesData[0].name,
          factory_contact: industriesData[0].contact,
          factory_address: industriesData[0].address,
          waste_type: 'metal',
          estimated_quantity: 100.50,
          description: 'Metal scraps from manufacturing process',
          preferred_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
          status: 'pending'
        },
        {
          user_type: 'industry',
          factory_id: industriesData[1] ? industriesData[1].id : industriesData[0].id,
          factory_name: industriesData[1] ? industriesData[1].name : industriesData[0].name,
          factory_contact: industriesData[1] ? industriesData[1].contact : industriesData[0].contact,
          factory_address: industriesData[1] ? industriesData[1].address : industriesData[0].address,
          waste_type: 'electronic',
          estimated_quantity: 50.25,
          description: 'Electronic waste from production line',
          preferred_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0], // Day after tomorrow
          status: 'pending'
        },
        {
          user_type: 'industry',
          factory_id: industriesData[0].id,
          factory_name: industriesData[0].name,
          factory_contact: industriesData[0].contact,
          factory_address: industriesData[0].address,
          waste_type: 'glass',
          estimated_quantity: 75.00,
          description: 'Glass waste from quality control',
          preferred_date: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days
          status: 'pending'
        }
      ];

      for (const request of testPickupRequests) {
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

    // 5. Create test notifications for vendors
    console.log('\n5. Creating test notifications...');
    const { data: updatedVendors } = await supabase
      .from('vendors')
      .select('*')
      .not('id', 'is', null);

    if (updatedVendors && updatedVendors.length > 0) {
      for (const vendor of updatedVendors.slice(0, 3)) { // Just first 3 vendors
        const notification = {
          user_id: vendor.id,
          type: 'pickup_request',
          title: 'New Pickup Request Available',
          message: `A new pickup request for ${vendor.collecting_waste_types[0] || 'waste'} is available in your area.`,
          data: {
            waste_type: vendor.collecting_waste_types[0] || 'mixed',
            request_id: crypto.randomUUID()
          },
          read: false
        };

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notification);

        if (notifError) {
          console.error(`  ✗ Error creating notification for vendor ${vendor.email}:`, notifError);
        } else {
          console.log(`  ✓ Created notification for vendor: ${vendor.email}`);
        }
      }
    }

    console.log('\n=== Test Data Setup Complete ===');
    
    // Final verification
    console.log('\n6. Verification...');
    const { data: finalVendors } = await supabase.from('vendors').select('*');
    const { data: finalRequests } = await supabase.from('pickup_requests').select('*').eq('status', 'pending');
    const { data: finalNotifications } = await supabase.from('notifications').select('*');
    const { data: finalIndustries } = await supabase.from('industries').select('*');

    console.log(`  ✓ Vendors: ${finalVendors?.length || 0}`);
    console.log(`  ✓ Active pickup requests: ${finalRequests?.length || 0}`);
    console.log(`  ✓ Notifications: ${finalNotifications?.length || 0}`);
    console.log(`  ✓ Industries: ${finalIndustries?.length || 0}`);

  } catch (error) {
    console.error('Error setting up test data:', error);
  }
}

setupTestData();
