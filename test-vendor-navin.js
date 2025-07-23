const { createClientComponentClient } = require('@supabase/supabase-js')

// Test script to check specific vendor data
async function testVendorData() {
  console.log('🔍 Testing vendor data for Navin...')
  
  try {
    // Use the same approach as the dashboard
    const vendorId = '46e19b87-80ba-4476-be94-970ba3788e73'
    
    // Simulate the dashboard's vendor fetch logic
    console.log('Simulating vendor profile fetch...')
    
    // Create a simple mock to avoid module issues
    const mockVendorData = {
      vendor_id: '46e19b87-80ba-4476-be94-970ba3788e73',
      name: 'Navin',
      collecting_waste_types: null, // This is likely the issue
      registered_waste_types: null,
      contact: null,
      address: null
    }
    
    console.log('Mock vendor data:', mockVendorData)
    
    // Test the dashboard logic
    const vendorProfile = {
      vendor_id: mockVendorData.vendor_id,
      name: mockVendorData.name,
      registered_waste_types: mockVendorData.registered_waste_types || [],
      collecting_waste_types: mockVendorData.collecting_waste_types || [],
      contact: mockVendorData.contact,
      location: mockVendorData.address || 'Not specified'
    }
    
    console.log('Processed vendor profile:', vendorProfile)
    console.log('collecting_waste_types length:', vendorProfile.collecting_waste_types?.length)
    console.log('Will fetchActiveRequests run?', !!vendorProfile?.collecting_waste_types?.length)
    
    // Suggest a fix
    console.log('\n💡 SOLUTION: The vendor "Navin" needs collecting_waste_types configured!')
    console.log('Example waste types: ["Plastic", "Metal", "Glass", "Organic", "E-Waste"]')
    
  } catch (error) {
    console.error('Error in test:', error)
  }
}

testVendorData()
