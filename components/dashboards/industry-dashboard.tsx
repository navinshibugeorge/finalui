"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Battery,
  Truck,
  FileText,
  Settings,
  Eye,
  Download,
  Plus,
  Edit,
  Bell,
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { pickupRequestService } from "@/lib/pickup-request-service"
import { vendorSelectionAlgorithm } from "@/lib/vendor-selection-algorithm"

export function IndustryDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [bins, setBins] = useState<any[]>([])
  const [pickupRequests, setPickupRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBin, setSelectedBin] = useState<any>(null)
  const [showBinModal, setShowBinModal] = useState(false)
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set())
  
  // Track bins that have already triggered 80% notifications in this session
  // This persists until page refresh, preventing duplicate notifications
  const [notifiedBins, setNotifiedBins] = useState<Set<string>>(new Set())
  
  // Keep track of bins that currently have active pickup requests
  const [binsWithActiveRequests, setBinsWithActiveRequests] = useState<Set<string>>(new Set())

  // API endpoints for individual bins
  const BIN_ENDPOINTS = [
    "https://pmwocc8fz1.execute-api.eu-north-1.amazonaws.com/prod/GetIndustryBinData?binid=BIN001",
    "https://pmwocc8fz1.execute-api.eu-north-1.amazonaws.com/prod/GetIndustryBinData?binid=BIN002",
    "https://pmwocc8fz1.execute-api.eu-north-1.amazonaws.com/prod/GetIndustryBinData?binid=BIN003",
    "https://pmwocc8fz1.execute-api.eu-north-1.amazonaws.com/prod/GetIndustryBinData?binid=BIN004",
    "https://pmwocc8fz1.execute-api.eu-north-1.amazonaws.com/prod/GetIndustryBinData?binid=BIN005"
  ]

  // Function to fetch data from individual bin endpoints
  const fetchBinData = async (showLoadingSpinner = false) => {
    try {
      if (showLoadingSpinner) {
        setLoading(true)
      }

      // Check if user is authenticated
      if (!user?.id) {
        console.warn('User not authenticated, skipping bin data fetch')
        return
      }
      
      // Fetch data from all 5 bin endpoints concurrently
      const promises = BIN_ENDPOINTS.map(endpoint => 
        fetch(endpoint).then(response => response.json())
      )
      
      const results = await Promise.all(promises)
      
      // Flatten the results and transform data
      const allBinData = results.flat()
      const transformedBins = allBinData.map((item: any) => ({
        bin_id: item.binid,
        waste_type: item.type_of_waste,
        fill_level: item.filllevel,
        status: getStatusFromFillLevel(item.filllevel),
        location: item.industry_address,
        coordinates: "11.9611, 89.5900", // Default coordinates
        last_updated: item.timestamp,
        capacity: item.total_bin_volume,
        temperature: 25, // Default temperature
        humidity: 60, // Default humidity
        battery_level: 85, // Default battery level
        quality_grade: getQualityGrade(item.waste_quality),
        avg_fill_time: "2.5 days", // Default avg fill time
        condition_image: `/placeholder.svg?height=200&width=300&text=${item.type_of_waste.toUpperCase()}+WASTE`,
        waste_quality: item.waste_quality,
        volume: item.volume,
        pickup_request: item.pickup_request,
        industry_name: item.industry_name,
        industry_id: user?.id || null, // Use authenticated user's UUID instead of API's industry_id
        factory_id: user?.id || null,  // Add factory_id as well
      }))

      // Filter out bins that don't have a valid factory_id
      const validBins = transformedBins.filter(bin => bin.factory_id)
      
      console.log('Transformed bins:', validBins.length, 'valid bins out of', transformedBins.length)
      
      setBins(validBins)
      
      // Check for bins above 80% and create pickup requests
      const highFillBins = validBins.filter(bin => bin.fill_level >= 80)
      
      // Get existing pickup requests to check which bins already have active requests
      const existingRequests = pickupRequests.filter(req => 
        req.status === 'pending' || req.status === 'assigned' || req.status === 'bidding'
      )
      const binsWithActiveRequestsByType = new Set(existingRequests.map(req => req.waste_type))
      
      // Update the state for bins with active requests
      setBinsWithActiveRequests(binsWithActiveRequestsByType)
      
      console.log('High fill bins:', highFillBins.length)
      console.log('Existing active requests:', existingRequests.length)
      console.log('Bins with active requests:', Array.from(binsWithActiveRequestsByType))
      console.log('Previously notified bins:', Array.from(notifiedBins))
      
      for (const bin of highFillBins) {
        const binKey = `${bin.waste_type}_${bin.bin_id}`
        
        // Only create request if:
        // 1. Not currently processing this bin
        // 2. Haven't notified for this bin in current session (until page refresh)
        // 3. No active request exists for this waste type
        // 4. User is authenticated
        const shouldCreateRequest = !processingRequests.has(bin.bin_id) && 
                                  !notifiedBins.has(binKey) && 
                                  !binsWithActiveRequestsByType.has(bin.waste_type) && 
                                  user?.id
        
        console.log(`Bin ${bin.bin_id} (${bin.waste_type}): shouldCreateRequest=${shouldCreateRequest}`)
        console.log(`  - Processing: ${processingRequests.has(bin.bin_id)}`)
        console.log(`  - Already notified: ${notifiedBins.has(binKey)}`)
        console.log(`  - Has active request: ${binsWithActiveRequestsByType.has(bin.waste_type)}`)
        
        if (shouldCreateRequest) {
          console.log(`Creating pickup request for bin ${bin.bin_id} - first time reaching 80% in this session`)
          
          // Mark this bin as notified for the current session
          setNotifiedBins(prev => new Set(prev).add(binKey))
          
          createPickupRequestForBin(bin)
        }
      }
      
      // Fetch current pickup requests
      if (user?.id) {
        fetchIndustryPickupRequests()
      }
    } catch (error) {
      console.error('Error fetching bin data:', error)
      toast({
        title: "Error",
        description: "Failed to fetch bin data. Please try again.",
        variant: "destructive",
      })
    } finally {
      if (showLoadingSpinner) {
        setLoading(false)
      }
    }
  }

  // Helper function to determine status based on fill level
  const getStatusFromFillLevel = (fillLevel: number) => {
    if (fillLevel >= 90) return "critical"
    if (fillLevel >= 70) return "high"
    if (fillLevel >= 40) return "medium"
    return "low"
  }

  // Helper function to get quality grade
  const getQualityGrade = (quality: string) => {
    switch (quality) {
      case "good":
        return "A"
      case "moderate":
        return "B"
      case "poor":
        return "C"
      case "hazardous":
        return "D"
      default:
        return "B"
    }
  }

  // Create pickup request for bins above 80%
  const createPickupRequestForBin = async (bin: any) => {
    try {
      setProcessingRequests(prev => new Set(prev).add(bin.bin_id))
      
      // Ensure we have the required user ID
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      // Ensure bin has required factory_id
      if (!bin.factory_id) {
        console.error('Missing factory_id in bin data:', bin)
        throw new Error('Factory ID is missing from bin data')
      }

      console.log('Creating pickup request for bin:', bin.bin_id, 'with factory_id:', bin.factory_id)
      
      // Use the vendor selection algorithm to process the bin alert
      const vendorResults = await vendorSelectionAlgorithm.processBinAlert({
        binId: bin.bin_id,
        factoryId: bin.factory_id,
        wasteType: bin.waste_type,
        fillLevel: bin.fill_level,
        location: bin.location,
        industryName: bin.industry_name
      })
      
      // Show success message with vendor count
      toast({
        title: "Pickup Request Created",
        description: `Automatic pickup request created for bin ${bin.bin_id} (${bin.fill_level}% full). ${vendorResults.length} compatible vendors notified.`,
      })
      
      // Refresh pickup requests
      if (user?.id) {
        fetchIndustryPickupRequests()
      }
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        // If request already exists, just silently continue
        console.log('Pickup request already exists for bin:', bin.bin_id)
      } else {
        console.error('Error creating pickup request:', error)
        toast({
          title: "Error",
          description: error.message || "Failed to create pickup request",
          variant: "destructive",
        })
        
        // Don't remove from notifiedBins on error - keep session-based tracking
        // The bin will remain marked as notified until page refresh
        console.log(`Keeping bin ${bin.bin_id} marked as notified despite error`)
      }
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(bin.bin_id)
        return newSet
      })
    }
  }

  // Fetch pickup requests for this industry
  const fetchIndustryPickupRequests = async () => {
    try {
      if (!user?.id) return
      
      const requests = await pickupRequestService.getIndustryPickupRequests(user.id)
      setPickupRequests(requests)
      
      // Update bins with active requests for status tracking
      const activeRequests = requests.filter(req => 
        req.status === 'pending' || req.status === 'assigned' || req.status === 'bidding'
      )
      const activeWasteTypes = new Set(activeRequests.map(req => req.waste_type))
      setBinsWithActiveRequests(activeWasteTypes)
      
    } catch (error) {
      console.error('Error fetching pickup requests:', error)
    }
  }

  const criticalBins = bins.filter((bin) => bin.fill_level >= 90)
  const highFillBins = bins.filter((bin) => bin.fill_level >= 80)
  const lowBatteryBins = bins.filter((bin) => bin.battery_level < 20)
  const completedPickups = pickupRequests.filter((req) => req.status === "completed").length

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (user?.id) {
      // Fetch data on component mount with loading spinner
      fetchBinData(true)
      
      // Set up real-time updates every 30 seconds (background updates)
      const interval = setInterval(() => fetchBinData(false), 30000)
      
      // Cleanup interval on unmount
      return () => clearInterval(interval)
    }
  }, [user?.id]) // Add user?.id as dependency

  useEffect(() => {
    // Fetch pickup requests when user changes
    if (user?.id) {
      fetchIndustryPickupRequests()
    }
  }, [user?.id])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical":
        return "bg-red-100 text-red-800"
      case "high":
        return "bg-orange-100 text-orange-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      case "assigned":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "critical":
        return <AlertTriangle className="h-4 w-4" />
      case "high":
        return <Clock className="h-4 w-4" />
      case "low":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <CheckCircle className="h-4 w-4" />
    }
  }

  const fillLevelDistribution = {
    critical: bins.filter((bin) => bin.fill_level >= 90).length,
    high: bins.filter((bin) => bin.fill_level >= 70 && bin.fill_level < 90).length,
    medium: bins.filter((bin) => bin.fill_level >= 40 && bin.fill_level < 70).length,
    low: bins.filter((bin) => bin.fill_level < 40).length,
  }

  return (
    <DashboardLayout title="Industry Dashboard" userRole="industry">
      <div className="space-y-6">
        {/* Header with refresh button */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Industry Dashboard</h2>
            <p className="text-muted-foreground">Monitor your waste bins in real-time</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Data</span>
            </div>
            <Button onClick={() => fetchBinData(true)} disabled={loading}>
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              ) : (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  Refresh Data
                </>
              )}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bins</CardTitle>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{bins.length}</div>
                  <p className="text-xs text-muted-foreground">Number of active bins</p>
                </CardContent>
              </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bins {">"} 80% Filled</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{highFillBins.length}</div>
              <p className="text-xs text-muted-foreground">Bins needing urgent attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pickups This Week</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedPickups}</div>
              <p className="text-xs text-muted-foreground">Total completed pickups</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Battery Bins</CardTitle>
              <Battery className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{lowBatteryBins.length}</div>
              <p className="text-xs text-muted-foreground">Sensors with {"<"}20% battery</p>
            </CardContent>
          </Card>
        </div>

        {/* Critical Alerts */}
        {criticalBins.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>{criticalBins.length} bin(s)</strong> are critically full and require immediate pickup!
            </AlertDescription>
          </Alert>
        )}

        {/* Pickup Request Alert */}
        {bins.filter(bin => bin.pickup_request).length > 0 && (
          <Alert className="border-blue-200 bg-blue-50">
            <Truck className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>{bins.filter(bin => bin.pickup_request).length} bin(s)</strong> have active pickup requests.
            </AlertDescription>
          </Alert>
        )}

        {/* High Fill Level Info */}
        {highFillBins.length > 0 && (
          <Alert className="border-blue-200 bg-blue-50">
            <Bell className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>{highFillBins.length} bin(s)</strong> have reached 80%+ capacity. 
              Pickup requests are sent automatically <strong>once per session</strong> when bins first reach 80%. 
              Refresh the page to allow notifications again.
            </AlertDescription>
          </Alert>
        )}

        {/* Hazardous Waste Alert */}
        {bins.filter(bin => bin.waste_quality === 'hazardous').length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>{bins.filter(bin => bin.waste_quality === 'hazardous').length} bin(s)</strong> contain hazardous waste requiring special handling.
            </AlertDescription>
          </Alert>
        )}        {/* Session Tracking Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                🔧 Session Tracking Debug
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Bins Notified This Session</p>
                  <p className="text-muted-foreground">
                    {notifiedBins.size > 0 ? Array.from(notifiedBins).join(', ') : 'None'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    These bins have triggered 80% notifications and won't send again until page refresh
                  </p>
                </div>
                <div>
                  <p className="font-medium">Bins with Active Requests</p>
                  <p className="text-muted-foreground">
                    {binsWithActiveRequests.size > 0 ? Array.from(binsWithActiveRequests).join(', ') : 'None'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Waste types that currently have pending/assigned requests
                  </p>
                </div>
                <div>
                  <p className="font-medium">High Fill Bins (≥80%)</p>
                  <p className="text-muted-foreground">
                    {highFillBins.map(bin => `${bin.bin_id} (${bin.fill_level}%)`).join(', ') || 'None'}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Currently Processing</p>
                  <p className="text-muted-foreground">
                    {processingRequests.size > 0 ? Array.from(processingRequests).join(', ') : 'None'}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    console.log('=== SESSION TRACKING DEBUG ===')
                    console.log('Notified bins:', Array.from(notifiedBins))
                    console.log('Bins with active requests:', Array.from(binsWithActiveRequests))
                    console.log('High fill bins:', highFillBins.map(b => `${b.bin_id}: ${b.fill_level}%`))
                    console.log('Currently processing:', Array.from(processingRequests))
                  }}
                >
                  Log Debug Info
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setNotifiedBins(new Set())
                    toast({
                      title: "Session Reset",
                      description: "Cleared notified bins tracking. Bins ≥80% can now trigger notifications again.",
                    })
                  }}
                >
                  Reset Session Tracking
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bins">Bin Management</TabsTrigger>
            <TabsTrigger value="pickups">Pickup Requests</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Fill Level Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Fill Level Distribution</CardTitle>
                  <CardDescription>Current status of all bins</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm">Critical ({">"} 90%)</span>
                      </div>
                      <span className="text-sm font-medium">{fillLevelDistribution.critical}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-sm">High (70-90%)</span>
                      </div>
                      <span className="text-sm font-medium">{fillLevelDistribution.high}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm">Medium (40-70%)</span>
                      </div>
                      <span className="text-sm font-medium">{fillLevelDistribution.medium}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Low ({"<"} 40%)</span>
                      </div>
                      <span className="text-sm font-medium">{fillLevelDistribution.low}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bins by Fill Percentage</CardTitle>
                  <CardDescription>Visual representation of bin levels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {bins.map((bin) => (
                      <div key={bin.bin_id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{bin.bin_id}</span>
                          <span>{bin.fill_level}%</span>
                        </div>
                        <Progress value={bin.fill_level} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bins" className="space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Bin Status</h3>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bin ID</TableHead>
                      <TableHead>Waste Type</TableHead>
                      <TableHead>Fill Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bins.map((bin) => (
                      <TableRow key={bin.bin_id}>
                        <TableCell className="font-medium">{bin.bin_id}</TableCell>
                        <TableCell className="capitalize">{bin.waste_type}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={bin.fill_level} className="w-16 h-2" />
                            <span className="text-sm">{bin.fill_level}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(bin.status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(bin.status)}
                                {bin.status.toUpperCase()}
                              </div>
                            </Badge>
                            {/* Show notification status for bins ≥80% */}
                            {bin.fill_level >= 80 && (
                              <Badge 
                                variant={notifiedBins.has(`${bin.waste_type}_${bin.bin_id}`) ? "default" : "secondary"}
                                className={notifiedBins.has(`${bin.waste_type}_${bin.bin_id}`) 
                                  ? "bg-blue-100 text-blue-800" 
                                  : "bg-orange-100 text-orange-800"}
                              >
                                {notifiedBins.has(`${bin.waste_type}_${bin.bin_id}`) 
                                  ? "Notified" 
                                  : "Ready to Notify"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{bin.location}</TableCell>
                        <TableCell>{new Date(bin.last_updated).toLocaleString()}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedBin(bin)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Bin Profile - {selectedBin?.bin_id}</DialogTitle>
                                <DialogDescription>Detailed information about this waste bin</DialogDescription>
                              </DialogHeader>
                              {selectedBin && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-semibold mb-2">Basic Information</h4>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span>Waste Type:</span>
                                          <span className="capitalize">{selectedBin.waste_type}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Fill Level:</span>
                                          <span>{selectedBin.fill_level}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Capacity:</span>
                                          <span>{selectedBin.capacity}L</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Current Volume:</span>
                                          <span>{selectedBin.volume}L</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Quality Grade:</span>
                                          <span>{selectedBin.quality_grade}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Waste Quality:</span>
                                          <span className="capitalize">{selectedBin.waste_quality}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Pickup Request:</span>
                                          <span>{selectedBin.pickup_request ? 'Yes' : 'No'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Battery Level:</span>
                                          <span>{selectedBin.battery_level}%</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-2">Location</h4>
                                      <p className="text-sm text-muted-foreground">{selectedBin.location}</p>
                                      <p className="text-xs text-muted-foreground">{selectedBin.coordinates}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-2">Industry Details</h4>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span>Industry Name:</span>
                                          <span>{selectedBin.industry_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Industry ID:</span>
                                          <span>{selectedBin.industry_id}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-semibold mb-2">Condition Image</h4>
                                      <div className="w-full h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                                        <img
                                          src={selectedBin.condition_image || "/placeholder.svg"}
                                          alt={`${selectedBin.waste_type} waste`}
                                          className="w-full h-full object-cover rounded-lg"
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-2">Environmental Data</h4>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span>Temperature:</span>
                                          <span>{selectedBin.temperature}°C</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Humidity:</span>
                                          <span>{selectedBin.humidity}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Last Updated:</span>
                                          <span>{new Date(selectedBin.last_updated).toLocaleString()}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pickups" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Pickup Requests</h3>
              <Button onClick={fetchIndustryPickupRequests}>
                <Bell className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Waste Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bids</TableHead>
                      <TableHead>Assigned Vendor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pickupRequests.map((request) => {
                      const bids = request.vendor_bids || []
                      const highestBid = bids.length > 0 ? Math.max(...bids.map((bid: any) => bid.bid_amount)) : 0
                      const winningBid = bids.find((bid: any) => bid.status === 'won')
                      
                      return (
                        <TableRow key={request.request_id}>
                          <TableCell className="font-medium">
                            {request.request_id.substring(0, 8)}...
                          </TableCell>
                          <TableCell className="capitalize">{request.waste_type}</TableCell>
                          <TableCell>{request.estimated_quantity} kg</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(request.status)}>
                              {request.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{bids.length}</span>
                              {highestBid > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  High: ₹{highestBid}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {winningBid ? (
                              <div className="text-sm space-y-1">
                                <div className="font-medium">{request.assigned_vendor_name || winningBid.vendor_name}</div>
                                {request.assigned_vendor_company && (
                                  <div className="text-muted-foreground text-xs font-medium">
                                    🏢 {request.assigned_vendor_company}
                                  </div>
                                )}
                                <div className="text-muted-foreground text-xs">
                                  📞 {request.assigned_vendor_contact || winningBid.vendor_contact}
                                </div>
                                {request.assigned_vendor_email && (
                                  <div className="text-muted-foreground text-xs">
                                    ✉️ {request.assigned_vendor_email}
                                  </div>
                                )}
                                {request.assigned_vendor_address && (
                                  <div className="text-muted-foreground text-xs">
                                    📍 {request.assigned_vendor_address}
                                  </div>
                                )}
                                <div className="text-green-600 text-xs font-medium mt-1">
                                  💰 Winning Bid: ₹{request.winning_bid_amount || winningBid.bid_amount}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {request.total_amount ? (
                              <span className="font-medium">₹{request.total_amount}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(request.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {pickupRequests.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Truck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Pickup Requests</h3>
                  <p className="text-muted-foreground">
                    Pickup requests will be automatically created when bins reach 80% capacity.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Automatic Pickup System</CardTitle>
                <CardDescription>How our intelligent pickup system works</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-blue-600">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Automatic Detection</h4>
                      <p className="text-sm text-muted-foreground">
                        When any bin reaches 80% capacity, a pickup request is automatically created.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-blue-600">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Vendor Bidding</h4>
                      <p className="text-sm text-muted-foreground">
                        Vendors have 5 minutes to submit their bids for the pickup request.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-blue-600">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Winner Selection</h4>
                      <p className="text-sm text-muted-foreground">
                        The vendor with the highest bid wins the pickup contract automatically.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Reports</h3>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Export All
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Waste Collected</CardTitle>
                  <CardDescription>Total waste processed this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">2,450 kg</div>
                  <p className="text-sm text-muted-foreground mt-2">+12% from last month</p>
                  <Button variant="outline" size="sm" className="mt-4 bg-transparent">
                    <FileText className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vendor Performance</CardTitle>
                  <CardDescription>Average ratings and response times</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">WasteGo Pvt</span>
                      <span className="text-sm font-medium">4.8/5.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">RecyloLogix</span>
                      <span className="text-sm font-medium">4.6/5.0</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-4 bg-transparent">
                    <FileText className="mr-2 h-4 w-4" />
                    Full Report
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Billing History</CardTitle>
                  <CardDescription>Dynamic pricing and payment records</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">₹18,750</div>
                  <p className="text-sm text-muted-foreground mt-2">Total spent this month</p>
                  <Button variant="outline" size="sm" className="mt-4 bg-transparent">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Environmental Impact</CardTitle>
                  <CardDescription>Your sustainability metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">CO₂ Saved</span>
                      <span className="text-sm font-medium">125 kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Recycling Rate</span>
                      <span className="text-sm font-medium">94%</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-4 bg-transparent">
                    <FileText className="mr-2 h-4 w-4" />
                    Impact Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <h3 className="text-lg font-semibold">Settings & Preferences</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bin Management</CardTitle>
                  <CardDescription>Configure your waste bins</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Edit className="mr-2 h-4 w-4" />
                    Waste Type → Bin Mapping
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pickup Settings</CardTitle>
                  <CardDescription>Control pickup preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <MapPin className="mr-2 h-4 w-4" />
                    Pickup Radius Control
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Truck className="mr-2 h-4 w-4" />
                    Vendor Preferences
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Alert preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Bell className="mr-2 h-4 w-4" />
                    Alert Notifications
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Configure alerts for battery levels, fill percentages, and pickup schedules
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>Manage your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Settings className="mr-2 h-4 w-4" />
                    Company Profile
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <FileText className="mr-2 h-4 w-4" />
                    Billing Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
