const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://bkihtswnnrtpcrxftyqq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraWh0c3dubnJ0cGNyeGZ0eXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDg4NzEsImV4cCI6MjA2ODMyNDg3MX0.o7OuNoAaW3dPHdbOdkbwXSvGlvwI6s4FFGbMW4mPIBQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  console.log('=== Schema Inspection ===\n');

  try {
    // Check what vendors actually look like
    console.log('1. Raw vendor data...');
    const { data: vendorsRaw, error: vendorsError } = await supabase
      .from('vendors')
      .select('*')
      .limit(1);
    
    if (vendorsError) {
      console.error('Error fetching vendors:', vendorsError);
    } else if (vendorsRaw && vendorsRaw.length > 0) {
      console.log('Vendor columns:');
      console.log(Object.keys(vendorsRaw[0]));
      console.log('Sample vendor:', vendorsRaw[0]);
    }

    // Check what pickup_requests actually look like
    console.log('\n2. Raw pickup_requests data...');
    const { data: requestsRaw, error: requestsError } = await supabase
      .from('pickup_requests')
      .select('*')
      .limit(1);
    
    if (requestsError) {
      console.error('Error fetching pickup_requests:', requestsError);
    } else if (requestsRaw && requestsRaw.length > 0) {
      console.log('Pickup request columns:');
      console.log(Object.keys(requestsRaw[0]));
      console.log('Sample request:', requestsRaw[0]);
    }

    // Try to create notifications table via SQL
    console.log('\n3. Creating notifications table manually...');
    const { data, error } = await supabase.rpc('exec_sql', { 
      query: `
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          data JSONB,
          read BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (error) {
      console.error('Error creating notifications table:', error);
    } else {
      console.log('Notifications table creation attempt completed');
    }

    // Try to create industries table via SQL  
    console.log('\n4. Creating industries table manually...');
    const { data: industryData, error: industryError } = await supabase.rpc('exec_sql', { 
      query: `
        CREATE TABLE IF NOT EXISTS industries (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          email TEXT NOT NULL,
          name TEXT NOT NULL,
          contact TEXT,
          address TEXT,
          factory_type TEXT,
          waste_types_produced TEXT[],
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (industryError) {
      console.error('Error creating industries table:', industryError);
    } else {
      console.log('Industries table creation attempt completed');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

inspectSchema();
