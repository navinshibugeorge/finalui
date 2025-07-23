"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Truck,
  DollarSign,
  Clock,
  CheckCircle,
  MapPin,
  Building,
  Camera,
  AlertCircle,
  Bell,
  Timer,
  User,
  Loader2,
  Gavel,
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/components/auth-provider"
import { createBid } from "@/lib/aws-api"
import { useToast } from "@/hooks/use-toast"
import { pickupRequestService } from "@/lib/pickup-request-service"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface VendorProfile {
  vendor_id: string
  name: string
  collecting_waste_types: string[]
  registered_waste_types: string[]
  contact: string
  location: string
}

export function VendorDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeRequests, setActiveRequests] = useState<any[]>([])
  const [myJobs, setMyJobs] = useState<any[]>([])
  const [completedJobs, setCompletedJobs] = useState<any[]>([])
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBidModal, setShowBidModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [bidAmount, setBidAmount] = useState("")
  const [bidMessage, setBidMessage] = useState("")
  const [submittingBid, setSubmittingBid] = useState(false)
  const [timers, setTimers] = useState<{ [key: string]: number }>({})
  
  // Debug state for testing
  const [debugMode, setDebugMode] = useState(true)
  const [availableVendors, setAvailableVendors] = useState<any[]>([])
  const [selectedTestVendor, setSelectedTestVendor] = useState<string>("")

  // Centralized waste calculation constants
  const WASTE_MARKET_RATES: { [key: string]: number } = {
    plastic: 25,      // ₹25/kg
    metal: 45,        // ₹45/kg
    glass: 8,         // ₹8/kg
    paper: 12,        // ₹12/kg
    organic: 5,       // ₹5/kg
    electronic: 180,  // ₹180/kg
    'e-waste': 180,   // ₹180/kg
    mixed: 15         // ₹15/kg average
  }

  const WASTE_DENSITY_MAP: { [key: string]: number } = {
    plastic: 0.3,     // 0.3 kg/L
    metal: 2.5,       // 2.5 kg/L
    glass: 1.5,       // 1.5 kg/L
    paper: 0.4,       // 0.4 kg/L
    organic: 0.8,     // 0.8 kg/L
    electronic: 1.2,  // 1.2 kg/L
    'e-waste': 1.2,   // 1.2 kg/L
    mixed: 0.6        // 0.6 kg/L average
  }

  // Function to calculate waste market value
  const calculateWasteDetails = (wasteType: string, quantityLiters: number) => {
    const wasteTypeKey = wasteType.toLowerCase()
    const ratePerKg = WASTE_MARKET_RATES[wasteTypeKey] || WASTE_MARKET_RATES.mixed
    const density = WASTE_DENSITY_MAP[wasteTypeKey] || WASTE_DENSITY_MAP.mixed
    const weightKg = Math.round(quantityLiters * density * 10) / 10 // Round to 1 decimal
    const marketValue = Math.round(weightKg * ratePerKg)
    const baseBid = marketValue // Direct market value without margin
    
    return {
      wasteTypeKey,
      ratePerKg,
      density,
      weightKg,
      marketValue,
      baseBid
    }
  }

  // Function to map industry waste types to vendor collecting waste types
  const mapWasteType = (industryWasteType: string): string => {
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
  }

  // Fetch vendor profile from backend
  const fetchVendorProfile = async (vendorId?: string) => {
    try {
      const targetVendorId = vendorId || user?.id
      if (!targetVendorId) {
        console.log('No vendor ID available')
        return
      }
      
      console.log('Fetching vendor profile for vendor ID:', targetVendorId)
      
      const supabase = createClientComponentClient()
      
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('vendor_id', targetVendorId)
        .single()

      if (error) {
        console.warn('Could not fetch vendor profile:', error)
        
        // If no vendor profile exists, let's check if we can create one or show helpful info
        console.log('Checking if vendor record exists in database...')
        const { data: allVendors, error: allVendorsError } = await supabase
          .from('vendors')
          .select('vendor_id, name, collecting_waste_types, email')
          .limit(10)
          
        if (!allVendorsError && allVendors) {
          console.log('Sample vendors in database:', allVendors)
          setAvailableVendors(allVendors)
        }
        
        return
      }

      if (data) {
        console.log('Vendor profile loaded:', {
          vendor_id: data.vendor_id,
          name: data.name,
          collecting_waste_types: data.collecting_waste_types
        })
        
        setVendorProfile({
          vendor_id: data.vendor_id,
          name: data.name,
          registered_waste_types: data.registered_waste_types || [],
          collecting_waste_types: data.collecting_waste_types || [],
          contact: data.contact,
          location: data.address || 'Not specified'
        })
      }
    } catch (error) {
      console.error('Error fetching vendor profile:', error)
    }
  }

  // Fetch active pickup requests (industry bins >= 80% full with 5 min bidding window)
  const fetchActiveRequests = async () => {
    try {
      if (!vendorProfile?.collecting_waste_types?.length) {
        console.log('No collecting waste types configured for vendor')
        setActiveRequests([])
        return
      }
      
      console.log('Vendor collecting waste types:', vendorProfile.collecting_waste_types)
      
      // Get all active pickup requests from industry bins >= 80% full
      const data = await pickupRequestService.getActivePickupRequests()
      console.log('All active pickup requests:', data.length)
      
      // Filter requests for this vendor's waste types with 5-minute bidding window
      const vendorRequests = data
        .filter(req => {
          const mappedWasteType = mapWasteType(req.waste_type)
          const isCompatible = vendorProfile.collecting_waste_types.includes(mappedWasteType)
          const isActive = req.status === 'pending' && new Date(req.bidding_ends_at) > new Date()
          
          console.log(`Request ${req.request_id}: ${req.waste_type} -> ${mappedWasteType}, Compatible: ${isCompatible}, Active: ${isActive}`)
          
          return isCompatible && isActive
        })
        .map(req => {
          // Calculate base bid if not present using centralized function
          const calculateBaseBid = (wasteType: string, quantityLiters: number): number => {
            const details = calculateWasteDetails(wasteType, quantityLiters)
            return details.baseBid
          }
          
          const baseBid = req.base_bid || calculateBaseBid(req.waste_type, req.estimated_quantity)
          
          // Calculate current highest bid and total bids from vendor_bids array
          const activeBids = req.vendor_bids?.filter((bid: any) => bid.status === 'active') || []
          const highestBid = activeBids.length > 0 ? Math.max(...activeBids.map((bid: any) => bid.bid_amount)) : 0
          const totalBids = activeBids.length
          
          return {
            request_id: req.request_id,
            industry_name: req.factory_name || req.industry_name,
            bin_id: req.bin_id,
            waste_type: req.waste_type,
            fill_level: req.fill_level || 85, // >= 80% triggers the request
            estimated_quantity: req.estimated_quantity,
            location: req.factory_address || 'Not specified',
            coordinates: req.coordinates || "0, 0",
            created_at: req.created_at,
            bidding_ends_at: req.bidding_ends_at,
            status: req.status,
            current_highest_bid: highestBid,
            total_bids: totalBids,
            base_bid: baseBid,
            vendor_bids: activeBids,
            waste_image: `/placeholder.svg?height=200&width=300&text=${req.waste_type.toUpperCase()}+WASTE`,
          }
        })
      
      console.log(`Found ${vendorRequests.length} active requests for vendor`)
      setActiveRequests(vendorRequests)
      
      // Initialize timers for bidding countdown (5 minutes)
      const initialTimers: { [key: string]: number } = {}
      vendorRequests.forEach((req) => {
        const timeLeft = Math.max(0, Math.floor((new Date(req.bidding_ends_at).getTime() - Date.now()) / 1000))
        initialTimers[req.request_id] = timeLeft
      })
      setTimers(initialTimers)
      
    } catch (error) {
      console.error('Error fetching active requests:', error)
      setActiveRequests([])
    }
  }

  useEffect(() => {
    fetchVendorProfile()
  }, [user])

  useEffect(() => {
    if (vendorProfile) {
      fetchActiveRequests()
      fetchMyJobs()
    }
  }, [vendorProfile])

  // Fetch assigned and completed jobs
  const fetchMyJobs = async () => {
    try {
      const data = await pickupRequestService.getActivePickupRequests()
      
      // Filter for jobs assigned to this vendor
      const assignedJobs = data.filter(req => 
        req.assigned_vendor === vendorProfile?.vendor_id && 
        (req.status === 'assigned' || req.status === 'bidding')
      )
      
      const completedJobs = data.filter(req => 
        req.assigned_vendor === vendorProfile?.vendor_id && 
        req.status === 'completed'
      )
      
      setMyJobs(assignedJobs)
      setCompletedJobs(completedJobs)
      
    } catch (error) {
      console.error('Error fetching jobs:', error)
      setMyJobs([])
      setCompletedJobs([])
    } finally {
      setLoading(false)
    }
  }

  // Set up intervals for real-time updates
  useEffect(() => {
    if (!user || !vendorProfile) return

    const activeRequestsInterval = setInterval(fetchActiveRequests, 30000) // Check every 30 seconds
    const jobsInterval = setInterval(fetchMyJobs, 60000) // Check every minute

    return () => {
      clearInterval(activeRequestsInterval)
      clearInterval(jobsInterval)
    }
  }, [user, vendorProfile])

  // Real-time bid updates - more frequent for active bidding
  useEffect(() => {
    if (!user || !vendorProfile || activeRequests.length === 0) return

    const updateBidData = async () => {
      try {
        const data = await pickupRequestService.getActivePickupRequests()
        
        // Update requests with latest bid information
        setActiveRequests(prevRequests => 
          prevRequests.map(request => {
            const updated = data.find(r => r.request_id === request.request_id)
            if (updated) {
              // Calculate current highest bid and total bids from vendor_bids array
              const activeBids = updated.vendor_bids?.filter((bid: any) => bid.status === 'active') || []
              const highestBid = activeBids.length > 0 ? Math.max(...activeBids.map((bid: any) => bid.bid_amount)) : 0
              const totalBids = activeBids.length

              // Check if bid data has changed
              if (
                highestBid !== request.current_highest_bid ||
                totalBids !== request.total_bids
              ) {
                console.log(`Bid update for request ${request.request_id}: highest bid ${highestBid}, total bids ${totalBids}`)
              }
              
              return { 
                ...request, 
                current_highest_bid: highestBid,
                total_bids: totalBids,
                vendor_bids: activeBids,
                // Update other fields that might have changed
                status: updated.status,
                bidding_ends_at: updated.bidding_ends_at
              }
            }
            return request
          })
        )
      } catch (error) {
        console.error('Error updating bid data:', error)
      }
    }

    // Update bid data every 10 seconds for active bidding
    const bidUpdateInterval = setInterval(updateBidData, 10000)

    return () => {
      clearInterval(bidUpdateInterval)
    }
  }, [user, vendorProfile, activeRequests.length])

  // Handle automatic winner selection when timer expires
  const handleTimerExpired = async (requestId: string) => {
    try {
      const service = await import('@/lib/pickup-request-service')
      const result = await service.selectBidWinner(requestId)
      
      if (result) {
        // Refresh data to show updated status
        await fetchActiveRequests()
        await fetchMyJobs()
        
        // Check if this vendor won the bid
        const updatedJobs = await pickupRequestService.getActivePickupRequests()
        const wonJob = updatedJobs.find(job => 
          job.request_id === requestId && 
          job.assigned_vendor === vendorProfile?.vendor_id &&
          job.status === 'assigned'
        )
        
        if (wonJob) {
          // Show winning notification
          setTimeout(() => {
            toast({
              title: "🎉 Congratulations! You Won!",
              description: `You've been assigned the pickup job for ₹${wonJob.winning_bid || wonJob.base_bid}. Check "My Jobs" tab for details.`,
              variant: "default",
            })
          }, 100)
        } else {
          // Show general closure notification
          setTimeout(() => {
            toast({
              title: "Bidding Closed",
              description: "Bidding window has ended. Winner has been selected automatically.",
              variant: "default",
            })
          }, 100)
        }
      }
    } catch (error) {
      console.error('Error selecting winner:', error)
      setTimeout(() => {
        toast({
          title: "Bidding Closed",
          description: "Bidding window has ended. Winner will be selected automatically.",
          variant: "default",
        })
      }, 100)
    }
  }

  // Timer countdown effect for bidding windows
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prevTimers) => {
        const newTimers = { ...prevTimers }
        let hasChanges = false
        const expiredRequestIds: string[] = []

        Object.keys(newTimers).forEach((requestId) => {
          if (newTimers[requestId] > 0) {
            newTimers[requestId] -= 1
            hasChanges = true
          } else if (newTimers[requestId] === 0) {
            // Mark timer as expired but don't call toast here
            expiredRequestIds.push(requestId)
            newTimers[requestId] = -1 // Mark as expired
            hasChanges = true
          }
        })

        // Handle expired timers outside of state update
        if (expiredRequestIds.length > 0) {
          setTimeout(() => {
            expiredRequestIds.forEach(async (requestId) => {
              // Trigger winner selection when timer expires
              await handleTimerExpired(requestId)
              
              setActiveRequests((prev) =>
                prev.filter((req) => req.request_id !== requestId)
              )
            })
          }, 0)
        }

        return hasChanges ? newTimers : prevTimers
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Calculate total earnings from completed jobs
  const calculateTotalEarnings = (): string => {
    const completedEarnings = completedJobs.reduce((total, job) => {
      return total + (job.winning_bid || job.base_bid || 0)
    }, 0)
    
    return completedEarnings.toFixed(0)
  }

  // Place bid on active request
  const handlePlaceBid = (request: any) => {
    setSelectedRequest(request)
    setShowBidModal(true)
  }

  // Submit bid for pickup request
  const handleSubmitBid = async () => {
    if (!bidAmount || !selectedRequest) {
      toast({
        title: "Missing Information",
        description: "Please enter a bid amount",
        variant: "destructive",
      })
      return
    }

    // Validate bid amount
    const bidAmountNum = Number.parseFloat(bidAmount)
    
    // Calculate base bid if not present using centralized function
    let baseBid = selectedRequest.base_bid
    if (!baseBid || baseBid === 0) {
      const details = calculateWasteDetails(selectedRequest.waste_type, selectedRequest.estimated_quantity)
      baseBid = details.baseBid
    }
    
    const minimumBid = Math.max(baseBid, (selectedRequest.current_highest_bid || 0) + 10)

    if (bidAmountNum < minimumBid) {
      toast({
        title: "Bid Too Low",
        description: `Your bid must be at least ₹${minimumBid} (Base: ₹${baseBid}, Current highest: ₹${selectedRequest.current_highest_bid || 0})`,
        variant: "destructive",
      })
      return
    }

    setSubmittingBid(true)
    try {
      if (!vendorProfile?.vendor_id) {
        console.error('Vendor ID not found')
        return
      }
      
      const response = await createBid({
        request_id: selectedRequest.request_id,
        vendor_id: vendorProfile.vendor_id,
        bid_amount: bidAmountNum,
        message: bidMessage,
      })

      if (response.error) {
        throw new Error(response.error)
      }

      toast({
        title: "Bid Placed Successfully! 💰",
        description: `Your bid of ₹${bidAmount} has been placed. You'll be notified if you win!`,
      })

      setBidAmount("")
      setBidMessage("")
      setShowBidModal(false)
      setSelectedRequest(null)
      
      // Refresh active requests immediately to show updated bid info
      await fetchActiveRequests()
      
      // Also force a real-time update after a short delay to ensure bid is properly stored
      setTimeout(async () => {
        try {
          const data = await pickupRequestService.getActivePickupRequests()
          setActiveRequests(prevRequests => 
            prevRequests.map(request => {
              const updated = data.find(r => r.request_id === selectedRequest.request_id)
              if (updated) {
                const activeBids = updated.vendor_bids?.filter((bid: any) => bid.status === 'active') || []
                const highestBid = activeBids.length > 0 ? Math.max(...activeBids.map((bid: any) => bid.bid_amount)) : 0
                const totalBids = activeBids.length
                
                return { 
                  ...request, 
                  current_highest_bid: highestBid,
                  total_bids: totalBids,
                  vendor_bids: activeBids
                }
              }
              return request
            })
          )
        } catch (error) {
          console.error('Error refreshing bid data:', error)
        }
      }, 2000) // Wait 2 seconds for the bid to be processed
    } catch (error: any) {
      toast({
        title: "Bid Failed",
        description: error.message || "Failed to submit bid",
        variant: "destructive",
      })
    } finally {
      setSubmittingBid(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "assigned":
        return "bg-blue-100 text-blue-800"
      case "in_progress":
        return "bg-purple-100 text-purple-800"
      case "completed":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "assigned":
        return <Truck className="h-4 w-4" />
      case "in_progress":
        return <MapPin className="h-4 w-4" />
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <DashboardLayout title="Vendor Dashboard" userRole="vendor">
      <div className="space-y-6">
        {/* Debug Mode Section */}
        {debugMode && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-lg text-yellow-800">🔧 Debug Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-yellow-700 mb-2">Current user ID: {user?.id || 'Not logged in'}</p>
                <p className="text-sm text-yellow-700 mb-2">Vendor profile loaded: {vendorProfile ? '✅ Yes' : '❌ No'}</p>
                {vendorProfile && (
                  <div className="bg-white p-3 rounded border">
                    <p><strong>Name:</strong> {vendorProfile.name}</p>
                    <p><strong>ID:</strong> {vendorProfile.vendor_id}</p>
                    <p><strong>Waste Types:</strong> {vendorProfile.collecting_waste_types.join(', ') || 'None'}</p>
                    <p><strong>Active Requests:</strong> {activeRequests.length}</p>
                  </div>
                )}
              </div>
              
              {availableVendors.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Test as vendor:</label>
                  <div className="flex gap-2">
                    <select 
                      value={selectedTestVendor} 
                      onChange={(e) => setSelectedTestVendor(e.target.value)}
                      className="flex-1 border rounded px-3 py-2"
                    >
                      <option value="">Select a vendor...</option>
                      {availableVendors.map(vendor => (
                        <option key={vendor.vendor_id} value={vendor.vendor_id}>
                          {vendor.name} ({vendor.email}) - {vendor.collecting_waste_types?.join(', ')}
                        </option>
                      ))}
                    </select>
                    <Button 
                      onClick={() => selectedTestVendor && fetchVendorProfile(selectedTestVendor)}
                      disabled={!selectedTestVendor}
                    >
                      Load Vendor
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchActiveRequests()}
                >
                  🔄 Refresh Requests
                </Button>
                <Button onClick={() => setDebugMode(false)} size="sm" variant="outline">
                  Hide Debug
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!debugMode && (
          <Button onClick={() => setDebugMode(true)} size="sm" variant="outline">
            Show Debug
          </Button>
        )}
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Bidding</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{activeRequests.length}</div>
              <p className="text-xs text-muted-foreground">Bins ready for pickup</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Jobs</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{myJobs.length}</div>
              <p className="text-xs text-muted-foreground">Assigned pickups</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedJobs.length}</div>
              <p className="text-xs text-muted-foreground">Jobs completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{calculateTotalEarnings()}</div>
              <p className="text-xs text-muted-foreground">Total earned</p>
            </CardContent>
          </Card>
        </div>

        {/* Vendor Profile Info */}
        {vendorProfile && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-green-600" />
                  Vendor Profile - {vendorProfile.name}
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchActiveRequests}
                    disabled={loading}
                  >
                    {loading ? "Refreshing..." : "Refresh Requests"}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fetchVendorProfile()}
                    disabled={loading}
                  >
                    {loading ? "Refreshing..." : "Refresh Profile"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium">Contact</p>
                  <p className="text-muted-foreground">{vendorProfile.contact}</p>
                </div>
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-muted-foreground">{vendorProfile.location}</p>
                </div>
                <div>
                  <p className="font-medium">Collecting Waste Types</p>
                  <p className="text-muted-foreground">
                    {vendorProfile.collecting_waste_types?.length ? 
                      vendorProfile.collecting_waste_types.join(", ") : 
                      "None configured"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug Info */}
        {!vendorProfile && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>No vendor profile found!</strong> Make sure you are signed up as a vendor with collecting waste types configured.
              <br />
              <span className="text-sm">Current user ID: {user?.id || 'Not available'}</span>
              <br />
              <span className="text-sm">You need to sign up as a vendor through the signup form to receive notifications.</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Debug Section for Active Development */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                🐛 Debug Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">User Info</p>
                  <p className="text-muted-foreground">ID: {user?.id || 'Not logged in'}</p>
                  <p className="text-muted-foreground">Email: {user?.email || 'Not available'}</p>
                </div>
                <div>
                  <p className="font-medium">Vendor Profile Status</p>
                  <p className="text-muted-foreground">{vendorProfile ? '✅ Loaded' : '❌ Not found'}</p>
                  {vendorProfile && (
                    <p className="text-muted-foreground">
                      Waste Types: {vendorProfile.collecting_waste_types?.join(', ') || 'None'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="font-medium">Active Requests</p>
                  <p className="text-muted-foreground">Total: {activeRequests.length}</p>
                </div>
                <div>
                  <p className="font-medium">Notifications</p>
                  <p className="text-muted-foreground">Active: {activeRequests.length}</p>
                </div>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    console.log('=== DEBUG INFO ===')
                    console.log('User:', user)
                    console.log('Vendor Profile:', vendorProfile)
                    console.log('Pickup Requests:', activeRequests)
                    console.log('My Jobs:', myJobs)
                    console.log('Completed Jobs:', completedJobs)
                  }}
                >
                  Log Debug Info
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={async () => {
                    console.log('Testing vendor selection...')
                    const testBinData = {
                      binId: 'TEST_BIN_001',
                      factoryId: 'test_factory',
                      wasteType: 'plastic',
                      fillLevel: 85,
                      location: 'Test Location',
                      industryName: 'Test Industry'
                    }
                    
                    try {
                      const { vendorSelectionAlgorithm } = await import('@/lib/vendor-selection-algorithm')
                      const results = await vendorSelectionAlgorithm.processBinAlert(testBinData)
                      console.log('Vendor selection results:', results)
                      
                      toast({
                        title: "Test Complete",
                        description: `Found ${results.length} compatible vendors. Check console for details.`,
                      })
                    } catch (error: any) {
                      console.error('Test failed:', error)
                      toast({
                        title: "Test Failed", 
                        description: error?.message || 'Unknown error occurred',
                        variant: "destructive"
                      })
                    }
                  }}
                >
                  Test Vendor Selection
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Requests Alert */}
        {activeRequests.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <Bell className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>{activeRequests.length} active bidding window(s)</strong> - Industry bins are ready for pickup! Place your bids before the 5-minute window closes.
            </AlertDescription>
          </Alert>
        )}

        {/* Assigned Jobs Alert */}
        {myJobs.length > 0 && (
          <Alert className="border-blue-200 bg-blue-50">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>🎉 You have {myJobs.length} assigned job(s)!</strong> Check the "My Jobs" tab to view pickup details and complete your assignments.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="active-bidding" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active-bidding">
              Active Bidding{" "}
              {activeRequests.length > 0 && (
                <Badge className="ml-2 bg-orange-500 text-white">{activeRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="my-jobs">
              My Jobs{" "}
              {myJobs.length > 0 && (
                <Badge className="ml-2 bg-blue-500 text-white">{myJobs.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">Completed Jobs</TabsTrigger>
          </TabsList>

          <TabsContent value="active-bidding" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Active Bidding Windows</h3>
                <p className="text-sm text-muted-foreground">
                  Industry bins (≥80% full) with 5-minute bidding windows. Highest bid wins!
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchActiveRequests}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            <div className="grid gap-4">
              {loading ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading active bidding windows...</p>
                  </CardContent>
                </Card>
              ) : activeRequests.length > 0 ? (
                activeRequests.map((request) => (
                  <Card key={request.request_id} className="border-orange-200 bg-orange-50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Bell className="h-5 w-5 text-orange-600" />
                          {request.industry_name} - {request.waste_type.charAt(0).toUpperCase() + request.waste_type.slice(1)} Waste
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-orange-100 text-orange-800">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              BIDDING
                            </div>
                          </Badge>
                          <div className="flex items-center gap-1 text-sm font-bold text-red-600">
                            <Timer className="h-4 w-4" />
                            {formatTime(timers[request.request_id] || 0)}
                          </div>
                        </div>
                      </div>
                      <CardDescription>
                        Bin {request.bin_id} • {request.location} • Posted: {new Date(request.created_at).toLocaleTimeString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column - Details */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="p-3 bg-white rounded-lg border">
                              <p className="font-medium flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                Fill Level
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Progress value={request.fill_level} className="flex-1 h-2" />
                                <span className="text-xs font-semibold">{request.fill_level}%</span>
                              </div>
                            </div>
                            <div className="p-3 bg-white rounded-lg border">
                              <p className="font-medium">Estimated Quantity</p>
                              <p className="text-muted-foreground font-semibold">{request.estimated_quantity}L</p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border">
                              <p className="font-medium">Current Highest Bid</p>
                              <p className="text-green-600 font-bold">₹{request.current_highest_bid || 'No bids yet'}</p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border">
                              <p className="font-medium">Total Bids</p>
                              <p className="text-blue-600 font-semibold">{request.total_bids || 0} bid(s)</p>
                            </div>
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handlePlaceBid(request)}
                              disabled={timers[request.request_id] <= 0}
                            >
                              <DollarSign className="mr-2 h-4 w-4" />
                              {timers[request.request_id] <= 0 ? 'Bidding Closed' : 'Place Bid'}
                            </Button>
                            <Button variant="outline" size="sm">
                              <MapPin className="mr-2 h-4 w-4" />
                              View Location
                            </Button>
                          </div>

                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800">
                              <AlertCircle className="inline h-4 w-4 mr-1" />
                              Bidding window: {formatTime(timers[request.request_id] || 0)} remaining. 
                              Highest bidder will be selected automatically when timer expires.
                            </p>
                          </div>
                        </div>

                        {/* Right Column - Waste Image */}
                        <div className="space-y-4">
                          <div>
                            <p className="font-medium text-sm mb-2 flex items-center gap-1">
                              <Camera className="h-4 w-4" />
                              Waste Image
                            </p>
                            <div className="w-full h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                              <img
                                src={request.waste_image}
                                alt={`${request.waste_type} waste`}
                                className="w-full h-full object-cover rounded-lg"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = "none"
                                  target.nextElementSibling?.classList.remove("hidden")
                                }}
                              />
                              <div className="hidden flex-col items-center justify-center text-gray-500">
                                <Camera className="h-8 w-8 mb-2" />
                                <span className="text-sm">{request.waste_type.toUpperCase()} WASTE</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No active bidding windows</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      You'll receive notifications when industry bins reach 80% capacity
                    </p>
                    {vendorProfile && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-2">
                        <p className="text-sm text-muted-foreground">
                          <strong>Your collecting waste types:</strong>{" "}
                          {vendorProfile.collecting_waste_types?.length ? 
                            vendorProfile.collecting_waste_types.join(", ") : 
                            "None configured"
                          }
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="my-jobs" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">My Assigned Jobs</h3>
                <p className="text-sm text-muted-foreground">
                  Pickup requests won through bidding and assigned to you
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMyJobs}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            <div className="grid gap-4">
              {loading ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading assigned jobs...</p>
                  </CardContent>
                </Card>
              ) : myJobs.length > 0 ? (
                myJobs.map((job) => (
                  <Card key={job.request_id} className="border-blue-200 bg-blue-50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Truck className="h-5 w-5 text-blue-600" />
                          {job.industry_name} - {job.waste_type.charAt(0).toUpperCase() + job.waste_type.slice(1)} Pickup
                        </CardTitle>
                        <Badge className={getStatusColor(job.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(job.status)}
                            {job.status.toUpperCase()}
                          </div>
                        </Badge>
                      </div>
                      <CardDescription>
                        Bin {job.bin_id} • {job.location} • Winning Bid: ₹{job.winning_bid_amount || job.winning_bid}
                        {job.assigned_at && (
                          <span className="block text-green-600 text-sm mt-1">
                            🎉 Assigned on {new Date(job.assigned_at).toLocaleString()}
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="p-3 bg-white rounded-lg border">
                              <p className="font-medium">Waste Type</p>
                              <p className="text-muted-foreground capitalize">{job.waste_type}</p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border">
                              <p className="font-medium">Quantity</p>
                              <p className="text-muted-foreground">{job.estimated_quantity}L</p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border">
                              <p className="font-medium">Your Winning Bid</p>
                              <p className="text-green-600 font-bold">₹{job.winning_bid_amount || job.winning_bid}</p>
                              <p className="text-xs text-muted-foreground">
                                {job.total_bids ? `Beat ${job.total_bids - 1} other bid(s)` : 'Won the auction'}
                              </p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border">
                              <p className="font-medium">Status</p>
                              <p className="text-muted-foreground capitalize">{job.status}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark Complete
                            </Button>
                            <Button variant="outline" size="sm">
                              <MapPin className="mr-2 h-4 w-4" />
                              View Location
                            </Button>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-sm mb-2">Pickup Location</p>
                          <p className="text-sm text-muted-foreground">{job.location}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No assigned jobs</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Win bidding windows to get pickup jobs assigned to you
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Completed Jobs</h3>
                <p className="text-sm text-muted-foreground">
                  Successfully completed pickup jobs and earnings
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMyJobs}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            <div className="grid gap-4">
              {loading ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading completed jobs...</p>
                  </CardContent>
                </Card>
              ) : completedJobs.length > 0 ? (
                completedJobs.map((job) => (
                  <Card key={job.request_id} className="border-green-200 bg-green-50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          {job.industry_name} - {job.waste_type.charAt(0).toUpperCase() + job.waste_type.slice(1)} ✅
                        </CardTitle>
                        <Badge className="bg-green-100 text-green-800">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            COMPLETED
                          </div>
                        </Badge>
                      </div>
                      <CardDescription>
                        Completed on {new Date(job.completed_at || job.updated_at).toLocaleDateString()} • Earned: ₹{job.winning_bid_amount || job.winning_bid}
                        {job.assigned_at && (
                          <span className="block text-muted-foreground text-xs mt-1">
                            Originally assigned on {new Date(job.assigned_at).toLocaleDateString()}
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="p-3 bg-white rounded-lg border">
                          <p className="font-medium">Waste Type</p>
                          <p className="text-muted-foreground capitalize">{job.waste_type}</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg border">
                          <p className="font-medium">Quantity Collected</p>
                          <p className="text-muted-foreground">{job.estimated_quantity}L</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg border">
                          <p className="font-medium">Payment Received</p>
                          <p className="text-green-600 font-bold">₹{job.winning_bid_amount || job.winning_bid}</p>
                          <p className="text-xs text-muted-foreground">Auction winner</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No completed jobs yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Complete assigned pickup jobs to see them here
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bid Modal */}
      <Dialog open={showBidModal} onOpenChange={setShowBidModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Place Your Bid</DialogTitle>
            <DialogDescription>
              Submit your bid for this pickup request from{" "}
              {selectedRequest?.industry_name || selectedRequest?.company_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRequest && (
              <div className="space-y-3">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">📋 Request Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Industry:</span>
                      <p className="text-muted-foreground">{selectedRequest.industry_name}</p>
                    </div>
                    <div>
                      <span className="font-medium">Waste Type:</span>
                      <p className="text-muted-foreground capitalize">{selectedRequest.waste_type}</p>
                    </div>
                    <div>
                      <span className="font-medium">Quantity:</span>
                      <p className="text-muted-foreground">{selectedRequest.estimated_quantity}L</p>
                    </div>
                    <div>
                      <span className="font-medium">Time Left:</span>
                      <p className="text-red-600 font-semibold">{formatTime(timers[selectedRequest.request_id] || 0)}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-orange-900 mb-2">💰 Bidding Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Base Bid (Market Rate):</span>
                      <span className="text-blue-600 font-bold">₹{selectedRequest.base_bid || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Current Highest Bid:</span>
                      <span className="text-green-600 font-bold">
                        {selectedRequest.current_highest_bid > 0 ? `₹${selectedRequest.current_highest_bid}` : 'No bids yet'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Total Bids:</span>
                      <span className="text-purple-600 font-bold">{selectedRequest.total_bids || 0}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 mt-2">
                      <span className="font-medium">Minimum Next Bid:</span>
                      <span className="text-red-600 font-bold">
                        ₹{Math.max(selectedRequest.base_bid || 0, (selectedRequest.current_highest_bid || 0) + 10)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="bid-amount" className="text-base font-semibold">Your Bid Amount (₹)</Label>
              <div className="space-y-2">
                <Input
                  id="bid-amount"
                  type="number"
                  placeholder={`Minimum: ₹${(() => {
                    if (!selectedRequest) return 0
                    let baseBid = selectedRequest.base_bid
                    if (!baseBid || baseBid === 0) {
                      const details = calculateWasteDetails(selectedRequest.waste_type, selectedRequest.estimated_quantity)
                      baseBid = details.baseBid
                    }
                    return Math.max(baseBid, (selectedRequest.current_highest_bid || 0) + 10)
                  })()}`}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  min={(() => {
                    if (!selectedRequest) return 0
                    let baseBid = selectedRequest.base_bid
                    if (!baseBid || baseBid === 0) {
                      const details = calculateWasteDetails(selectedRequest.waste_type, selectedRequest.estimated_quantity)
                      baseBid = details.baseBid
                    }
                    return Math.max(baseBid, (selectedRequest.current_highest_bid || 0) + 10)
                  })()}
                  className="text-lg font-semibold"
                />
                <div className="text-xs space-y-1">
                  <p className="text-muted-foreground">
                    💡 <strong>Tip:</strong> Bid strategically! Higher bids win, but consider the waste value and your profit margin.
                  </p>
                  <p className="text-orange-600">
                    ⏰ <strong>Hurry:</strong> Bidding closes in {formatTime(timers[selectedRequest?.request_id] || 0)}
                  </p>
                  {selectedRequest && (() => {
                    const details = calculateWasteDetails(selectedRequest.waste_type, selectedRequest.estimated_quantity)
                    return (
                      <p className="text-green-600">
                        📊 <strong>Market Value:</strong> Based on ₹{details.ratePerKg}/kg market rate × {details.weightKg}kg = ₹{details.marketValue} (+ 20% service margin = ₹{details.baseBidWithMargin})
                      </p>
                    )
                  })()}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="bid-message">Message (Optional)</Label>
              <Textarea
                id="bid-message"
                placeholder="Add a message to your bid..."
                value={bidMessage}
                onChange={(e) => setBidMessage(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              {selectedRequest && bidAmount && (
                <div className="text-sm p-3 rounded-lg border bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Your Bid:</span>
                    <span className="font-bold text-lg">₹{bidAmount}</span>
                  </div>
                  {(() => {
                    let baseBid = selectedRequest.base_bid
                    if (!baseBid || baseBid === 0) {
                      const details = calculateWasteDetails(selectedRequest.waste_type, selectedRequest.estimated_quantity)
                      baseBid = details.baseBidWithMargin
                    }
                    const minimumBid = Math.max(baseBid, (selectedRequest.current_highest_bid || 0) + 10)
                    
                    if (parseFloat(bidAmount) < minimumBid) {
                      return (
                        <p className="text-red-600 text-xs mt-2">
                          ❌ Bid too low! Minimum required: ₹{minimumBid}
                        </p>
                      )
                    } else {
                      return (
                        <p className="text-green-600 text-xs mt-2">
                          ✅ Valid bid! You'll be {parseFloat(bidAmount) > (selectedRequest.current_highest_bid || 0) ? 'the highest bidder' : 'in the running'}
                        </p>
                      )
                    }
                  })()}
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowBidModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitBid} 
                  disabled={!bidAmount || submittingBid || (selectedRequest && (() => {
                    let baseBid = selectedRequest.base_bid
                    if (!baseBid || baseBid === 0) {
                      const details = calculateWasteDetails(selectedRequest.waste_type, selectedRequest.estimated_quantity)
                      baseBid = details.baseBidWithMargin
                    }
                    const minimumBid = Math.max(baseBid, (selectedRequest.current_highest_bid || 0) + 10)
                    return parseFloat(bidAmount) < minimumBid
                  })())}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submittingBid ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Placing Bid...
                    </>
                  ) : (
                    <>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Place Bid
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
