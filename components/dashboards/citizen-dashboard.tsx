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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Plus, Wallet, Coins, Truck, Clock, CheckCircle, MapPin, Package, Star, Phone, X } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/components/auth-provider"
import {
  getPickupRequests,
  getUserProfile,
  updatePickupRequest,
  updateUserProfile,
  createPickupRequest,
} from "@/lib/aws-api"
import { useToast } from "@/hooks/use-toast"

export function CitizenDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [showCreateRequest, setShowCreateRequest] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [showRedeemModal, setShowRedeemModal] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [citizenData, setCitizenData] = useState<any>(null)
  const [pickupRequests, setPickupRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [redeemCoins, setRedeemCoins] = useState("")
  const [rating, setRating] = useState(5)
  const [feedback, setFeedback] = useState("")

  // New pickup request form state
  const [wasteType, setWasteType] = useState("")
  const [wasteWeight, setWasteWeight] = useState("")
  const [wasteImage, setWasteImage] = useState<File | null>(null)
  const [submittingRequest, setSubmittingRequest] = useState(false)

  useEffect(() => {
    if (user) {
      fetchCitizenData()
      fetchPickupRequests()
    }
  }, [user])

  const fetchCitizenData = async () => {
    try {
      const userId = user?.username || user?.attributes?.email
      const { data, error } = await getUserProfile(userId)
      if (error) {
        console.warn("Could not fetch user profile:", error)
        // Use fallback data from user attributes
        setCitizenData({
          wallet_balance: 150.5,
          eco_coins: 25,
          email: user?.attributes?.email,
          name: user?.attributes?.name,
        })
      } else {
        setCitizenData(data)
      }
    } catch (error) {
      console.error("Error fetching citizen data:", error)
      // Use fallback data
      setCitizenData({
        wallet_balance: 150.5,
        eco_coins: 25,
        email: user?.attributes?.email,
        name: user?.attributes?.name,
      })
    }
  }

  const fetchPickupRequests = async () => {
    try {
      const userId = user?.username || user?.attributes?.email
      const { data, error } = await getPickupRequests(userId, "citizen")
      if (error) {
        console.warn("Could not fetch pickup requests:", error)
        setPickupRequests([])
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

  const handleCreatePickupRequest = async () => {
    if (!wasteType || !wasteWeight) {
      toast({
        title: "Missing Information",
        description: "Please select waste type and weight category",
        variant: "destructive",
      })
      return
    }

    setSubmittingRequest(true)
    try {
      const userId = user?.username || user?.attributes?.email
      const requestData = {
        user_id: userId,
        waste_type: wasteType,
        size_category: wasteWeight,
        estimated_quantity: wasteWeight === "small" ? 2.5 : wasteWeight === "medium" ? 10 : 20,
        estimated_price: wasteWeight === "small" ? 25 : wasteWeight === "medium" ? 75 : 150,
        status: "pending",
        created_at: new Date().toISOString(),
        waste_image: wasteImage ? URL.createObjectURL(wasteImage) : null,
      }

      await createPickupRequest(requestData)

      toast({
        title: "Request Created! 🎉",
        description: "Your pickup request has been submitted successfully",
      })

      // Reset form
      setWasteType("")
      setWasteWeight("")
      setWasteImage(null)
      setShowCreateRequest(false)

      // Refresh requests
      fetchPickupRequests()
    } catch (error: any) {
      toast({
        title: "Request Failed",
        description: error.message || "Failed to create pickup request",
        variant: "destructive",
      })
    } finally {
      setSubmittingRequest(false)
    }
  }

  const handleWithdrawFunds = async () => {
    try {
      const amount = Number.parseFloat(withdrawAmount)
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid amount to withdraw",
          variant: "destructive",
        })
        return
      }

      if (amount > (citizenData?.wallet_balance || 0)) {
        toast({
          title: "Insufficient Balance",
          description: "You don't have enough balance to withdraw this amount",
          variant: "destructive",
        })
        return
      }

      // Update user profile with new balance
      const newBalance = (citizenData?.wallet_balance || 0) - amount
      await updateUserProfile(user?.username || user?.attributes?.email, {
        wallet_balance: newBalance,
      })

      // Update local state
      setCitizenData((prev: any) => ({
        ...prev,
        wallet_balance: newBalance,
      }))

      toast({
        title: "Withdrawal Successful! 💰",
        description: `₹${amount} has been transferred to your bank account`,
      })

      setShowWithdrawModal(false)
      setWithdrawAmount("")
    } catch (error: any) {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to process withdrawal",
        variant: "destructive",
      })
    }
  }

  const handleRedeemCoins = async () => {
    try {
      const coins = Number.parseInt(redeemCoins)
      if (isNaN(coins) || coins <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid number of coins to redeem",
          variant: "destructive",
        })
        return
      }

      if (coins > (citizenData?.eco_coins || 0)) {
        toast({
          title: "Insufficient Coins",
          description: "You don't have enough eco-coins to redeem",
          variant: "destructive",
        })
        return
      }

      // Convert coins to cash (1 coin = ₹2)
      const cashValue = coins * 2
      const newCoins = (citizenData?.eco_coins || 0) - coins
      const newBalance = (citizenData?.wallet_balance || 0) + cashValue

      // Update user profile
      await updateUserProfile(user?.username || user?.attributes?.email, {
        eco_coins: newCoins,
        wallet_balance: newBalance,
      })

      // Update local state
      setCitizenData((prev: any) => ({
        ...prev,
        eco_coins: newCoins,
        wallet_balance: newBalance,
      }))

      toast({
        title: "Coins Redeemed! 🪙",
        description: `${coins} eco-coins converted to ₹${cashValue}`,
      })

      setShowRedeemModal(false)
      setRedeemCoins("")
    } catch (error: any) {
      toast({
        title: "Redemption Failed",
        description: error.message || "Failed to redeem coins",
        variant: "destructive",
      })
    }
  }

  const handleCancelRequest = async (requestId: string) => {
    try {
      await updatePickupRequest(requestId, {
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })

      toast({
        title: "Request Cancelled ❌",
        description: "Your pickup request has been cancelled",
      })

      fetchPickupRequests()
    } catch (error: any) {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel request",
        variant: "destructive",
      })
    }
  }

  const handleCallVendor = (contact: string) => {
    if (contact) {
      window.open(`tel:${contact}`)
      toast({
        title: "Calling Vendor 📞",
        description: "Opening phone app to call vendor",
      })
    } else {
      toast({
        title: "Contact Not Available",
        description: "Vendor contact information is not available",
        variant: "destructive",
      })
    }
  }

  const handleRateVendor = async () => {
    try {
      if (!selectedRequest) return

      await updatePickupRequest(selectedRequest.request_id, {
        vendor_rating: rating,
        vendor_feedback: feedback,
        updated_at: new Date().toISOString(),
      })

      // Award eco-coins for rating
      const newCoins = (citizenData?.eco_coins || 0) + 5
      await updateUserProfile(user?.username || user?.attributes?.email, {
        eco_coins: newCoins,
      })

      setCitizenData((prev: any) => ({
        ...prev,
        eco_coins: newCoins,
      }))

      toast({
        title: "Rating Submitted! ⭐",
        description: "Thank you for your feedback! You earned 5 eco-coins",
      })

      setShowRatingModal(false)
      setSelectedRequest(null)
      setRating(5)
      setFeedback("")
      fetchPickupRequests()
    } catch (error: any) {
      toast({
        title: "Rating Failed",
        description: error.message || "Failed to submit rating",
        variant: "destructive",
      })
    }
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
      case "cancelled":
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
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getSizeLabel = (sizeCategory: string, quantity: number) => {
    switch (sizeCategory) {
      case "small":
        return "Small (0-5 kg)"
      case "medium":
        return "Medium (5-15 kg)"
      case "large":
        return "Large (15+ kg)"
      default:
        return `${quantity} kg`
    }
  }

  return (
    <DashboardLayout title="Citizen Dashboard" userRole="citizen">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{citizenData?.wallet_balance?.toFixed(2) || "0.00"}</div>
              <p className="text-xs text-muted-foreground">Available for withdrawal</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eco Coins</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{citizenData?.eco_coins || 0}</div>
              <p className="text-xs text-muted-foreground">Loyalty rewards earned</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pickups</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pickupRequests.filter((r) => r.status === "completed").length}</div>
              <p className="text-xs text-muted-foreground">Completed successfully</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Request waste pickup or manage your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => setShowCreateRequest(true)} className="bg-green-600 hover:bg-green-700">
                <Plus className="mr-2 h-4 w-4" />
                Request Pickup
              </Button>
              <Button variant="outline" onClick={() => setShowWithdrawModal(true)}>
                <Wallet className="mr-2 h-4 w-4" />
                Withdraw Funds
              </Button>
              <Button variant="outline" onClick={() => setShowRedeemModal(true)}>
                <Coins className="mr-2 h-4 w-4" />
                Redeem Coins
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pickup Requests */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active Requests</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <div className="grid gap-4">
              {pickupRequests
                .filter((request) => !["completed", "cancelled"].includes(request.status))
                .map((request) => (
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
                      <CardDescription>
                        Requested on {new Date(request.created_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <p className="font-medium">Quantity</p>
                          <p className="text-muted-foreground">
                            {getSizeLabel(request.size_category, request.estimated_quantity)}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Expected Earnings</p>
                          <p className="text-muted-foreground">₹{request.estimated_price || "TBD"}</p>
                        </div>
                        {request.vendor_name && (
                          <>
                            <div>
                              <p className="font-medium">Assigned Vendor</p>
                              <p className="text-muted-foreground">{request.vendor_name}</p>
                            </div>
                            <div>
                              <p className="font-medium">Contact</p>
                              <p className="text-muted-foreground">{request.vendor_contact}</p>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {request.status === "pending" && (
                          <Button variant="outline" size="sm" onClick={() => handleCancelRequest(request.request_id)}>
                            <X className="mr-2 h-4 w-4" />
                            Cancel Request
                          </Button>
                        )}

                        {request.vendor_contact && (
                          <Button variant="outline" size="sm" onClick={() => handleCallVendor(request.vendor_contact)}>
                            <Phone className="mr-2 h-4 w-4" />
                            Call Vendor
                          </Button>
                        )}
                      </div>

                      {request.status === "assigned" && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <Truck className="inline h-4 w-4 mr-1" />
                            Vendor has been assigned and will contact you soon for pickup scheduling.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

              {pickupRequests.filter((r) => !["completed", "cancelled"].includes(r.status)).length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No active pickup requests</p>
                    <Button className="mt-4" onClick={() => setShowCreateRequest(true)}>
                      Create Your First Request
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="grid gap-4">
              {pickupRequests
                .filter((request) => ["completed", "cancelled"].includes(request.status))
                .map((request) => (
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
                      <CardDescription>{new Date(request.created_at).toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <p className="font-medium">Quantity</p>
                          <p className="text-muted-foreground">
                            {getSizeLabel(request.size_category, request.actual_quantity || request.estimated_quantity)}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Amount Earned</p>
                          <p className="text-muted-foreground">₹{request.total_amount || "N/A"}</p>
                        </div>
                        {request.vendor_name && (
                          <>
                            <div>
                              <p className="font-medium">Vendor</p>
                              <p className="text-muted-foreground">{request.vendor_name}</p>
                            </div>
                            <div>
                              <p className="font-medium">Rating</p>
                              <p className="text-muted-foreground">
                                {request.vendor_rating ? `⭐ ${request.vendor_rating}/5` : "Not rated"}
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      {request.status === "completed" && !request.vendor_rating && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request)
                            setShowRatingModal(true)
                          }}
                        >
                          <Star className="mr-2 h-4 w-4" />
                          Rate Vendor
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}

              {pickupRequests.filter((r) => ["completed", "cancelled"].includes(r.status)).length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No pickup history yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Pickup Request Modal */}
      <Dialog open={showCreateRequest} onOpenChange={setShowCreateRequest}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Pickup Request</DialogTitle>
            <DialogDescription>Fill in the details for your waste pickup request</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="waste-type">Waste Type</Label>
              <Select value={wasteType} onValueChange={setWasteType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select waste type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plastic">Plastic</SelectItem>
                  <SelectItem value="paper">Paper</SelectItem>
                  <SelectItem value="metal">Metal</SelectItem>
                  <SelectItem value="glass">Glass</SelectItem>
                  <SelectItem value="electronic">Electronic</SelectItem>
                  <SelectItem value="organic">Organic</SelectItem>
                  <SelectItem value="mixed">Mixed Recyclables</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Approximate Weight</Label>
              <RadioGroup value={wasteWeight} onValueChange={setWasteWeight} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="small" id="small" />
                  <Label htmlFor="small">Small (0-5 kg)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" />
                  <Label htmlFor="medium">Medium (5-15 kg)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="large" id="large" />
                  <Label htmlFor="large">Large (15+ kg)</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="waste-image">Waste Image (Optional)</Label>
              <Input
                id="waste-image"
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  setWasteImage(file)
                }}
                className="cursor-pointer"
              />
              <p className="text-sm text-muted-foreground mt-1">Upload a photo of your waste (JPG, PNG only)</p>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateRequest(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreatePickupRequest}
                disabled={submittingRequest}
                className="bg-green-600 hover:bg-green-700"
              >
                {submittingRequest ? "Creating..." : "Submit Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Funds Modal */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>Transfer money from your EcoSync wallet to your bank account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="withdraw-amount">Amount to Withdraw</Label>
              <Input
                id="withdraw-amount"
                type="number"
                placeholder="Enter amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                max={citizenData?.wallet_balance || 0}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Available balance: ₹{citizenData?.wallet_balance?.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowWithdrawModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleWithdrawFunds}>Withdraw</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Redeem Coins Modal */}
      <Dialog open={showRedeemModal} onOpenChange={setShowRedeemModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem Eco-Coins</DialogTitle>
            <DialogDescription>Convert your eco-coins to cash (1 coin = ₹2)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="redeem-coins">Coins to Redeem</Label>
              <Input
                id="redeem-coins"
                type="number"
                placeholder="Enter number of coins"
                value={redeemCoins}
                onChange={(e) => setRedeemCoins(e.target.value)}
                max={citizenData?.eco_coins || 0}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Available coins: {citizenData?.eco_coins || 0} (Worth: ₹{((citizenData?.eco_coins || 0) * 2).toFixed(2)}
                )
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowRedeemModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleRedeemCoins}>Redeem</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rating Modal */}
      <Dialog open={showRatingModal} onOpenChange={setShowRatingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Vendor</DialogTitle>
            <DialogDescription>Share your experience with {selectedRequest?.vendor_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rating</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-2xl ${star <= rating ? "text-yellow-400" : "text-gray-300"}`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="feedback">Feedback (Optional)</Label>
              <Textarea
                id="feedback"
                placeholder="Share your experience..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowRatingModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleRateVendor}>Submit Rating</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
