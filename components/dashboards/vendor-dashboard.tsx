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
  Trophy,
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/components/auth-provider"
import { createBid } from "@/lib/aws-api"
import { useToast } from "@/hooks/use-toast"
import { pickupRequestService, type PickupRequest } from "@/lib/pickup-request-service"
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
  const [recentWins, setRecentWins] = useState<any[]>([]) // Track recent auction wins
  
  // Available vendors for testing (removed debug mode)
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
            industry_name: "EcoPlast Industries", // Consistent company name
            bin_id: req.bin_id,
            waste_type: req.waste_type,
            fill_level: req.fill_level || 85, // >= 80% triggers the request
            estimated_quantity: req.estimated_quantity,
            location: "Industrial Area, Sector 18, Noida",
            coordinates: req.coordinates || "28.5355, 77.3910",
            created_at: req.created_at,
            bidding_ends_at: req.bidding_ends_at,
            status: req.status,
            current_highest_bid: highestBid,
            total_bids: totalBids,
            base_bid: baseBid,
            vendor_bids: activeBids,
            waste_image: `/placeholder.svg?height=200&width=300&text=${req.waste_type.toUpperCase()}+WASTE`,
            // Check if current vendor is the highest bidder
            is_highest_bidder: activeBids.some(bid => 
              bid.vendor_id === vendorProfile?.vendor_id && 
              bid.bid_amount === highestBid
            ),
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
        req.status === 'assigned'
      )
      
      const completedJobs = data.filter(req => 
        req.assigned_vendor === vendorProfile?.vendor_id && 
        req.status === 'completed'
      )
      
      // Enhance job data with more details
      const enhancedAssignedJobs = assignedJobs.map(job => ({
        ...job,
        industry_name: job.factory_name || job.industry_name || 'EcoPlast Industries',
        industry_address: job.factory_address || 'Industrial Area, Sector 18, Noida',
        industry_contact: '+91 98765 43210',
        industry_email: 'operations@ecoplast.com',
        winning_bid_amount: job.total_amount || job.estimated_price || job.base_bid,
        assigned_at: job.pickup_date || job.updated_at || job.created_at || new Date().toISOString() // Use pickup_date as assigned time
      }))
      
      const enhancedCompletedJobs = completedJobs.map(job => ({
        ...job,
        industry_name: job.factory_name || job.industry_name || 'EcoPlast Industries',
        industry_address: job.factory_address || 'Industrial Area, Sector 18, Noida',
        winning_bid_amount: job.total_amount || job.estimated_price || job.base_bid,
        completed_at: job.created_at || new Date().toISOString()
      }))
      
      setMyJobs(enhancedAssignedJobs)
      setCompletedJobs(enhancedCompletedJobs)
      
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
    
    // Check for new wins every 30 seconds
    const checkForWinsInterval = setInterval(async () => {
      try {
        const data = await pickupRequestService.getActivePickupRequests()
        
        // Find jobs assigned to this vendor that weren't in myJobs before
        const assignedJobs = data.filter(req => 
          req.assigned_vendor === vendorProfile?.vendor_id && 
          req.status === 'assigned'
        )
        
        // Check for new wins (jobs that exist now but weren't in myJobs before)
        const newWins = assignedJobs.filter(job => 
          !myJobs.some(existingJob => existingJob.request_id === job.request_id)
        )
        
        if (newWins.length > 0) {
          // Add new wins to recent wins display
          const winDetails = newWins.map(job => ({
            request_id: job.request_id,
            waste_type: job.waste_type,
            industry_name: job.industry_name || job.factory_name || 'EcoPlast Industries',
            industry_address: job.factory_address || 'Industrial Area, Sector 18, Noida',
            industry_contact: '+91 98765 43210',
            winning_bid: job.total_amount || job.estimated_price || job.base_bid,
            timestamp: new Date().toISOString()
          }))
          
          setRecentWins(prev => [...prev, ...winDetails])
          
          newWins.forEach(job => {
            toast({
              title: "🎉 NEW BID WIN! 🎉",
              description: `You won the auction for ${job.waste_type} waste at EcoPlast Industries! Payment: ₹${job.total_amount || job.estimated_price || job.base_bid}`,
              duration: 8000,
            })
          })
          
          // Update myJobs immediately
          await fetchMyJobs()
        }
      } catch (error) {
        console.error('Error checking for wins:', error)
      }
    }, 30000)

    return () => {
      clearInterval(activeRequestsInterval)
      clearInterval(jobsInterval)
      clearInterval(checkForWinsInterval)
    }
  }, [user, vendorProfile, myJobs])

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
                bidding_ends_at: updated.bidding_ends_at,
                // Check if current vendor is the highest bidder
                is_highest_bidder: activeBids.some(bid => 
                  bid.vendor_id === vendorProfile?.vendor_id && 
                  bid.bid_amount === highestBid
                ),
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
      console.log(`Timer expired for request ${requestId}, selecting winner...`)
      
      // Import the selectBidWinner function
      const { selectBidWinner } = await import('@/lib/pickup-request-service')
      const result = await selectBidWinner(requestId)
      
      if (result) {
        console.log(`Winner selected successfully for request ${requestId}`)
        
        // Add a small delay to allow database to update before refreshing
        setTimeout(async () => {
          try {
            // Refresh data to show updated status
            await fetchActiveRequests()
            await fetchMyJobs()
            
            // Check if this vendor won the bid
            const updatedRequests = await pickupRequestService.getActivePickupRequests()
            const wonJob = updatedRequests.find(job => 
              job.request_id === requestId && 
              job.assigned_vendor === vendorProfile?.vendor_id &&
              job.status === 'assigned'
            )
            
            if (wonJob) {
              // Add to recent wins for prominent display
              const newWin = {
                request_id: requestId,
                waste_type: wonJob.waste_type,
                industry_name: wonJob.industry_name || 'EcoPlast Industries',
                industry_address: wonJob.factory_address || 'Industrial Area, Sector 18, Noida',
                industry_contact: '+91 98765 43210',
                winning_bid: wonJob.total_amount || wonJob.estimated_price || wonJob.base_bid,
                timestamp: new Date().toISOString()
              }
              
              setRecentWins(prev => [...prev, newWin])
              
              // Show winning notification with confetti effect
              setTimeout(() => {
                toast({
                  title: "🎉 CONGRATULATIONS! YOU WON THE BID! 🎉",
                  description: `You've won the auction for ${wonJob.waste_type} waste at ${wonJob.industry_name || 'EcoPlast Industries'}! Payment: ₹${wonJob.total_amount || wonJob.estimated_price || wonJob.base_bid}. Check "My Jobs" tab for pickup details.`,
                  duration: 8000,
                })
              }, 100)
            } else {
              // Check if this vendor had a bid but didn't win
              const activeRequests = await pickupRequestService.getActivePickupRequests()
              const lostBid = activeRequests.find(req => 
                req.request_id === requestId && 
                req.vendor_bids?.some((bid: any) => bid.vendor_id === vendorProfile?.vendor_id)
              )
              
              if (lostBid) {
                // Show losing notification
                setTimeout(() => {
                  toast({
                    title: "Auction Ended - Better Luck Next Time",
                    description: `The bidding for ${lostBid.waste_type} waste has ended. Another vendor won this time. Keep bidding to win more auctions!`,
                    variant: "default",
                  })
                }, 100)
              } else {
                // Show general auction ended notification
                setTimeout(() => {
                  toast({
                    title: "Bidding Window Closed",
                    description: "The bidding window has ended and a winner has been selected.",
                    variant: "default",
                  })
                }, 100)
              }
            }
          } catch (refreshError) {
            console.error('Error refreshing data after winner selection:', refreshError)
            // Still show a basic notification even if refresh fails
            setTimeout(() => {
              toast({
                title: "Bidding Window Closed",
                description: "The bidding window has ended. Please refresh to see the latest updates.",
                variant: "default",
              })
            }, 100)
          }
        }, 1000) // Wait 1 second for database update to propagate
        
      } else {
        console.log(`No winner could be selected for request ${requestId} (no bids or error occurred)`)
        // Show neutral notification - but be more encouraging
        setTimeout(() => {
          toast({
            title: "Bidding Window Closed",
            description: "The bidding window has ended. We're processing the auction results - please check 'My Jobs' tab in a moment to see if you won!",
            variant: "default",
            duration: 6000,
          })
        }, 100)
        
        // Still try to refresh data in case the winner was selected despite our error
        setTimeout(async () => {
          try {
            await fetchActiveRequests()
            await fetchMyJobs()
          } catch (refreshError) {
            console.error('Error refreshing after failed winner selection:', refreshError)
          }
        }, 2000)
      }
    } catch (error) {
      console.error('Error selecting winner:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: requestId,
        stack: error instanceof Error ? error.stack : undefined
      })
      
      // Run database diagnostics to help with debugging
      try {
        const { debugDatabaseAccess } = await import('@/lib/pickup-request-service')
        await debugDatabaseAccess()
      } catch (debugError) {
        console.error('Debug function failed:', debugError)
      }
      
      setTimeout(() => {
        toast({
          title: "Bidding Window Closed",
          description: "The bidding window has ended. There was a technical issue processing the auction, but please check 'My Jobs' tab - you may still have won! You can also refresh the page to see the latest updates.",
          variant: "default",
          duration: 8000,
        })
      }, 100)
      
      // Try to refresh data anyway in case the issue was just with our notification system
      setTimeout(async () => {
        try {
          await fetchActiveRequests()
          await fetchMyJobs()
        } catch (refreshError) {
          console.error('Error refreshing after exception:', refreshError)
        }
      }, 1000)
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
              try {
                // Trigger winner selection when timer expires
                await handleTimerExpired(requestId)
                
                // Remove from active requests after processing
                setActiveRequests((prev) =>
                  prev.filter((req) => req.request_id !== requestId)
                )
              } catch (timerError) {
                console.error(`Error handling timer expiration for request ${requestId}:`, {
                  error: timerError,
                  message: timerError instanceof Error ? timerError.message : 'Unknown error',
                  requestId: requestId,
                  stack: timerError instanceof Error ? timerError.stack : undefined
                })
                
                // Still remove from active requests even if winner selection failed
                setActiveRequests((prev) =>
                  prev.filter((req) => req.request_id !== requestId)
                )
                
                // Show user notification about the issue with more specific guidance
                toast({
                  title: "Bidding Window Closed",
                  description: "The bidding window has ended. There was a technical issue, but please check 'My Jobs' tab to see if you won any auctions.",
                  variant: "default",
                  duration: 6000,
                })
              }
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
      return total + (job.total_amount || job.estimated_price || job.base_bid || 0)
    }, 0)
    
    return completedEarnings.toFixed(0)
  }

  // Mark job as completed
  const handleCompleteJob = async (jobId: string) => {
    try {
      // TODO: Implement actual completion logic with backend
      // For now, just show success message and move to completed
      
      toast({
        title: "🎉 Job Completed Successfully!",
        description: "Pickup job has been marked as completed. Payment will be processed within 24 hours.",
      })
      
      // Remove from active jobs and add to completed
      const completedJob = myJobs.find(job => job.request_id === jobId)
      if (completedJob) {
        setMyJobs(prev => prev.filter(job => job.request_id !== jobId))
        setCompletedJobs(prev => [...prev, {
          ...completedJob,
          status: 'completed',
          completed_at: new Date().toISOString()
        }])
      }
    } catch (error) {
      console.error('Error completing job:', error)
      toast({
        title: "Error",
        description: "Failed to mark job as completed. Please try again.",
        variant: "destructive",
      })
    }
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
      })

      if (response.error) {
        throw new Error(response.error)
      }

      toast({
        title: "🎯 Bid Placed Successfully!",
        description: `Your bid of ₹${bidAmount} has been placed. ${bidAmountNum > (selectedRequest.current_highest_bid || 0) ? 'You are now the highest bidder!' : 'Good luck!'}`,
      })

      setBidAmount("")
      setBidMessage("") // Clear message field
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
                  vendor_bids: activeBids,
                  // Check if current vendor is the highest bidder
                  is_highest_bidder: activeBids.some(bid => 
                    bid.vendor_id === vendorProfile?.vendor_id && 
                    bid.bid_amount === highestBid
                  ),
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

        {/* Recent Wins Alert - Special prominent display */}
        {recentWins.length > 0 && (
          <Alert className="border-yellow-300 bg-gradient-to-r from-yellow-100 via-orange-100 to-red-100 border-2">
            <Trophy className="h-6 w-6 text-yellow-600" />
            <AlertDescription className="text-yellow-900">
              <div className="flex flex-col space-y-2">
                <div className="text-lg font-bold">
                  🎊 AUCTION VICTORY! 🎊 YOU WON {recentWins.length} BID{recentWins.length > 1 ? 'S' : ''}!
                </div>
                {recentWins.map((win, index) => (
                  <div key={index} className="text-sm bg-white/80 p-2 rounded border border-yellow-200">
                    <strong>{win.waste_type.toUpperCase()} WASTE</strong> at {win.industry_name} - 
                    Winning Bid: <span className="text-green-700 font-bold">₹{win.winning_bid}</span>
                    <div className="text-xs text-gray-600 mt-1">
                      Pickup: {win.industry_address} • Contact: {win.industry_contact}
                    </div>
                  </div>
                ))}
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setRecentWins([])}
                  className="w-fit"
                >
                  Acknowledge & Continue
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Winner Announcement Alert */}
        {myJobs.length > 0 && recentWins.length === 0 && (
          <Alert className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
            <Trophy className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>🎉 CONGRATULATIONS! You have WON {myJobs.length} auction(s)!</strong> 
              <br />
              You are now assigned to collect recyclable waste. Check "My Jobs" tab for pickup details and earn money!
            </AlertDescription>
          </Alert>
        )}

        {/* Active Requests Alert */}
        {activeRequests.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <Bell className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>{activeRequests.length} active bidding window(s)</strong> - Industry bins are ready for pickup! Place your bids before the 5-minute window closes.
              {activeRequests.some(req => req.is_highest_bidder) && (
                <div className="mt-2 p-2 bg-green-100 rounded border border-green-300">
                  <strong className="text-green-800">🎯 You are currently the HIGHEST BIDDER on {activeRequests.filter(req => req.is_highest_bidder).length} auction(s)!</strong>
                </div>
              )}
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
                  Industry bins (≥80% full) with 5-minute bidding windows. Vendors bid to purchase recyclable waste - highest bid wins!
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
                          {request.is_highest_bidder && (
                            <Badge className="bg-green-100 text-green-800">
                              <div className="flex items-center gap-1">
                                <Trophy className="h-4 w-4" />
                                HIGHEST BIDDER
                              </div>
                            </Badge>
                          )}
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
                              <p className="font-medium">Base Market Value</p>
                              <p className="text-green-600 font-bold">₹{request.base_bid}</p>
                              <p className="text-xs text-muted-foreground">
                                {(() => {
                                  const details = calculateWasteDetails(request.waste_type, request.estimated_quantity)
                                  return `${details.weightKg}kg × ₹${details.ratePerKg}/kg`
                                })()}
                              </p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border">
                              <p className="font-medium">Current Highest Bid</p>
                              <p className="text-orange-600 font-bold">₹{request.current_highest_bid || 'No bids yet'}</p>
                              <p className="text-xs text-muted-foreground">
                                {request.current_highest_bid > 0 ? 
                                  `${request.current_highest_bid > request.base_bid ? '+' : ''}₹${request.current_highest_bid - request.base_bid} vs base` : 
                                  'Be the first to bid'
                                }
                              </p>
                            </div>
                          </div>
                          
                          {/* Additional Info Row */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="p-3 bg-white rounded-lg border">
                              <p className="font-medium">Total Bids</p>
                              <p className="text-blue-600 font-semibold">{request.total_bids || 0} bid(s)</p>
                              <p className="text-xs text-muted-foreground">
                                {request.total_bids > 0 ? 'Active auction' : 'No competition yet'}
                              </p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border">
                              <p className="font-medium">Amount over base price</p>
                              <p className="text-purple-600 font-bold">
                                ₹{request.current_highest_bid > 0 ? 
                                  Math.max(0, request.current_highest_bid - request.base_bid) : 
                                  '0'
                                }
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Premium over market value
                              </p>
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
                              <strong> Highest bidder wins and pays the industry for recyclable waste!</strong>
                            </p>
                            {request.is_highest_bidder && (
                              <div className="mt-2 p-2 bg-green-100 rounded border border-green-300">
                                <p className="text-sm text-green-800 font-semibold">
                                  🎯 You are currently the HIGHEST BIDDER! You're likely to win this auction.
                                </p>
                              </div>
                            )}
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
                          {job.industry_name || 'EcoPlast Industries'} - {job.waste_type.charAt(0).toUpperCase() + job.waste_type.slice(1)} Pickup
                        </CardTitle>
                        <Badge className={getStatusColor(job.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(job.status)}
                            {job.status.replace('_', ' ').toUpperCase()}
                          </div>
                        </Badge>
                      </div>
                      <CardDescription>
                        Bin {job.bin_id} • {job.industry_name || 'EcoPlast Industries'}, {job.industry_address || 'Industrial Area, Sector 18, Noida'} • Winning Bid: ₹{job.winning_bid_amount || job.winning_bid || job.base_bid}
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
                              <p className="text-green-600 font-bold">₹{job.winning_bid_amount || job.winning_bid || job.base_bid}</p>
                              <p className="text-xs text-muted-foreground">
                                Won the auction
                              </p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border">
                              <p className="font-medium">Expected Weight</p>
                              <p className="text-muted-foreground">
                                {(() => {
                                  const details = calculateWasteDetails(job.waste_type, job.estimated_quantity)
                                  return `${details.weightKg} kg`
                                })()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleCompleteJob(job.request_id)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark Complete
                            </Button>
                            <Button variant="outline" size="sm">
                              <MapPin className="mr-2 h-4 w-4" />
                              View Route
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <p className="font-medium text-sm mb-2">Pickup Address</p>
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm font-medium">{job.industry_name || 'EcoPlast Industries'}</p>
                              <p className="text-sm text-muted-foreground">{job.industry_address || 'Industrial Area, Sector 18'}</p>
                              <p className="text-sm text-muted-foreground">Noida, Uttar Pradesh 201301</p>
                              <p className="text-sm text-muted-foreground">Contact: {job.industry_contact || '+91 98765 43210'}</p>
                              <p className="text-sm text-muted-foreground">Email: {job.industry_email || 'operations@ecoplast.com'}</p>
                            </div>
                          </div>
                          <div>
                            <p className="font-medium text-sm mb-2">Collection Instructions</p>
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm text-blue-800">
                                • Collect from Bin {job.bin_id} located at waste storage area
                                • Verify waste quality before collection
                                • Report any contamination issues
                                • Payment will be processed after completion
                              </p>
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
                          {job.industry_name || 'EcoPlast Industries'} - {job.waste_type.charAt(0).toUpperCase() + job.waste_type.slice(1)} ✅
                        </CardTitle>
                        <Badge className="bg-green-100 text-green-800">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            COMPLETED
                          </div>
                        </Badge>
                      </div>
                      <CardDescription>
                        Completed on {new Date(job.completed_at || job.updated_at).toLocaleDateString()} • Earned: ₹{job.winning_bid_amount || job.winning_bid || job.base_bid}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="p-3 bg-white rounded-lg border">
                          <p className="font-medium">Waste Type & Quantity</p>
                          <p className="text-muted-foreground capitalize">{job.waste_type} - {job.estimated_quantity}L</p>
                          <p className="text-xs text-muted-foreground">
                            Weight: {(() => {
                              const details = calculateWasteDetails(job.waste_type, job.estimated_quantity)
                              return `${details.weightKg} kg`
                            })()}
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-lg border">
                          <p className="font-medium">Payment Received</p>
                          <p className="text-green-600 font-bold">₹{job.winning_bid_amount || job.winning_bid || job.base_bid}</p>
                          <p className="text-xs text-muted-foreground">Auction winner payment</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg border">
                          <p className="font-medium">Collection Location</p>
                          <p className="text-muted-foreground">{job.industry_name || 'EcoPlast Industries'}</p>
                          <p className="text-xs text-muted-foreground">{job.industry_address || 'Industrial Area, Sector 18, Noida'}</p>
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

      {/* Bid Modal - Real Auction Style */}
      <Dialog open={showBidModal} onOpenChange={setShowBidModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Gavel className="h-6 w-6 text-orange-600" />
              Recyclable Waste Auction - Place Your Purchase Bid
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.industry_name} • {selectedRequest?.waste_type.charAt(0).toUpperCase() + selectedRequest?.waste_type.slice(1)} Waste • {selectedRequest?.estimated_quantity}L
              <br />
              <span className="text-green-600 font-medium">You're bidding to BUY this recyclable waste from the industry</span>
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              {/* Auction Timer - Prominent */}
              <div className="text-center p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border-2 border-red-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Timer className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-800">AUCTION CLOSES IN</span>
                </div>
                <div className="text-3xl font-bold text-red-600">
                  {formatTime(timers[selectedRequest.request_id] || 0)}
                </div>
                <div className="text-xs text-red-600 mt-1">
                  {timers[selectedRequest.request_id] <= 60 ? '🔥 FINAL MINUTE!' : 'Hurry up!'}
                </div>
              </div>

              {/* Current Bidding Status */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-blue-50 rounded-lg border">
                  <div className="text-sm text-blue-600 font-medium">BASE MARKET VALUE</div>
                  <div className="text-lg font-bold text-blue-800">₹{selectedRequest.base_bid}</div>
                  <div className="text-xs text-blue-600">
                    {(() => {
                      const details = calculateWasteDetails(selectedRequest.waste_type, selectedRequest.estimated_quantity)
                      return `${details.weightKg}kg × ₹${details.ratePerKg}/kg`
                    })()}
                  </div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg border">
                  <div className="text-sm text-green-600 font-medium">HIGHEST BID</div>
                  <div className="text-xl font-bold text-green-800">
                    {selectedRequest.current_highest_bid ? `₹${selectedRequest.current_highest_bid}` : 'No bids yet'}
                  </div>
                  <div className="text-xs text-green-600">
                    {selectedRequest.total_bids || 0} bid(s) placed
                  </div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg border">
                  <div className="text-sm text-orange-600 font-medium">MIN NEXT BID</div>
                  <div className="text-lg font-bold text-orange-800">
                    ₹{Math.max(selectedRequest.base_bid, (selectedRequest.current_highest_bid || 0) + 10)}
                  </div>
                  <div className="text-xs text-orange-600">Required minimum</div>
                </div>
              </div>

              {/* Bid Input Section */}
              <div className="space-y-3">
                <div className="text-center">
                  <Label className="text-lg font-semibold text-gray-800">Enter Your Purchase Offer (₹)</Label>
                  <p className="text-sm text-muted-foreground">How much will you pay the industry for this waste?</p>
                </div>
                
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-2xl font-bold text-green-600">₹</span>
                  <Input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={`${Math.max(selectedRequest.base_bid, (selectedRequest.current_highest_bid || 0) + 10)}`}
                    min={Math.max(selectedRequest.base_bid, (selectedRequest.current_highest_bid || 0) + 10)}
                    className="pl-8 text-2xl font-bold text-center h-14 border-2"
                  />
                </div>

                {/* Quick Bid Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {[10, 25, 50].map(increment => {
                    const suggestedBid = Math.max(selectedRequest.base_bid, (selectedRequest.current_highest_bid || 0)) + increment
                    return (
                      <Button
                        key={increment}
                        variant="outline"
                        size="sm"
                        onClick={() => setBidAmount(suggestedBid.toString())}
                        className="text-xs"
                      >
                        ₹{suggestedBid}
                        <span className="text-xs text-muted-foreground ml-1">(+{increment})</span>
                      </Button>
                    )
                  })}
                </div>

                {/* Bid Validation Feedback */}
                {bidAmount && (
                  <div className="p-3 rounded-lg border">
                    {(() => {
                      const bidAmountNum = parseFloat(bidAmount)
                      const minimumBid = Math.max(selectedRequest.base_bid, (selectedRequest.current_highest_bid || 0) + 10)
                      
                      if (bidAmountNum < minimumBid) {
                        return (
                          <div className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="font-medium">Bid too low! Minimum: ₹{minimumBid}</span>
                          </div>
                        )
                      } else if (bidAmountNum > (selectedRequest.current_highest_bid || 0)) {
                        return (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="font-medium">🏆 You'll be the highest bidder!</span>
                          </div>
                        )
                      } else {
                        return (
                          <div className="flex items-center gap-2 text-yellow-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="font-medium">Valid bid, but not the highest</span>
                          </div>
                        )
                      }
                    })()}
                  </div>
                )}

                {/* Market Value Reference */}
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  {(() => {
                    const details = calculateWasteDetails(selectedRequest.waste_type, selectedRequest.estimated_quantity)
                    return (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Market Value Reference:</span>
                        <span className="font-medium">₹{details.marketValue} ({details.weightKg}kg × ₹{details.ratePerKg}/kg)</span>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowBidModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitBid} 
                  disabled={
                    !bidAmount || 
                    submittingBid || 
                    parseFloat(bidAmount) < Math.max(selectedRequest.base_bid, (selectedRequest.current_highest_bid || 0) + 10) ||
                    timers[selectedRequest.request_id] <= 0
                  }
                  className="flex-1 bg-green-600 hover:bg-green-700 text-lg font-semibold"
                >
                  {submittingBid ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Placing Bid...
                    </>
                  ) : timers[selectedRequest.request_id] <= 0 ? (
                    'Auction Closed'
                  ) : (
                    <>
                      <Gavel className="mr-2 h-5 w-5" />
                      Place Bid ₹{bidAmount || '0'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
