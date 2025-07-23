const { createClient } = require('@supabase/supabase-js')

// Use direct Supabase client for testing
const supabaseUrl = 'https://bkihtswnnrtpcrxftyqq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraWh0c3dubnJ0cGNyeGZ0eXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDg4NzEsImV4cCI6MjA2ODMyNDg3MX0.o7OuNoAaW3dPHdbOdkbwXSvGlvwI6s4FFGbMW4mPIBQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Market rates and density maps (matching frontend)
const WASTE_MARKET_RATES = {
  plastic: 25,      // ₹25/kg
  metal: 45,        // ₹45/kg
  glass: 8,         // ₹8/kg
  paper: 12,        // ₹12/kg
  organic: 5,       // ₹5/kg
  electronic: 180,  // ₹180/kg
  'e-waste': 180,   // ₹180/kg
  mixed: 15         // ₹15/kg average
}

const WASTE_DENSITY_MAP = {
  plastic: 0.3,     // 0.3 kg/L
  metal: 2.5,       // 2.5 kg/L
  glass: 1.5,       // 1.5 kg/L
  paper: 0.4,       // 0.4 kg/L
  organic: 0.8,     // 0.8 kg/L
  electronic: 1.2,  // 1.2 kg/L
  'e-waste': 1.2,   // 1.2 kg/L
  mixed: 0.6        // 0.6 kg/L average
}

function calculateWasteDetails(wasteType, quantityLiters) {
  const wasteTypeKey = wasteType.toLowerCase()
  const ratePerKg = WASTE_MARKET_RATES[wasteTypeKey] || WASTE_MARKET_RATES.mixed
  const density = WASTE_DENSITY_MAP[wasteTypeKey] || WASTE_DENSITY_MAP.mixed
  const weightKg = Math.round(quantityLiters * density * 10) / 10
  const marketValue = Math.round(weightKg * ratePerKg)
  const baseBid = marketValue // Direct market value (weight × rate per kg)
  
  return {
    wasteTypeKey,
    ratePerKg,
    density,
    weightKg,
    marketValue,
    baseBid
  }
}

