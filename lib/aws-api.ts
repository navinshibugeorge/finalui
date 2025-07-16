// Mock AWS API functions for development
// In production, these would connect to actual AWS services

interface PickupRequest {
  request_id?: string
  user_id: string
  waste_type: string
  size_category: string
  estimated_quantity: number
  estimated_price: number
  status: string
  created_at: string
  updated_at?: string
  vendor_name?: string
  vendor_contact?: string
  vendor_rating?: number
  vendor_feedback?: string
  total_amount?: number
  actual_quantity?: number
  waste_image?: string | null
}

interface CitizenPickupRequest {
  request_id: string
  user_id: string
  citizen_name?: string
  contact_number?: string
  address?: string
  waste_type: string
  size_category?: string
  approx_weight?: number
  estimated_quantity: number
  estimated_price: number
  waste_image?: string | null
  status: string
  created_at: string
  updated_at?: string
  description?: string
  vendor_id?: string
  vendor_name?: string
  vendor_contact?: string
}

interface UserProfile {
  user_id: string
  name?: string
  email?: string
  wallet_balance?: number
  eco_coins?: number
  user_type?: string
  contact_number?: string
  address?: string
}

interface Bin {
  bin_id: string
  location: string
  fill_level: number
  waste_type: string
  last_updated: string
  capacity: number
  temperature?: number
  humidity?: number
}

interface Vendor {
  vendor_id: string
  name: string
  contact: string
  specialization: string[]
  rating: number
  location: string
  availability: boolean
}

// Mock data storage - This simulates a database
const mockPickupRequests: PickupRequest[] = [
  {
    request_id: "req_001",
    user_id: "citizen@example.com",
    waste_type: "plastic",
    size_category: "medium",
    estimated_quantity: 10,
    estimated_price: 75,
    status: "completed",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-16T14:30:00Z",
    vendor_name: "EcoWaste Solutions",
    vendor_contact: "+91-9876543210",
    total_amount: 80,
    actual_quantity: 12,
  },
  {
    request_id: "req_002",
    user_id: "citizen@example.com",
    waste_type: "paper",
    size_category: "small",
    estimated_quantity: 3,
    estimated_price: 25,
    status: "assigned",
    created_at: "2024-01-18T09:15:00Z",
    vendor_name: "Green Recyclers",
    vendor_contact: "+91-9876543211",
  },
]

// Separate storage for citizen pickup requests that vendors can see
const mockCitizenPickupRequests: CitizenPickupRequest[] = [
  {
    request_id: "citizen_req_001",
    user_id: "citizen@example.com",
    citizen_name: "Ravi Sharma",
    contact_number: "9876543210",
    address: "123 Green Valley Apartments, Sector 15, Bangalore - 560001",
    waste_type: "plastic",
    size_category: "medium",
    approx_weight: 15,
    estimated_quantity: 15,
    estimated_price: 120,
    waste_image: "/placeholder.svg?height=200&width=300&text=PLASTIC+BOTTLES",
    status: "pending",
    created_at: "2024-01-20T09:30:00Z",
    description: "Mixed plastic bottles and containers from household",
  },
  {
    request_id: "citizen_req_002",
    user_id: "citizen2@example.com",
    citizen_name: "Priya Patel",
    contact_number: "9876543211",
    address: "456 Sunrise Colony, MG Road, Bangalore - 560002",
    waste_type: "paper",
    size_category: "small",
    approx_weight: 8,
    estimated_quantity: 8,
    estimated_price: 60,
    waste_image: "/placeholder.svg?height=200&width=300&text=PAPER+WASTE",
    status: "pending",
    created_at: "2024-01-20T10:15:00Z",
    description: "Old newspapers, magazines, and cardboard boxes",
  },
]

const mockUserProfiles: UserProfile[] = [
  {
    user_id: "citizen@example.com",
    name: "John Citizen",
    email: "citizen@example.com",
    wallet_balance: 150.5,
    eco_coins: 25,
    user_type: "citizen",
    contact_number: "9876543210",
    address: "123 Green Valley Apartments, Sector 15, Bangalore - 560001",
  },
  {
    user_id: "citizen2@example.com",
    name: "Priya Patel",
    email: "citizen2@example.com",
    wallet_balance: 200.0,
    eco_coins: 15,
    user_type: "citizen",
    contact_number: "9876543211",
    address: "456 Sunrise Colony, MG Road, Bangalore - 560002",
  },
  {
    user_id: "vendor@example.com",
    name: "Vendor Corp",
    email: "vendor@example.com",
    wallet_balance: 2500.0,
    eco_coins: 100,
    user_type: "vendor",
  },
  {
    user_id: "industry@example.com",
    name: "Industry Ltd",
    email: "industry@example.com",
    wallet_balance: 5000.0,
    eco_coins: 200,
    user_type: "industry",
  },
]

