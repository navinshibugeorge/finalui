const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://bkihtswnnrtpcrxftyqq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraWh0c3dubnJ0cGNyeGZ0eXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDg4NzEsImV4cCI6MjA2ODMyNDg3MX0.o7OuNoAaW3dPHdbOdkbwXSvGlvwI6s4FFGbMW4mPIBQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseState() {
  console.log('=== Database State Check ===\n');

  try {
    // 1. Check vendors table
    console.log('1. Checking vendors...');
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('*');
    
    if (vendorsError) {
      console.error('Error fetching vendors:', vendorsError);
    } else {
      console.log(`Found ${vendors.length} vendors:`);
      vendors.forEach(vendor => {
        console.log(`  - ID: ${vendor.id}, Email: ${vendor.email}, Name: ${vendor.name || 'N/A'}`);
        console.log(`    Waste Types: ${vendor.collecting_waste_types || 'None'}`);
        console.log(`    Created: ${vendor.created_at}\n`);
      });
    }

    // 2. Check pickup requests
    console.log('\n2. Checking pickup requests...');
    const { data: pickupRequests, error: pickupError } = await supabase
      .from('pickup_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (pickupError) {
      console.error('Error fetching pickup requests:', pickupError);
    } else {
      console.log(`Found ${pickupRequests.length} pickup requests:`);
      pickupRequests.slice(0, 5).forEach(request => {
        console.log(`  - ID: ${request.id}, Status: ${request.status}`);
        console.log(`    Industry: ${request.industry_id}, Waste Type: ${request.waste_type}`);
        console.log(`    Created: ${request.created_at}`);
        console.log(`    Location: ${request.pickup_location}\n`);
      });
    }

    // 3. Check notifications
    console.log('\n3. Checking notifications...');
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (notifError) {
      console.error('Error fetching notifications:', notifError);
    } else {
      console.log(`Found ${notifications.length} notifications:`);
      notifications.slice(0, 5).forEach(notif => {
        console.log(`  - ID: ${notif.id}, Type: ${notif.type}`);
        console.log(`    User: ${notif.user_id}, Read: ${notif.read}`);
        console.log(`    Title: ${notif.title}`);
        console.log(`    Message: ${notif.message}`);
        console.log(`    Created: ${notif.created_at}\n`);
      });
    }

    // 4. Check industries
    console.log('\n4. Checking industries...');
    const { data: industries, error: industriesError } = await supabase
      .from('industries')
      .select('*');
    
    if (industriesError) {
      console.error('Error fetching industries:', industriesError);
    } else {
      console.log(`Found ${industries.length} industries:`);
      industries.forEach(industry => {
        console.log(`  - ID: ${industry.id}, Email: ${industry.email}, Name: ${industry.name || 'N/A'}`);
        console.log(`    Created: ${industry.created_at}\n`);
      });
    }

    // 5. Check vendor notifications specifically
    console.log('\n5. Checking vendor-specific notifications...');
    if (vendors.length > 0) {
      const vendorId = vendors[0].id;
      const { data: vendorNotifications, error: vendorNotifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', vendorId)
        .order('created_at', { ascending: false });
      
      if (vendorNotifError) {
        console.error('Error fetching vendor notifications:', vendorNotifError);
      } else {
        console.log(`Found ${vendorNotifications.length} notifications for vendor ${vendorId}:`);
        vendorNotifications.forEach(notif => {
          console.log(`  - ${notif.title}: ${notif.message}`);
          console.log(`    Read: ${notif.read}, Created: ${notif.created_at}\n`);
        });
      }
    }

    // 6. Check for matching pickup requests for first vendor
    if (vendors.length > 0 && pickupRequests.length > 0) {
      console.log('\n6. Checking waste type compatibility...');
      const vendor = vendors[0];
      const vendorWasteTypes = vendor.collecting_waste_types;
      
      console.log(`Vendor waste types: ${vendorWasteTypes}`);
      
      const compatibleRequests = pickupRequests.filter(request => {
        if (!vendorWasteTypes) return false;
        
        // Map industry waste types to vendor waste types
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
        
        const mappedWasteType = wasteTypeMapping[request.waste_type];
        return vendorWasteTypes.includes(mappedWasteType);
      });
      
      console.log(`Compatible requests for vendor: ${compatibleRequests.length}`);
      compatibleRequests.forEach(request => {
        console.log(`  - Request ${request.id}: ${request.waste_type} -> should be compatible`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkDatabaseState();