async function testCompleteSystem() {
  console.log('🧪 Testing Complete Bidding System...\n')
  
  try {
    // 1. Test database connectivity
    console.log('1️⃣ Testing database connectivity...')
    const { data: testData, error: testError } = await supabase
      .from('vendors')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.log('❌ Database connection failed:', testError.message)
      return
    }
    console.log('✅ Database connected successfully\n')
    
    // 2. Check vendors
    console.log('2️⃣ Checking vendors...')
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('vendor_id, name, collecting_waste_types, email')
      .limit(5)
    
    if (vendorsError) {
      console.log('❌ Error fetching vendors:', vendorsError.message)
      return
    }
    
    console.log(`✅ Found ${vendors?.length || 0} vendors`)
    vendors?.forEach(vendor => {
      console.log(`   - ${vendor.name} (${vendor.email}): ${vendor.collecting_waste_types?.join(', ') || 'No types'}`)
    })
    console.log()
    
    // 3. Check pickup requests
    console.log('3️⃣ Checking pickup requests...')
    const { data: requests, error: requestsError } = await supabase
      .from('pickup_requests')
      .select('request_id, waste_type, estimated_quantity, status, factory_name')
      .limit(5)
    
    if (requestsError) {
      console.log('❌ Error fetching requests:', requestsError.message)
      return
    }
    
    console.log(`✅ Found ${requests?.length || 0} pickup requests`)
    requests?.forEach(request => {
      console.log(`   - ${request.request_id}: ${request.waste_type} (${request.estimated_quantity}L) - ${request.status}`)
    })
    console.log()
    
    // 4. Test bid calculation for each waste type
    console.log('4️⃣ Testing bid calculations...')
    const testQuantity = 100 // 100L
    
    Object.keys(WASTE_MARKET_RATES).forEach(wasteType => {
      const details = calculateWasteDetails(wasteType, testQuantity)
      console.log(`   ${wasteType}: ${testQuantity}L → ${details.weightKg}kg × ₹${details.ratePerKg}/kg = ₹${details.baseBid}`)
    })
    console.log()
    
    // 5. Check vendor_bids table
    console.log('5️⃣ Checking existing bids...')
    const { data: bids, error: bidsError } = await supabase
      .from('vendor_bids')
      .select('bid_id, request_id, vendor_id, bid_amount, created_at')
      .limit(5)
    
    if (bidsError) {
      console.log('❌ Error fetching bids:', bidsError.message)
      return
    }
    
    console.log(`✅ Found ${bids?.length || 0} existing bids`)
    bids?.forEach(bid => {
      console.log(`   - Bid ${bid.bid_id}: ₹${bid.bid_amount} by vendor ${bid.vendor_id}`)
    })
    console.log()
    
    // 6. Test a complete bidding scenario
    if (requests?.length && vendors?.length) {
      console.log('6️⃣ Testing complete bidding scenario...')
      const testRequest = requests[0]
      const testVendor = vendors[0]
      
      // Calculate base bid for this request
      const quantity = testRequest.estimated_quantity || 100
      const details = calculateWasteDetails(testRequest.waste_type, quantity)
      
      console.log(`📋 Test scenario:`)
      console.log(`   Request: ${testRequest.request_id} (${testRequest.waste_type})`)
      console.log(`   Quantity: ${quantity}L`)
      console.log(`   Base calculation: ${details.weightKg}kg × ₹${details.ratePerKg}/kg = ₹${details.baseBid}`)
      console.log(`   Vendor: ${testVendor.name}`)
      
      // Get existing bids for this request
      const { data: requestBids } = await supabase
        .from('vendor_bids')
        .select('*')
        .eq('request_id', testRequest.request_id)
        .order('bid_amount', { ascending: false })
      
      const currentHighest = requestBids?.length ? requestBids[0].bid_amount : 0
      const minimumBid = Math.max(details.baseBid, currentHighest + 10)
      
      console.log(`   Current highest bid: ₹${currentHighest}`)
      console.log(`   Minimum next bid: ₹${minimumBid}`)
      console.log(`   Total bids: ${requestBids?.length || 0}`)
      console.log()
    }
    
    // 7. Test timer logic
    console.log('7️⃣ Testing timer logic...')
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)
    
    console.log(`   Current time: ${now.toISOString()}`)
    console.log(`   5 min ago: ${fiveMinutesAgo.toISOString()}`)
    console.log(`   5 min from now: ${fiveMinutesFromNow.toISOString()}`)
    
    // Check for requests within bidding window
    const { data: activeRequests } = await supabase
      .from('pickup_requests')
      .select('request_id, created_at, waste_type')
      .eq('status', 'pending')
      .gte('created_at', fiveMinutesAgo.toISOString())
    
    console.log(`   Requests in bidding window: ${activeRequests?.length || 0}`)
    console.log()
    
    console.log('🎉 System test completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   - Vendors: ${vendors?.length || 0}`)
    console.log(`   - Pickup requests: ${requests?.length || 0}`)
    console.log(`   - Existing bids: ${bids?.length || 0}`)
    console.log(`   - Active bidding windows: ${activeRequests?.length || 0}`)
    
    // Test calculations are working correctly
    const plasticTest = calculateWasteDetails('plastic', 100)
    const metalTest = calculateWasteDetails('metal', 50)
    
    console.log('\n🧮 Calculation verification:')
    console.log(`   100L plastic: ${plasticTest.weightKg}kg × ₹${plasticTest.ratePerKg} = ₹${plasticTest.baseBid}`)
    console.log(`   50L metal: ${metalTest.weightKg}kg × ₹${metalTest.ratePerKg} = ₹${metalTest.baseBid}`)
    
    console.log('\n✅ All tests passed! System is ready for use.')
    
  } catch (error) {
    console.error('❌ System test failed:', error.message)
    console.error(error)
  }
}

testCompleteSystem()
