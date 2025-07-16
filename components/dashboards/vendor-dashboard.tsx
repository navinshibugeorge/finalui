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
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  MapPin,
  Building,
  Camera,
  AlertCircle,
  Bell,
  Timer,
  TrendingUp,
  User,
  Phone,
  Home,
  Weight,
  X,
  Users,
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/components/auth-provider"
import { getPickupRequests, createBid, getCitizenPickupRequests, updateCitizenPickupRequest } from "@/lib/aws-api"
import { useToast } from "@/hooks/use-toast"

interface CitizenPickupRequest {
  request_id: string
  user_id: string
  citizen_name: string
  contact_number: string
  address: string
  waste_type: string
  approx_weight: number
  estimated_quantity: number
  estimated_price: number
  waste_image?: string
  status: string
  created_at: string
  description?: string
  size_category?: string
}

interface VendorProfile {
  vendor_id: string
  name: string
  registered_waste_types: string[]
  contact: string
  location: string
}

export function VendorDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [pickupRequests, setPickupRequests] = useState<any[]>([])
  const [citizenRequests, setCitizenRequests] = useState<CitizenPickupRequest[]>([])
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [citizenRequestsLoading, setCitizenRequestsLoading] = useState(true)
  const [showBidModal, setShowBidModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [bidAmount, setBidAmount] = useState("")
  const [bidMessage, setBidMessage] = useState("")
  const [submittingBid, setSubmittingBid] = useState(false)
  const [acceptedNotifications, setAcceptedNotifications] = useState<Set<string>>(new Set())
  const [timers, setTimers] = useState<{ [key: string]: number }>({})
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set())

  // Mock vendor profile data
  const mockVendorProfile: VendorProfile = {
    vendor_id: "vendor_001",
    name: "EcoWaste Solutions",
    registered_waste_types: ["plastic", "paper", "glass", "metal", "electronic"],
    contact: "+91-9876543210",
    location: "North District",
  }

  // Mock notification data for filled bins
  const mockNotifications = [
    {
      notification_id: "notif_001",
      industry_name: "Tech Industries Ltd",
      bin_id: "B475",
      waste_type: "plastic",
      fill_level: 94,
      approx_volume: "94.0L",
      market_value: "450.00",
      waste_image: "/placeholder.svg?height=200&width=300&text=PLASTIC+WASTE",
      location: "Factory Floor A",
      coordinates: "11.9611, 89.5900",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
      status: "active",
      proximity_score: 8.5,
      vendor_availability: true,
    },
    {
      notification_id: "notif_002",
      industry_name: "Manufacturing Corp",
      bin_id: "B272",
      waste_type: "glass",
      fill_level: 89,
      approx_volume: "71.2L",
      market_value: "280.00",
      waste_image: "/placeholder.svg?height=200&width=300&text=GLASS+WASTE",
      location: "Production Line C",
      coordinates: "11.9927, 89.5616",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 4 * 60 * 1000).toISOString(), // 4 minutes from now
      status: "active",
      proximity_score: 7.2,
      vendor_availability: true,
    },
  ]

  useEffect(() => {
    if (user) {
      fetchPickupRequests()
      fetchCitizenPickupRequests()
      setVendorProfile(mockVendorProfile)
      setNotifications(mockNotifications)

      // Initialize timers for active notifications
      const initialTimers: { [key: string]: number } = {}
      mockNotifications.forEach((notif) => {
        const timeLeft = Math.max(0, Math.floor((new Date(notif.expires_at).getTime() - Date.now()) / 1000))
        initialTimers[notif.notification_id] = timeLeft
      })
      setTimers(initialTimers)
    }
  }, [user])

  // Timer countdown effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prevTimers) => {
        const newTimers = { ...prevTimers }
        let hasChanges = false

        Object.keys(newTimers).forEach((notifId) => {
          if (newTimers[notifId] > 0) {
            newTimers[notifId] -= 1
            hasChanges = true
          } else if (newTimers[notifId] === 0) {
            // Timer expired, update notification status
            setNotifications((prev) =>
              prev.map((notif) => (notif.notification_id === notifId ? { ...notif, status: "expired" } : notif)),
            )
          }
        })

        return hasChanges ? newTimers : prevTimers
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const fetchPickupRequests = async () => {
    try {
      const { data, error } = await getPickupRequests(undefined, "vendor")
      if (error) {
        console.warn("Could not fetch pickup requests:", error)
        const mockRequests = [
          {
            request_id: "req_001",
            user_id: "citizen@example.com",
            waste_type: "plastic",
            size_category: "medium",
            estimated_quantity: 10,
            estimated_price: 75,
            status: "pending",
            created_at: "2024-01-18T09:15:00Z",
            request_type: "citizen",
          },
        ]
        setPickupRequests(mockRequests)
      } else {
        setPickupRequests(data || [])
      }
    } catch (error) {
      console.error("Error fetching pickup requests:", error)
      setPickupRequests([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCitizenPickupRequests = async () => {
    setCitizenRequestsLoading(true)
    try {
      // Use the new API function to get citizen pickup requests
      const { data, error } = await getCitizenPickupRequests(
        vendorProfile?.registered_waste_types || mockVendorProfile.registered_waste_types,
      )

      if (error) {
        console.warn("Could not fetch citizen pickup requests:", error)
        setCitizenRequests([])
        toast({
          title: "Warning",
          description: "Could not fetch latest citizen requests. Showing cached data.",
          variant: "destructive",
        })
      } else {
        setCitizenRequests(data || [])
      }
    } catch (error) {
      console.error("Error fetching citizen pickup requests:", error)
      toast({
        title: "Error",
        description: "Failed to fetch citizen pickup requests",
        variant: "destructive",
      })
      setCitizenRequests([])
    } finally {
      setCitizenRequestsLoading(false)
    }
  }

  const handleAcceptCitizenRequest = async (requestId: string) => {
    setProcessingRequests((prev) => new Set([...prev, requestId]))

    try {
      // Update the citizen pickup request status to accepted and assign vendor
      const { data, error } = await updateCitizenPickupRequest(requestId, {
        status: "accepted",
        vendor_id: vendorProfile?.vendor_id || mockVendorProfile.vendor_id,
        vendor_name: vendorProfile?.name || mockVendorProfile.name,
        vendor_contact: vendorProfile?.contact || mockVendorProfile.contact,
      })

      if (error) {
        throw new Error(error)
      }

      // Remove the request from the local state
      setCitizenRequests((prev) => prev.filter((request) => request.request_id !== requestId))

      toast({
        title: "Request Accepted! ✅",
        description: "The pickup request has been assigned to you. Contact the citizen to arrange pickup.",
      })
    } catch (error: any) {
      console.error("Error accepting request:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to accept the pickup request",
        variant: "destructive",
      })
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const handleDeclineCitizenRequest = async (requestId: string) => {
    setProcessingRequests((prev) => new Set([...prev, requestId]))

    try {
      // Update the citizen pickup request status to declined
      const { data, error } = await updateCitizenPickupRequest(requestId, {
        status: "declined",
      })

      if (error) {
        throw new Error(error)
      }

      // Remove the request from the local state
      setCitizenRequests((prev) => prev.filter((request) => request.request_id !== requestId))

      toast({
        title: "Request Declined",
        description: "The pickup request has been declined and removed from your list.",
      })
    } catch (error: any) {
      console.error("Error declining request:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to decline the pickup request",
        variant: "destructive",
      })
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const handleAcceptNotification = async (notificationId: string) => {
    const notification = notifications.find((n) => n.notification_id === notificationId)
    if (!notification) return

    setAcceptedNotifications((prev) => new Set([...prev, notificationId]))

    toast({
      title: "Notification Accepted! ✅",
      description: "You can now place your bid for this pickup request",
    })

    // Update notification status
    setNotifications((prev) =>
      prev.map((notif) => (notif.notification_id === notificationId ? { ...notif, status: "accepted" } : notif)),
    )
  }

  const handlePlaceBid = (notification: any) => {
    setSelectedRequest({
      ...notification,
      request_id: `req_${notification.notification_id}`,
      request_type: "industry",
      company_name: notification.industry_name,
    })
    setShowBidModal(true)
  }

  const handleSubmitBid = async () => {
    if (!bidAmount || !selectedRequest) {
      toast({
        title: "Missing Information",
        description: "Please enter a bid amount",
        variant: "destructive",
      })
      return
    }

    setSubmittingBid(true)
    try {
      const vendorId = user?.username || user?.attributes?.email
      await createBid({
        request_id: selectedRequest.request_id,
        vendor_id: vendorId,
        bid_amount: Number.parseFloat(bidAmount),
        message: bidMessage,
      })

      toast({
        title: "Bid Submitted! 💰",
        description: `Your bid of ₹${bidAmount} has been submitted`,
      })

      setBidAmount("")
      setBidMessage("")
      setShowBidModal(false)
      setSelectedRequest(null)
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
      case "active":
        return "bg-green-100 text-green-800"
      case "accepted":
        return "bg-blue-100 text-blue-800"
      case "expired":
        return "bg-red-100 text-red-800"
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
      case "active":
        return <Bell className="h-4 w-4" />
      case "accepted":
        return <CheckCircle className="h-4 w-4" />
      case "expired":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const activeNotifications = notifications.filter((n) => n.status === "active")
  const acceptedNotificationsList = notifications.filter((n) => n.status === "accepted")
  const expiredNotifications = notifications.filter((n) => n.status === "expired")
  const pendingRequests = pickupRequests.filter((r) => r.status === "pending")
  const assignedRequests = pickupRequests.filter((r) => r.status === "assigned")
  const completedRequests = pickupRequests.filter((r) => r.status === "completed")

  return (
    <DashboardLayout title="Vendor Dashboard" userRole="vendor">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Citizen Requests</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{citizenRequests.length}</div>
              <p className="text-xs text-muted-foreground">Available for pickup</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Notifications</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{activeNotifications.length}</div>
              <p className="text-xs text-muted-foreground">Bins ready for pickup</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests.length}</div>
              <p className="text-xs text-muted-foreground">Available for bidding</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned Jobs</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignedRequests.length}</div>
              <p className="text-xs text-muted-foreground">Active pickups</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹2,450</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Notifications Alert */}
        {activeNotifications.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <Bell className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>{activeNotifications.length} new notification(s)</strong> - Bins are ready for pickup! Act fast
              before the bidding window closes.
            </AlertDescription>
          </Alert>
        )}

        {/* Citizen Requests Alert */}
        {citizenRequests.length > 0 && (
          <Alert className="border-blue-200 bg-blue-50">
            <Users className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>{citizenRequests.length} new citizen request(s)</strong> - Citizens are requesting waste pickup
              services!
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="citizen-requests" className="space-y-4">
          <TabsList>
            <TabsTrigger value="citizen-requests">
              Citizen Requests{" "}
              {citizenRequests.length > 0 && (
                <Badge className="ml-2 bg-blue-500 text-white">{citizenRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notifications">
              Notifications{" "}
              {activeNotifications.length > 0 && (
                <Badge className="ml-2 bg-orange-500 text-white">{activeNotifications.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="available">Available Requests</TabsTrigger>
            <TabsTrigger value="assigned">My Jobs</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="citizen-requests" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Citizen Pickup Requests</h3>
                <p className="text-sm text-muted-foreground">
                  Requests from citizens that match your registered waste types
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCitizenPickupRequests}
                disabled={citizenRequestsLoading}
              >
                {citizenRequestsLoading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            <div className="grid gap-4">
              {citizenRequestsLoading ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading citizen pickup requests...</p>
                  </CardContent>
                </Card>
              ) : citizenRequests.length > 0 ? (
                citizenRequests.map((request) => (
                  <Card key={request.request_id} className="border-blue-200 bg-blue-50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Users className="h-5 w-5 text-blue-600" />
                          Citizen Pickup Request -{" "}
                          {request.waste_type.charAt(0).toUpperCase() + request.waste_type.slice(1)}
                        </CardTitle>
                        <Badge className={getStatusColor(request.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(request.status)}
                            {request.status.toUpperCase()}
                          </div>
                        </Badge>
                      </div>
                      <CardDescription>
                        Posted on {new Date(request.created_at).toLocaleDateString()} at{" "}
                        {new Date(request.created_at).toLocaleTimeString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column - Details */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-4 text-sm">
                            <div className="p-3 bg-white rounded-lg border">
                              <p className="font-medium flex items-center gap-2 mb-2">
                                <User className="h-4 w-4 text-blue-600" />
                                Citizen Information
                              </p>
                              <div className="space-y-1">
                                <p>
                                  <strong>Name:</strong> {request.citizen_name}
                                </p>
                                <p className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  <strong>Contact:</strong> {request.contact_number}
                                </p>
                              </div>
                            </div>

                            <div className="p-3 bg-white rounded-lg border">
                              <p className="font-medium flex items-center gap-2 mb-2">
                                <Home className="h-4 w-4 text-green-600" />
                                Pickup Address
                              </p>
                              <p className="text-sm text-muted-foreground">{request.address}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-white rounded-lg border">
                                <p className="font-medium">Waste Type</p>
                                <p className="text-muted-foreground capitalize">{request.waste_type}</p>
                              </div>
                              <div className="p-3 bg-white rounded-lg border">
                                <p className="font-medium flex items-center gap-1">
                                  <Weight className="h-3 w-3" />
                                  Approx. Weight
                                </p>
                                <p className="text-muted-foreground">
                                  {request.approx_weight || request.estimated_quantity} Kg
                                </p>
                              </div>
                            </div>

                            {request.estimated_price && (
                              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                <p className="font-medium flex items-center gap-1">
                                  <DollarSign className="h-3 w-3 text-green-600" />
                                  Estimated Payment
                                </p>
                                <p className="text-green-700 font-semibold">₹{request.estimated_price}</p>
                              </div>
                            )}

                            {request.description && (
                              <div className="p-3 bg-white rounded-lg border">
                                <p className="font-medium mb-1">Description</p>
                                <p className="text-sm text-muted-foreground">{request.description}</p>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleAcceptCitizenRequest(request.request_id)}
                              disabled={processingRequests.has(request.request_id)}
                            >
                              {processingRequests.has(request.request_id) ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Accepting...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Accept Request
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                              onClick={() => handleDeclineCitizenRequest(request.request_id)}
                              disabled={processingRequests.has(request.request_id)}
                            >
                              {processingRequests.has(request.request_id) ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                                  Declining...
                                </>
                              ) : (
                                <>
                                  <X className="mr-2 h-4 w-4" />
                                  Decline
                                </>
                              )}
                            </Button>
                            <Button variant="outline" size="sm">
                              <MapPin className="mr-2 h-4 w-4" />
                              View Location
                            </Button>
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
                                src={request.waste_image || "/placeholder.svg"}
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

                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800">
                              <AlertCircle className="inline h-4 w-4 mr-1" />
                              This request matches your registered waste types. Contact the citizen directly after
                              accepting to arrange pickup details.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No citizen pickup requests available</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Citizen requests matching your registered waste types will appear here
                    </p>
                    {vendorProfile && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Your registered waste types:</strong>{" "}
                          {vendorProfile.registered_waste_types.join(", ")}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <div className="grid gap-4">
              {/* Active Notifications */}
              {activeNotifications.map((notification) => (
                <Card key={notification.notification_id} className="border-orange-200 bg-orange-50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Bell className="h-5 w-5 text-orange-600" />
                        Bin Ready for Pickup - {notification.industry_name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(notification.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(notification.status)}
                            {notification.status.toUpperCase()}
                          </div>
                        </Badge>
                        <div className="flex items-center gap-1 text-sm font-medium text-red-600">
                          <Timer className="h-4 w-4" />
                          {formatTime(timers[notification.notification_id] || 0)}
                        </div>
                      </div>
                    </div>
                    <CardDescription>
                      Bin {notification.bin_id} • {notification.location} • Posted:{" "}
                      {new Date(notification.created_at).toLocaleTimeString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column - Details */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              Industry Name
                            </p>
                            <p className="text-muted-foreground">{notification.industry_name}</p>
                          </div>
                          <div>
                            <p className="font-medium">Waste Type</p>
                            <p className="text-muted-foreground capitalize">{notification.waste_type}</p>
                          </div>
                          <div>
                            <p className="font-medium">Fill Level</p>
                            <div className="flex items-center gap-2">
                              <Progress value={notification.fill_level} className="w-16 h-2" />
                              <span className="text-muted-foreground">{notification.fill_level}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="font-medium">Approx Volume</p>
                            <p className="text-muted-foreground">{notification.approx_volume}</p>
                          </div>
                          <div>
                            <p className="font-medium flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              Market Value Today
                            </p>
                            <p className="text-muted-foreground font-semibold text-green-600">
                              ₹{notification.market_value}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              Proximity Score
                            </p>
                            <p className="text-muted-foreground">{notification.proximity_score}/10</p>
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          {!acceptedNotifications.has(notification.notification_id) ? (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleAcceptNotification(notification.notification_id)}
                              disabled={timers[notification.notification_id] <= 0}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Accept Notification
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => handlePlaceBid(notification)}
                              disabled={timers[notification.notification_id] <= 0}
                            >
                              <DollarSign className="mr-2 h-4 w-4" />
                              Place Bid
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            <MapPin className="mr-2 h-4 w-4" />
                            View Location
                          </Button>
                        </div>

                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <AlertCircle className="inline h-4 w-4 mr-1" />
                            Bidding window closes in {formatTime(timers[notification.notification_id] || 0)}. Bids will
                            be sorted by amount, proximity, and availability.
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
                              src={notification.waste_image || "/placeholder.svg"}
                              alt={`${notification.waste_type} waste`}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = "none"
                                target.nextElementSibling?.classList.remove("hidden")
                              }}
                            />
                            <div className="hidden flex-col items-center justify-center text-gray-500">
                              <Camera className="h-8 w-8 mb-2" />
                              <span className="text-sm">{notification.waste_type.toUpperCase()} WASTE</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Accepted Notifications */}
              {acceptedNotificationsList.map((notification) => (
                <Card key={notification.notification_id} className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                        Accepted - {notification.industry_name}
                      </CardTitle>
                      <Badge className={getStatusColor(notification.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(notification.status)}
                          ACCEPTED
                        </div>
                      </Badge>
                    </div>
                    <CardDescription>You can place your bid for this pickup request</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => handlePlaceBid(notification)}
                        disabled={timers[notification.notification_id] <= 0}
                      >
                        <DollarSign className="mr-2 h-4 w-4" />
                        Place Bid
                      </Button>
                      <div className="flex items-center gap-1 text-sm font-medium text-red-600">
                        <Timer className="h-4 w-4" />
                        {formatTime(timers[notification.notification_id] || 0)} left
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Expired Notifications */}
              {expiredNotifications.map((notification) => (
                <Card key={notification.notification_id} className="border-red-200 bg-red-50 opacity-75">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        Expired - {notification.industry_name}
                      </CardTitle>
                      <Badge className={getStatusColor(notification.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(notification.status)}
                          EXPIRED
                        </div>
                      </Badge>
                    </div>
                    <CardDescription>Bidding window has closed for this notification</CardDescription>
                  </CardHeader>
                </Card>
              ))}

              {notifications.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No notifications available</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      You'll receive notifications when bins are ready for pickup
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="available" className="space-y-4">
            <div className="grid gap-4">
              {pendingRequests.map((request) => (
                <Card key={request.request_id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg capitalize flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {request.waste_type} Pickup
                      </CardTitle>
                      <Badge className={getStatusColor(request.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(request.status)}
                          {request.status.replace("_", " ").toUpperCase()}
                        </div>
                      </Badge>
                    </div>
                    <CardDescription>Posted on {new Date(request.created_at).toLocaleDateString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium">Quantity</p>
                          <p className="text-muted-foreground">{request.estimated_quantity} kg</p>
                        </div>
                        <div>
                          <p className="font-medium">Expected Payment</p>
                          <p className="text-muted-foreground">₹{request.estimated_price || "TBD"}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          Accept Request
                        </Button>
                        <Button variant="outline" size="sm">
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {pendingRequests.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No pickup requests available</p>
                    <p className="text-sm text-muted-foreground mt-2">Check back later for new opportunities</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="assigned" className="space-y-4">
            <div className="grid gap-4">
              {assignedRequests.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No assigned jobs</p>
                    <p className="text-sm text-muted-foreground mt-2">Accept requests to see them here</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <div className="grid gap-4">
              {completedRequests.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No completed jobs yet</p>
                    <p className="text-sm text-muted-foreground mt-2">Complete your first pickup to see it here</p>
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
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p>
                  <strong>Industry:</strong> {selectedRequest.industry_name || selectedRequest.company_name}
                </p>
                <p>
                  <strong>Waste Type:</strong> {selectedRequest.waste_type}
                </p>
                {selectedRequest.approx_volume && (
                  <p>
                    <strong>Volume:</strong> {selectedRequest.approx_volume}
                  </p>
                )}
                {selectedRequest.market_value && (
                  <p>
                    <strong>Market Value:</strong> ₹{selectedRequest.market_value}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="bid-amount">Your Bid Amount (₹)</Label>
              <Input
                id="bid-amount"
                type="number"
                placeholder="Enter your bid amount"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Consider the market value and your proximity score when bidding
              </p>
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

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowBidModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitBid} disabled={submittingBid} className="bg-green-600 hover:bg-green-700">
                {submittingBid ? "Submitting..." : "Submit Bid"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