const mockBins: Bin[] = [
  {
    bin_id: "bin_001",
    location: "Downtown Plaza",
    fill_level: 85,
    waste_type: "mixed",
    last_updated: "2024-01-20T08:30:00Z",
    capacity: 100,
    temperature: 25,
    humidity: 60,
  },
  {
    bin_id: "bin_002",
    location: "Tech Park",
    fill_level: 92,
    waste_type: "electronic",
    last_updated: "2024-01-20T09:15:00Z",
    capacity: 80,
    temperature: 28,
    humidity: 55,
  },
  {
    bin_id: "bin_003",
    location: "Residential Area A",
    fill_level: 78,
    waste_type: "organic",
    last_updated: "2024-01-20T07:45:00Z",
    capacity: 120,
    temperature: 30,
    humidity: 70,
  },
]

const mockVendors: Vendor[] = [
  {
    vendor_id: "vendor_001",
    name: "EcoWaste Solutions",
    contact: "+91-9876543210",
    specialization: ["plastic", "metal", "glass"],
    rating: 4.5,
    location: "North District",
    availability: true,
  },
  {
    vendor_id: "vendor_002",
    name: "Green Recyclers",
    contact: "+91-9876543211",
    specialization: ["paper", "organic"],
    rating: 4.2,
    location: "South District",
    availability: true,
  },
  {
    vendor_id: "vendor_003",
    name: "Tech Waste Pro",
    contact: "+91-9876543212",
    specialization: ["electronic", "hazardous"],
    rating: 4.8,
    location: "Tech District",
    availability: false,
  },
]

// Utility function to generate unique IDs
const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// API Functions
export async function getPickupRequests(userId?: string, userType?: string) {
  await delay(500) // Simulate network delay

  try {
    let filteredRequests = mockPickupRequests

    if (userId && userType === "citizen") {
      filteredRequests = mockPickupRequests.filter((req) => req.user_id === userId)
    } else if (userType === "vendor") {
      // Vendors see all requests they can handle
      filteredRequests = mockPickupRequests
    } else if (userType === "industry") {
      // Industries see requests from their bins
      filteredRequests = mockPickupRequests.filter((req) => req.user_id.includes("industry"))
    }

    return { data: filteredRequests, error: null }
  } catch (error) {
    return { data: null, error: "Failed to fetch pickup requests" }
  }
}

// New function specifically for citizen pickup requests that vendors can see
export async function getCitizenPickupRequests(vendorWasteTypes?: string[]) {
  await delay(600) // Simulate network delay

  try {
    let filteredRequests = mockCitizenPickupRequests.filter((req) => req.status === "pending")

    // Filter by vendor's registered waste types if provided
    if (vendorWasteTypes && vendorWasteTypes.length > 0) {
      filteredRequests = filteredRequests.filter((req) => vendorWasteTypes.includes(req.waste_type))
    }

    return { data: filteredRequests, error: null }
  } catch (error) {
    return { data: null, error: "Failed to fetch citizen pickup requests" }
  }
}

export async function createPickupRequest(requestData: Omit<PickupRequest, "request_id">) {
  await delay(300)

  try {
    const newRequest: PickupRequest = {
      ...requestData,
      request_id: generateId("req"),
    }

    mockPickupRequests.push(newRequest)

    // Also create a citizen pickup request that vendors can see
    const userProfile = mockUserProfiles.find((profile) => profile.user_id === requestData.user_id)

    const citizenRequest: CitizenPickupRequest = {
      request_id: newRequest.request_id!,
      user_id: requestData.user_id,
      citizen_name: userProfile?.name || "Unknown Citizen",
      contact_number: userProfile?.contact_number || "Not provided",
      address: userProfile?.address || "Address not provided",
      waste_type: requestData.waste_type,
      size_category: requestData.size_category,
      approx_weight: requestData.estimated_quantity,
      estimated_quantity: requestData.estimated_quantity,
      estimated_price: requestData.estimated_price,
      waste_image: requestData.waste_image,
      status: requestData.status,
      created_at: requestData.created_at,
      description: "Pickup request from citizen dashboard",
    }

    mockCitizenPickupRequests.push(citizenRequest)

    return { data: newRequest, error: null }
  } catch (error) {
    return { data: null, error: "Failed to create pickup request" }
  }
}

