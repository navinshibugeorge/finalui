import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Initialize Supabase client for helper functions
const supabase = createClientComponentClient()

export interface PickupRequest {
  request_id: string
  bin_id: string
  factory_id: string
  factory_name: string
  factory_address: string
  waste_type: string
  fill_level: number
  estimated_quantity: number
  status: 'pending' | 'bidding' | 'assigned' | 'completed' | 'cancelled'
  created_at: string
  bidding_ends_at: string
  assigned_vendor?: string
  winning_bid?: number
  coordinates: string
  industry_name: string
  industry_id: string
  vendor_bids?: VendorBid[]
  base_bid?: number
  current_highest_bid?: number
  total_bids?: number
}

export interface VendorBid {
  bid_id: string
  request_id: string
  vendor_id: string
  vendor_name: string
  vendor_email: string
  vendor_contact: string
  bid_amount: number
  created_at: string
  status: 'active' | 'won' | 'lost'
}

// Market rates per kg for different waste types (in INR)
export const WASTE_MARKET_RATES = {
  plastic: 25,     // ₹25/kg
  metal: 45,       // ₹45/kg  
  glass: 8,        // ₹8/kg
  paper: 12,       // ₹12/kg
  organic: 5,      // ₹5/kg
  electronic: 180, // ₹180/kg
  'e-waste': 180,  // ₹180/kg
  mixed: 15        // ₹15/kg average
}

// Calculate base bid amount based on waste type and quantity
export function calculateBaseBid(wasteType: string, quantityLiters: number): number {
  const wasteTypeKey = wasteType.toLowerCase() as keyof typeof WASTE_MARKET_RATES
  const ratePerKg = WASTE_MARKET_RATES[wasteTypeKey] || WASTE_MARKET_RATES.mixed
  
  // Convert liters to approximate weight in kg (density varies by waste type)
  const densityMap = {
    plastic: 0.3,     // 0.3 kg/L
    metal: 2.5,       // 2.5 kg/L
    glass: 1.5,       // 1.5 kg/L
    paper: 0.4,       // 0.4 kg/L
    organic: 0.8,     // 0.8 kg/L
    electronic: 1.2,  // 1.2 kg/L
    'e-waste': 1.2,   // 1.2 kg/L
    mixed: 0.6        // 0.6 kg/L average
  }
  
  const density = densityMap[wasteTypeKey] || densityMap.mixed
  const weightKg = quantityLiters * density
  const baseBid = Math.round(weightKg * ratePerKg)
  
  // Direct market value (weight × rate per kg)
  return baseBid
}

