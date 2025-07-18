"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Clock, MapPin, Truck, DollarSign, AlertTriangle, CheckCircle, Factory } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { pickupRequestService, type PickupRequest, type VendorBid } from '@/lib/pickup-request-service'

export function VendorBidding() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [pickupRequests, setPickupRequests] = useState<PickupRequest[]>([])
  const [bids, setBids] = useState<{ [key: string]: VendorBid[] }>({})
  const [bidAmounts, setBidAmounts] = useState<{ [key: string]: string }>({})
  const [timers, setTimers] = useState<{ [key: string]: number }>({})
  const [loading, setLoading] = useState(true)
  const [submittingBid, setSubmittingBid] = useState<string | null>(null)

  useEffect(() => {
    fetchPickupRequests()
    const interval = setInterval(fetchPickupRequests, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Timer countdown for each request
    const interval = setInterval(() => {
      setTimers(prev => {
        const newTimers = { ...prev }
        Object.keys(newTimers).forEach(requestId => {
          if (newTimers[requestId] > 0) {
            newTimers[requestId] -= 1
          }
        })
        return newTimers
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const fetchPickupRequests = async () => {
    try {
      const requests = await pickupRequestService.getActivePickupRequests()
      setPickupRequests(requests)
      
      // Initialize timers
      const newTimers: { [key: string]: number } = {}
      requests.forEach(request => {
        const timeLeft = Math.max(0, Math.floor((new Date(request.bidding_ends_at).getTime() - Date.now()) / 1000))
        newTimers[request.request_id] = timeLeft
      })
      setTimers(newTimers)

      // Fetch bids for each request
      const newBids: { [key: string]: VendorBid[] } = {}
      await Promise.all(requests.map(async (request) => {
        try {
          const requestBids = await pickupRequestService.getBidsForRequest(request.request_id)
          newBids[request.request_id] = requestBids
        } catch (error) {
          console.error(`Error fetching bids for request ${request.request_id}:`, error)
        }
      }))
      setBids(newBids)
      
      setLoading(false)
    } catch (error) {
      console.error('Error fetching pickup requests:', error)
      toast({
        title: "Error",
        description: "Failed to fetch pickup requests. Please try again.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  const handleSubmitBid = async (requestId: string) => {
    if (!user?.id || !bidAmounts[requestId]) {
      toast({
        title: "Error",
        description: "Please enter a valid bid amount.",
        variant: "destructive",
      })
      return
    }

    const bidAmount = parseFloat(bidAmounts[requestId])
    if (isNaN(bidAmount) || bidAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid bid amount.",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmittingBid(requestId)
      await pickupRequestService.submitBid(requestId, user.id, bidAmount)
      
      toast({
        title: "Success",
        description: "Your bid has been submitted successfully!",
      })

      // Clear the bid input
      setBidAmounts(prev => ({ ...prev, [requestId]: '' }))
      
      // Refresh bids
      const requestBids = await pickupRequestService.getBidsForRequest(requestId)
      setBids(prev => ({ ...prev, [requestId]: requestBids }))
    } catch (error: any) {
      console.error('Error submitting bid:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit bid. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmittingBid(null)
    }
  }

  const formatTimeLeft = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getHighestBid = (requestBids: VendorBid[]): number => {
    return Math.max(...requestBids.map(bid => bid.bid_amount), 0)
  }

  const hasUserBid = (requestBids: VendorBid[]): boolean => {
    return requestBids.some(bid => bid.vendor_id === user?.id)
  }

  const getUserBid = (requestBids: VendorBid[]): VendorBid | null => {
    return requestBids.find(bid => bid.vendor_id === user?.id) || null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Active Pickup Requests</h3>
          <p className="text-sm text-muted-foreground">
            Bid on pickup requests from industries. Highest bid wins!
          </p>
        </div>
        <Button onClick={fetchPickupRequests} size="sm">
          Refresh
        </Button>
      </div>

      {pickupRequests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Truck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Requests</h3>
            <p className="text-muted-foreground">
              There are currently no pickup requests available for bidding.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pickupRequests.map((request) => {
            const timeLeft = timers[request.request_id] || 0
            const requestBids = bids[request.request_id] || []
            const highestBid = getHighestBid(requestBids)
            const userHasBid = hasUserBid(requestBids)
            const userBid = getUserBid(requestBids)
            const isExpired = timeLeft <= 0

            return (
              <Card key={request.request_id} className={`${isExpired ? 'opacity-60' : ''}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Factory className="h-5 w-5" />
                        {request.factory_name}
                      </CardTitle>
                      <CardDescription>
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="h-4 w-4" />
                          {request.factory_address}
                        </div>
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <Badge variant={isExpired ? "secondary" : "default"}>
                        {isExpired ? "Expired" : "Active"}
                      </Badge>
                      <div className="text-sm text-muted-foreground mt-1">
                        ID: {request.request_id.substring(0, 8)}...
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Request Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium">Waste Type</p>
                        <p className="text-sm text-muted-foreground capitalize">{request.waste_type}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Fill Level</p>
                        <p className="text-sm text-muted-foreground">{request.fill_level}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Est. Quantity</p>
                        <p className="text-sm text-muted-foreground">{request.estimated_quantity} kg</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Time Left</p>
                        <p className={`text-sm font-mono ${timeLeft < 60 ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {isExpired ? "00:00" : formatTimeLeft(timeLeft)}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar for Time */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Bidding Progress</span>
                        <span>{Math.max(0, Math.round((300 - timeLeft) / 3))}%</span>
                      </div>
                      <Progress value={Math.max(0, Math.round((300 - timeLeft) / 3))} className="h-2" />
                    </div>

                    {/* Current Bids */}
                    {requestBids.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Current Bids ({requestBids.length})</span>
                          <span className="text-sm font-medium text-green-600">
                            Highest: ₹{highestBid}
                          </span>
                        </div>
                        <div className="bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto">
                          {requestBids.slice(0, 3).map((bid) => (
                            <div key={bid.bid_id} className="flex justify-between items-center py-1">
                              <span className="text-sm">
                                {bid.vendor_name} 
                                {bid.vendor_id === user?.id && (
                                  <Badge variant="outline" className="ml-2">You</Badge>
                                )}
                              </span>
                              <span className="text-sm font-medium">₹{bid.bid_amount}</span>
                            </div>
                          ))}
                          {requestBids.length > 3 && (
                            <div className="text-xs text-muted-foreground mt-2">
                              +{requestBids.length - 3} more bids...
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Bidding Section */}
                    {!isExpired && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {userHasBid ? "Update Your Bid" : "Place Your Bid"}
                          </span>
                        </div>
                        
                        {userBid && (
                          <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                              Your current bid: ₹{userBid.bid_amount}
                              {userBid.bid_amount === highestBid && (
                                <span className="text-green-600 font-medium"> (Highest!)</span>
                              )}
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Enter bid amount"
                            value={bidAmounts[request.request_id] || ''}
                            onChange={(e) => setBidAmounts(prev => ({ 
                              ...prev, 
                              [request.request_id]: e.target.value 
                            }))}
                            disabled={submittingBid === request.request_id}
                          />
                          <Button 
                            onClick={() => handleSubmitBid(request.request_id)}
                            disabled={submittingBid === request.request_id || !bidAmounts[request.request_id]}
                          >
                            {submittingBid === request.request_id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            ) : null}
                            {userHasBid ? "Update Bid" : "Submit Bid"}
                          </Button>
                        </div>
                        
                        {highestBid > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Tip: Current highest bid is ₹{highestBid}. Bid higher to win!
                          </p>
                        )}
                      </div>
                    )}

                    {isExpired && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Bidding has ended for this request. 
                          {highestBid > 0 ? ` Winning bid: ₹${highestBid}` : ' No bids were placed.'}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
