import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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

    const pickupRequest = {
      user_type: 'industry',
      factory_id: factoryId,
      factory_name: binData.industry_name || binData.industryName || 'Unknown Industry',
      factory_address: binData.location || 'Unknown Location',
      waste_type: binData.waste_type || binData.wasteType,
      estimated_quantity: estimatedQuantity,
      status: 'pending',
      preferred_date: new Date().toISOString().split('T')[0],
      description: `Automated pickup request for ${binData.waste_type || binData.wasteType} waste - ${binData.fill_level || binData.fillLevel}% full (Bin: ${binData.bin_id || binData.binId})`
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
    const supabase = createClientComponentClient()
    
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
      console.error('Error fetching pickup requests:', error)
      return []
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

    return validRequests.map(item => ({
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
      vendor_bids: item.vendor_bids || []
    }))
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
  }
}