export const pickupRequestService = {
  // Create pickup request when bin is above 80%
  async createPickupRequest(binData: any): Promise<PickupRequest> {
    const supabase = createClientComponentClient()
    
    console.log('🔍 Creating pickup request with binData:', {
      ...binData,
      keys: Object.keys(binData)
    })
    
    // Use the factory_id from binData (should be the authenticated user's UUID)
    const factoryId = binData.factory_id || binData.industry_id || binData.factoryId
    
    if (!factoryId) {
      throw new Error('Factory ID is required to create pickup request')
    }

    // Check if factory record exists, create if it doesn't
    const { data: existingFactory, error: factoryCheckError } = await supabase
      .from('factories')
      .select('factory_id')
      .eq('factory_id', factoryId)
      .single()

    if (factoryCheckError && factoryCheckError.code === 'PGRST116') {
      // Factory doesn't exist, create it
      console.log('Factory record not found, creating one...')
      
      // Get user profile to get factory details
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', factoryId)
        .single()

      if (profileError) {
        throw new Error('Could not fetch user profile to create factory record')
      }

      // Create factory record
      const { error: factoryCreateError } = await supabase
        .from('factories')
        .insert({
          factory_id: factoryId,
          factory_name: profile.company_name || binData.industry_name || 'Unknown Factory',
          contact: profile.contact || 'Unknown',
          address: profile.address || binData.location || 'Unknown',
          email: profile.email || 'unknown@example.com',
          factory_type: profile.factory_type || 'Unknown',
          waste_types_produced: profile.waste_types || [binData.waste_type],
        })

      if (factoryCreateError) {
        throw new Error(`Failed to create factory record: ${factoryCreateError.message}`)
      }
    } else if (factoryCheckError) {
      throw new Error(`Error checking factory record: ${factoryCheckError.message}`)
    }
    
    // Check if a request already exists for this factory and waste type
    const { data: existingRequest, error: existingRequestError } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('factory_id', factoryId)
      .eq('waste_type', binData.waste_type || binData.wasteType)
      .in('status', ['pending', 'assigned', 'bidding'])
      .maybeSingle() // Use maybeSingle() instead of single() to avoid errors when no record found

    // Only throw error if there's an actual database error (not "no rows" error)
    if (existingRequestError && existingRequestError.code !== 'PGRST116') {
      throw new Error(`Error checking existing requests: ${existingRequestError.message}`)
    }

    if (existingRequest) {
      throw new Error('Pickup request already exists for this bin')
    }

    // Calculate estimated quantity based on available data
    let estimatedQuantity = 100 // Default fallback value in liters
    
    if (binData.volume && binData.fill_level) {
      // Use actual volume and fill level
      estimatedQuantity = Math.round((binData.volume * binData.fill_level) / 100)
    } else if (binData.capacity && binData.fill_level) {
      // Use capacity and fill level
      estimatedQuantity = Math.round((binData.capacity * binData.fill_level) / 100)
    } else if (binData.fill_level) {
      // Estimate based on typical bin sizes (assume 500L capacity)
      estimatedQuantity = Math.round((500 * binData.fill_level) / 100)
    }
    
    // Ensure minimum quantity of 50L for pickup efficiency
    estimatedQuantity = Math.max(50, estimatedQuantity)
    
    // Calculate base bid amount based on market rates
    const baseBid = calculateBaseBid(binData.waste_type || binData.wasteType, estimatedQuantity)

    const pickupRequest = {
      user_type: 'industry',
      factory_id: factoryId,
      factory_name: binData.industry_name || binData.industryName || 'Unknown Industry',
      factory_address: binData.location || 'Unknown Location',
      waste_type: binData.waste_type || binData.wasteType,
      estimated_quantity: estimatedQuantity,
      status: 'pending',
      preferred_date: new Date().toISOString().split('T')[0],
      description: `Automated pickup request for ${binData.waste_type || binData.wasteType} waste - ${binData.fill_level || binData.fillLevel}% full (Bin: ${binData.bin_id || binData.binId})`,
      estimated_price: baseBid // Base bid amount
    }

    const { data, error } = await supabase
      .from('pickup_requests')
      .insert([pickupRequest])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create pickup request: ${error.message}`)
    }

    // Notify vendors who collect this type of waste
    await this.notifyVendorsForPickupRequest(data.request_id, binData.waste_type)

    return {
      request_id: data.request_id,
      bin_id: binData.bin_id || binData.binId,
      factory_id: factoryId,
      factory_name: binData.industry_name || binData.industryName || 'Unknown Industry',
      factory_address: binData.location || 'Unknown Location',
      waste_type: binData.waste_type || binData.wasteType,
      fill_level: binData.fill_level || binData.fillLevel || 85,
      estimated_quantity: pickupRequest.estimated_quantity,
      status: 'bidding',
      created_at: data.created_at,
      bidding_ends_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      coordinates: binData.coordinates || "11.9611, 89.5900",
      industry_name: binData.industry_name || binData.industryName || 'Unknown Industry',
      industry_id: factoryId
    }
  },

  // Get all active pickup requests for vendors
  async getActivePickupRequests(): Promise<PickupRequest[]> {
    try {
      const supabase = createClientComponentClient()
      
      console.log('Fetching active pickup requests from Supabase...')
      
      // First, let's check if the table exists and has any data
      const { data: tableCheck, error: tableError } = await supabase
        .from('pickup_requests')
        .select('count')
        .limit(1)

      if (tableError) {
        console.error('Error checking pickup_requests table:', {
          message: tableError.message,
          details: tableError.details,
          hint: tableError.hint,
          code: tableError.code
        })
        
        // If table doesn't exist, return empty array with helpful message
        if (tableError.code === 'PGRST116' || tableError.message?.includes('does not exist')) {
          console.log('pickup_requests table does not exist. Creating test data...')
          return await this.createTestPickupRequests()
        }
        throw new Error(`Database error: ${tableError.message || 'Unknown error'}`)
      }
      
      // Get pending requests that are open for bidding
      const { data, error } = await supabase
        .from('pickup_requests')
        .select(`
          *,
          vendor_bids(*)
        `)
        .eq('status', 'pending')
        .eq('user_type', 'industry')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        console.error('Full error object:', error)
        throw new Error(`Database error: ${error.message || 'Unknown error'}`)
      }

      if (!data || data.length === 0) {
        console.log('No pending pickup requests found. Creating test data...')
        return await this.createTestPickupRequests()
      }

      // Filter out requests that are too old (more than 5 minutes since creation)
      const currentTime = new Date()
      const validRequests = data.filter(item => {
        const createdTime = new Date(item.created_at)
        const timeDiff = currentTime.getTime() - createdTime.getTime()
        const fiveMinutes = 5 * 60 * 1000
        return timeDiff < fiveMinutes
      })

      console.log(`Found ${data.length} pickup requests, ${validRequests.length} are within 5-minute window`)

      return validRequests.map(item => {
        // Calculate highest bid and bid count from vendor_bids
        const activeBids = (item.vendor_bids || []).filter((bid: any) => bid.status === 'active')
        const highestBid = activeBids.length > 0 
          ? Math.max(...activeBids.map((bid: any) => bid.bid_amount))
          : 0
        
        // Calculate base bid for this request
        const baseBid = item.estimated_price || calculateBaseBid(item.waste_type, item.estimated_quantity)
        
        return {
          request_id: item.request_id,
          bin_id: item.request_id, // Using request_id as bin reference
          factory_id: item.factory_id,
          factory_name: item.factory_name || 'Unknown Factory',
          factory_address: item.factory_address || 'Unknown Address',
          waste_type: item.waste_type,
          fill_level: 85, // Default high fill level for industry requests
          estimated_quantity: item.estimated_quantity,
          status: item.status,
          created_at: item.created_at,
          bidding_ends_at: new Date(new Date(item.created_at).getTime() + 5 * 60 * 1000).toISOString(),
          coordinates: "11.9611, 89.5900",
          industry_name: item.factory_name || 'Unknown Industry',
          industry_id: item.factory_id,
          vendor_bids: activeBids,
          base_bid: baseBid,
          current_highest_bid: highestBid,
          total_bids: activeBids.length,
          winning_bid: highestBid > 0 ? highestBid : undefined
        }
      })
    } catch (catchError) {
      console.error('Error fetching pickup requests:', catchError)
      throw catchError
    }
  },

  // Get vendors who collect specific waste type
  async getVendorsForWasteType(wasteType: string): Promise<any[]> {
    const supabase = createClientComponentClient()
    
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .contains('collecting_waste_types', [wasteType])
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching vendors for waste type:', error)
      return []
    }

    return data || []
  },

  // Send notification to specific vendors for a pickup request
  async notifyVendorsForPickupRequest(requestId: string, wasteType: string): Promise<void> {
    const supabase = createClientComponentClient()
    
    // Map industry waste type to vendor waste type
    const mappedWasteType = this.mapIndustryWasteTypeToVendorType(wasteType)
    
    // Get vendors who collect this waste type
    const vendors = await this.getVendorsForWasteType(mappedWasteType)
    
    console.log(`Found ${vendors.length} vendors who collect ${mappedWasteType} waste (mapped from ${wasteType})`)
    
    // Here you would typically send notifications (email, SMS, push notifications)
    // For now, we'll just log the vendors who should be notified
    vendors.forEach(vendor => {
      console.log(`Notifying vendor: ${vendor.name} (${vendor.email}) for ${mappedWasteType} pickup request ${requestId}`)
    })
    
    // In a real implementation, you would send notifications here
    // Example: Send email notifications, push notifications to mobile app, etc.
  },

  // Map industry waste types to vendor collecting waste types
  mapIndustryWasteTypeToVendorType(industryWasteType: string): string {
    const wasteTypeMap: { [key: string]: string } = {
      'plastic': 'Plastic',
      'organic': 'Organic', 
      'metal': 'Metal',
      'electronic': 'E-Waste',
      'e-waste': 'E-Waste',
      'glass': 'Glass',
      'paper': 'Organic', // Assuming paper goes to organic processing
      'mixed': 'Plastic' // Default to plastic for mixed waste
    }
    
    return wasteTypeMap[industryWasteType.toLowerCase()] || industryWasteType
  },

  // Submit a bid for a pickup request
  async submitBid(requestId: string, vendorId: string, bidAmount: number): Promise<VendorBid> {
    const supabase = createClientComponentClient()
    
    // Check if bid already exists
    const { data: existingBid } = await supabase
      .from('vendor_bids')
      .select('*')
      .eq('request_id', requestId)
      .eq('vendor_id', vendorId)
      .single()

    if (existingBid) {
      // Update existing bid
      const { data, error } = await supabase
        .from('vendor_bids')
        .update({ 
          bid_amount: bidAmount,
          status: 'active'
        })
        .eq('id', existingBid.id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update bid: ${error.message}`)
      }

      return {
        bid_id: data.id,
        request_id: data.request_id,
        vendor_id: data.vendor_id,
        vendor_name: data.vendor_name,
        vendor_email: data.vendor_email,
        vendor_contact: data.vendor_contact,
        bid_amount: data.bid_amount,
        created_at: data.created_at,
        status: data.status
      }
    }

    // Get vendor details
    const { data: vendor } = await supabase
      .from('vendors')
      .select('name, email, contact')
      .eq('vendor_id', vendorId)
      .single()

    const bid = {
      request_id: requestId,
      vendor_id: vendorId,
      vendor_name: vendor?.name || 'Unknown Vendor',
      vendor_email: vendor?.email || '',
      vendor_contact: vendor?.contact || '',
      bid_amount: bidAmount,
      status: 'active'
    }

    const { data, error } = await supabase
      .from('vendor_bids')
      .insert([bid])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to submit bid: ${error.message}`)
    }

    return {
      bid_id: data.id,
      request_id: data.request_id,
      vendor_id: data.vendor_id,
      vendor_name: data.vendor_name,
      vendor_email: data.vendor_email,
      vendor_contact: data.vendor_contact,
      bid_amount: data.bid_amount,
      created_at: data.created_at,
      status: data.status
    }
  },

  // Get bids for a specific request
  async getBidsForRequest(requestId: string): Promise<VendorBid[]> {
    const supabase = createClientComponentClient()
    
    const { data, error } = await supabase
      .from('vendor_bids')
      .select('*')
      .eq('request_id', requestId)
      .order('bid_amount', { ascending: false })

    if (error) {
      console.error('Error fetching bids:', error)
      return []
    }

    return data.map(bid => ({
      bid_id: bid.id,
      request_id: bid.request_id,
      vendor_id: bid.vendor_id,
      vendor_name: bid.vendor_name,
      vendor_email: bid.vendor_email,
      vendor_contact: bid.vendor_contact,
      bid_amount: bid.bid_amount,
      created_at: bid.created_at,
      status: bid.status
    }))
  },

  // Place or update a bid for a pickup request
  async placeBid(requestId: string, vendorId: string, bidAmount: number): Promise<VendorBid> {
    const supabase = createClientComponentClient()
    
    // First, get the pickup request to validate bidding window and get current highest bid
    const { data: pickupRequest, error: requestError } = await supabase
      .from('pickup_requests')
      .select('*, vendor_bids(*)')
      .eq('request_id', requestId)
      .eq('status', 'pending')
      .single()

    if (requestError || !pickupRequest) {
      throw new Error('Pickup request not found or bidding closed')
    }

    // Check if bidding window is still open (5 minutes from creation)
    const createdTime = new Date(pickupRequest.created_at).getTime()
    const currentTime = Date.now()
    const fiveMinutes = 5 * 60 * 1000
    
    if (currentTime - createdTime > fiveMinutes) {
      throw new Error('Bidding window has closed')
    }

    // Get current highest bid
    const activeBids = pickupRequest.vendor_bids?.filter((bid: any) => bid.status === 'active') || []
    const currentHighestBid = activeBids.length > 0 
      ? Math.max(...activeBids.map((bid: any) => bid.bid_amount))
      : 0
    
    // Calculate minimum bid (base bid or current highest + ₹10)
    const baseBid = pickupRequest.estimated_price || calculateBaseBid(pickupRequest.waste_type, pickupRequest.estimated_quantity)
    const minimumBid = Math.max(baseBid, currentHighestBid + 10)
    
    if (bidAmount < minimumBid) {
      throw new Error(`Bid must be at least ₹${minimumBid} (Current highest: ₹${currentHighestBid}, Base: ₹${baseBid})`)
    }

    // Get vendor details
    const { data: vendor } = await supabase
      .from('vendors')
      .select('*')
      .eq('vendor_id', vendorId)
      .single()

    if (!vendor) {
      throw new Error('Vendor not found')
    }

    // Check if vendor already has a bid for this request
    const existingBid = activeBids.find((bid: any) => bid.vendor_id === vendorId)

    if (existingBid) {
      // Update existing bid
      const { data, error } = await supabase
        .from('vendor_bids')
        .update({ 
          bid_amount: bidAmount,
          created_at: new Date().toISOString()
        })
        .eq('id', existingBid.id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update bid: ${error.message}`)
      }

      return {
        bid_id: data.id,
        request_id: data.request_id,
        vendor_id: data.vendor_id,
        vendor_name: data.vendor_name,
        vendor_email: data.vendor_email,
        vendor_contact: data.vendor_contact,
        bid_amount: data.bid_amount,
        created_at: data.created_at,
        status: data.status
      }
    } else {
      // Create new bid
      const { data, error } = await supabase
        .from('vendor_bids')
        .insert({
          request_id: requestId,
          vendor_id: vendorId,
          vendor_name: vendor.name,
          vendor_email: vendor.email,
          vendor_contact: vendor.contact,
          bid_amount: bidAmount,
          status: 'active'
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to place bid: ${error.message}`)
      }

      return {
        bid_id: data.id,
        request_id: data.request_id,
        vendor_id: data.vendor_id,
        vendor_name: data.vendor_name,
        vendor_email: data.vendor_email,
        vendor_contact: data.vendor_contact,
        bid_amount: data.bid_amount,
        created_at: data.created_at,
        status: data.status
      }
    }
  },

  // Get real-time bidding information for a specific request
  async getBiddingInfo(requestId: string): Promise<{
    request: PickupRequest | null,
    activeBids: VendorBid[],
    currentHighestBid: number,
    totalBids: number,
    timeRemaining: number
  }> {
    const supabase = createClientComponentClient()
    
    const { data: request, error } = await supabase
      .from('pickup_requests')
      .select(`
        *,
        vendor_bids(*)
      `)
      .eq('request_id', requestId)
      .single()

    if (error || !request) {
      return {
        request: null,
        activeBids: [],
        currentHighestBid: 0,
        totalBids: 0,
        timeRemaining: 0
      }
    }

    const activeBids = (request.vendor_bids || [])
      .filter((bid: any) => bid.status === 'active')
      .sort((a: any, b: any) => b.bid_amount - a.bid_amount)

    const currentHighestBid = activeBids.length > 0 ? activeBids[0].bid_amount : 0
    const createdTime = new Date(request.created_at).getTime()
    const currentTime = Date.now()
    const fiveMinutes = 5 * 60 * 1000
    const timeRemaining = Math.max(0, fiveMinutes - (currentTime - createdTime))

    return {
      request: {
        ...request,
        bidding_ends_at: new Date(createdTime + fiveMinutes).toISOString(),
        current_highest_bid: currentHighestBid,
        total_bids: activeBids.length,
        base_bid: request.estimated_price || calculateBaseBid(request.waste_type, request.estimated_quantity)
      },
      activeBids,
      currentHighestBid,
      totalBids: activeBids.length,
      timeRemaining: Math.floor(timeRemaining / 1000)
    }
  },

  // Select winning bid after 5 minutes
  async selectWinningBid(requestId: string): Promise<VendorBid | null> {
    const supabase = createClientComponentClient()
    
    // Get highest bid
    const { data: bids } = await supabase
      .from('vendor_bids')
      .select('*')
      .eq('request_id', requestId)
      .eq('status', 'active')
      .order('bid_amount', { ascending: false })
      .limit(1)

    if (!bids || bids.length === 0) {
      return null
    }

    const winningBid = bids[0]

    // Update winning bid status
    await supabase
      .from('vendor_bids')
      .update({ status: 'won' })
      .eq('id', winningBid.id)

    // Update other bids to lost
    await supabase
      .from('vendor_bids')
      .update({ status: 'lost' })
      .eq('request_id', requestId)
      .neq('id', winningBid.id)

    // Update pickup request
    await supabase
      .from('pickup_requests')
      .update({ 
        status: 'assigned',
        assigned_vendor: winningBid.vendor_id,
        total_amount: winningBid.bid_amount
      })
      .eq('request_id', requestId)

    return {
      bid_id: winningBid.id,
      request_id: winningBid.request_id,
      vendor_id: winningBid.vendor_id,
      vendor_name: winningBid.vendor_name,
      vendor_email: winningBid.vendor_email,
      vendor_contact: winningBid.vendor_contact,
      bid_amount: winningBid.bid_amount,
      created_at: winningBid.created_at,
      status: 'won'
    }
  },

  // Get pickup requests for a specific industry
  async getIndustryPickupRequests(industryId: string): Promise<any[]> {
    const supabase = createClientComponentClient()
    
    const { data, error } = await supabase
      .from('pickup_requests')
      .select(`
        *,
        vendor_bids (
          *,
          vendors (
            name,
            email,
            contact
          )
        )
      `)
      .eq('factory_id', industryId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching industry pickup requests:', error)
      return []
    }

    return data
  },

  // Expire old pickup requests (called automatically)
  async expireOldRequests(): Promise<void> {
    const supabase = createClientComponentClient()
    
    // Update requests that are older than 5 minutes and still pending
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    const { error } = await supabase
      .from('pickup_requests')
      .update({ status: 'cancelled' })
      .eq('status', 'pending')
      .lt('created_at', fiveMinutesAgo)

    if (error) {
      console.error('Error expiring old requests:', error)
    }
  },

  // Create test pickup requests when no data exists
  async createTestPickupRequests(): Promise<PickupRequest[]> {
    console.log('Creating test pickup requests data...')
    
    const testRequests: PickupRequest[] = [
      {
        request_id: 'test-request-1',
        bin_id: 'test-bin-1',
        factory_id: 'test-factory-1',
        factory_name: 'Green Tech Industries',
        factory_address: 'Industrial Area, Sector 15, Chennai',
        waste_type: 'plastic',
        fill_level: 85,
        estimated_quantity: 150,
        status: 'pending',
        created_at: new Date().toISOString(),
        bidding_ends_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        coordinates: "13.0827, 80.2707",
        industry_name: 'Green Tech Industries',
        industry_id: 'test-factory-1',
        vendor_bids: []
      },
      {
        request_id: 'test-request-2',
        bin_id: 'test-bin-2',
        factory_id: 'test-factory-2',
        factory_name: 'Metal Works Corp',
        factory_address: 'Manufacturing Zone, Phase 2, Coimbatore',
        waste_type: 'metal',
        fill_level: 90,
        estimated_quantity: 200,
        status: 'pending',
        created_at: new Date().toISOString(),
        bidding_ends_at: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
        coordinates: "11.0168, 76.9558",
        industry_name: 'Metal Works Corp',
        industry_id: 'test-factory-2',
        vendor_bids: []
      },
      {
        request_id: 'test-request-3',
        bin_id: 'test-bin-3',
        factory_id: 'test-factory-3',
        factory_name: 'Organic Food Processing',
        factory_address: 'Food Park, Bangalore',
        waste_type: 'organic',
        fill_level: 95,
        estimated_quantity: 300,
        status: 'pending',
        created_at: new Date().toISOString(),
        bidding_ends_at: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
        coordinates: "12.9716, 77.5946",
        industry_name: 'Organic Food Processing',
        industry_id: 'test-factory-3',
        vendor_bids: []
      }
    ]
    
    return testRequests
  }
}

// Helper function to select bid winner when timer expires
export const selectBidWinner = async (requestId: string): Promise<boolean> => {
  try {
    // Get all bids for this request
    const bids = await getBidsForRequest(requestId)
    
    if (bids.length === 0) {
      console.log(`No bids found for request ${requestId}`)
      return false
    }
    
    // Find the highest bid
    const winningBid = bids.reduce((highest, current) => 
      current.bid_amount > highest.bid_amount ? current : highest
    )
    
    // Get vendor details for the winner
    const { data: vendorData, error: vendorError } = await supabase
      .from('vendors')
      .select('name, contact, address, email')
      .eq('vendor_id', winningBid.vendor_id)
      .single()
    
    if (vendorError) {
      console.error('Error fetching vendor details:', vendorError)
    }
    
    // Update the pickup request with winner and vendor details
    const updateData: any = {
      status: 'assigned',
      assigned_vendor: winningBid.vendor_id,
      total_amount: winningBid.bid_amount
    }
    
    // Add vendor details if available (commented out as these columns don't exist)
    // if (vendorData) {
    //   updateData.assigned_vendor_name = vendorData.name
    //   updateData.assigned_vendor_contact = vendorData.contact
    //   updateData.assigned_vendor_address = vendorData.address
    //   updateData.assigned_vendor_email = vendorData.email
    // }
    
    const { error: updateError } = await supabase
      .from('pickup_requests')
      .update(updateData)
      .eq('request_id', requestId)
    
    if (updateError) {
      throw updateError
    }
    
    // Update the winning bid status
    const { error: bidUpdateError } = await supabase
      .from('vendor_bids')
      .update({ status: 'won' })
      .eq('id', winningBid.id)
    
    if (bidUpdateError) {
      console.error('Error updating winning bid status:', bidUpdateError)
    }
    
    // Update other bids to lost status
    const { error: loseBidsError } = await supabase
      .from('vendor_bids')
      .update({ status: 'lost' })
      .eq('request_id', requestId)
      .neq('id', winningBid.id)
    
    if (loseBidsError) {
      console.error('Error updating losing bid statuses:', loseBidsError)
    }
    
    console.log(`Winner selected for request ${requestId}: Vendor ${winningBid.vendor_id} (${vendorData?.name}) with bid ₹${winningBid.bid_amount}`)
    return true
    
  } catch (error) {
    console.error('Error selecting bid winner:', error)
    return false
  }
}

// Helper function to get all bids for a request
export const getBidsForRequest = async (requestId: string) => {
  try {
    const { data, error } = await supabase
      .from('vendor_bids')
      .select('*')
      .eq('request_id', requestId)
      .order('bid_amount', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching bids for request:', error)
    return []
  }
}