export async function updatePickupRequest(requestId: string, updates: Partial<PickupRequest>) {
  await delay(300)

  try {
    const requestIndex = mockPickupRequests.findIndex((req) => req.request_id === requestId)
    if (requestIndex === -1) {
      return { data: null, error: "Request not found" }
    }

    mockPickupRequests[requestIndex] = {
      ...mockPickupRequests[requestIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    }

    return { data: mockPickupRequests[requestIndex], error: null }
  } catch (error) {
    return { data: null, error: "Failed to update pickup request" }
  }
}

// New function to update citizen pickup requests
export async function updateCitizenPickupRequest(requestId: string, updates: Partial<CitizenPickupRequest>) {
  await delay(300)

  try {
    const requestIndex = mockCitizenPickupRequests.findIndex((req) => req.request_id === requestId)
    if (requestIndex === -1) {
      return { data: null, error: "Citizen request not found" }
    }

    mockCitizenPickupRequests[requestIndex] = {
      ...mockCitizenPickupRequests[requestIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    }

    // Also update the corresponding pickup request if it exists
    const pickupRequestIndex = mockPickupRequests.findIndex((req) => req.request_id === requestId)
    if (pickupRequestIndex !== -1) {
      mockPickupRequests[pickupRequestIndex] = {
        ...mockPickupRequests[pickupRequestIndex],
        status: updates.status || mockPickupRequests[pickupRequestIndex].status,
        vendor_name: updates.vendor_name || mockPickupRequests[pickupRequestIndex].vendor_name,
        vendor_contact: updates.vendor_contact || mockPickupRequests[pickupRequestIndex].vendor_contact,
        updated_at: new Date().toISOString(),
      }
    }

    return { data: mockCitizenPickupRequests[requestIndex], error: null }
  } catch (error) {
    return { data: null, error: "Failed to update citizen pickup request" }
  }
}

export async function getUserProfile(userId: string) {
  await delay(400)

  try {
    const profile = mockUserProfiles.find((profile) => profile.user_id === userId)
    if (!profile) {
      return { data: null, error: "User profile not found" }
    }

    return { data: profile, error: null }
  } catch (error) {
    return { data: null, error: "Failed to fetch user profile" }
  }
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  await delay(300)

  try {
    const profileIndex = mockUserProfiles.findIndex((profile) => profile.user_id === userId)
    if (profileIndex === -1) {
      // Create new profile if it doesn't exist
      const newProfile: UserProfile = {
        user_id: userId,
        ...updates,
      }
      mockUserProfiles.push(newProfile)
      return { data: newProfile, error: null }
    }

    mockUserProfiles[profileIndex] = {
      ...mockUserProfiles[profileIndex],
      ...updates,
    }

    return { data: mockUserProfiles[profileIndex], error: null }
  } catch (error) {
    return { data: null, error: "Failed to update user profile" }
  }
}

export async function getBins() {
  await delay(600)

  try {
    return { data: mockBins, error: null }
  } catch (error) {
    return { data: null, error: "Failed to fetch bins" }
  }
}

export async function updateBin(binId: string, updates: Partial<Bin>) {
  await delay(300)

  try {
    const binIndex = mockBins.findIndex((bin) => bin.bin_id === binId)
    if (binIndex === -1) {
      return { data: null, error: "Bin not found" }
    }

    mockBins[binIndex] = {
      ...mockBins[binIndex],
      ...updates,
      last_updated: new Date().toISOString(),
    }

    return { data: mockBins[binIndex], error: null }
  } catch (error) {
    return { data: null, error: "Failed to update bin" }
  }
}

// Compatibility wrapper for getVendors
export async function getVendors() {
  return getVendorsApi()
}

export async function getVendorsApi() {
  await delay(500)

  try {
    return { data: mockVendors, error: null }
  } catch (error) {
    return { data: null, error: "Failed to fetch vendors" }
  }
}

export async function updateVendor(vendorId: string, updates: Partial<Vendor>) {
  await delay(300)

  try {
    const vendorIndex = mockVendors.findIndex((vendor) => vendor.vendor_id === vendorId)
    if (vendorIndex === -1) {
      return { data: null, error: "Vendor not found" }
    }

    mockVendors[vendorIndex] = {
      ...mockVendors[vendorIndex],
      ...updates,
    }

    return { data: mockVendors[vendorIndex], error: null }
  } catch (error) {
    return { data: null, error: "Failed to update vendor" }
  }
}

// Mock implementation for createBid
export async function createBid(bidData: {
  request_id: string
  vendor_id: string
  bid_amount: number
  message?: string
}) {
  await delay(300)

  try {
    // In a real implementation, this would store the bid in a database
    const bid = {
      bid_id: generateId("bid"),
      ...bidData,
      created_at: new Date().toISOString(),
      status: "pending",
    }

    console.log("Bid created:", bid)
    return { data: bid, error: null }
  } catch (error) {
    return { data: null, error: "Failed to create bid" }
  }
}

// Export all functions as default for compatibility
export default {
  getPickupRequests,
  getCitizenPickupRequests,
  createPickupRequest,
  updatePickupRequest,
  updateCitizenPickupRequest,
  getUserProfile,
  updateUserProfile,
  getBins,
  updateBin,
  getVendors,
  getVendorsApi,
  updateVendor,
  createBid,
}
