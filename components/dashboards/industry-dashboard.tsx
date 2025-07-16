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

export function IndustryDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [bins, setBins] = useState<any[]>([])
  const [pickupRequests, setPickupRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBin, setSelectedBin] = useState<any>(null)
  const [showBinModal, setShowBinModal] = useState(false)

  // Mock data for demonstration
  const mockBins = [
    {
      bin_id: "B475",
      waste_type: "plastic",
      fill_level: 94,
      status: "critical",
      location: "Factory Floor A",
      coordinates: "11.9611, 89.5900",
      last_updated: "2024-07-11T15:04:00Z",
      capacity: 100,
      temperature: 28,
      humidity: 65,
      battery_level: 85,
      quality_grade: "A",
      avg_fill_time: "2.5 days",
      condition_image: "/placeholder.svg?height=200&width=300&text=PLASTIC+WASTE",
    },
    {
      bin_id: "B486",
      waste_type: "metal",
      fill_level: 17,
      status: "low",
      location: "Warehouse B",
      coordinates: "11.9943, 89.5457",
      last_updated: "2024-07-11T15:30:00Z",
      capacity: 150,
      temperature: 25,
      humidity: 58,
      battery_level: 15,
      quality_grade: "B",
      avg_fill_time: "4.2 days",
      condition_image: "/placeholder.svg?height=200&width=300&text=METAL+SCRAP",
    },
    {
      bin_id: "B272",
      waste_type: "glass",
      fill_level: 84,
      status: "high",
      location: "Production Line C",
      coordinates: "11.9927, 89.5616",
      last_updated: "2024-07-10T15:20:00Z",
      capacity: 80,
      temperature: 30,
      humidity: 70,
      battery_level: 92,
      quality_grade: "A",
      avg_fill_time: "3.1 days",
      condition_image: "/placeholder.svg?height=200&width=300&text=GLASS+WASTE",
    },
  ]

  const mockPickupRequests = [
    {
      request_id: "RQ2341",
      vendor: "WasteGo Pvt",
      bin_id: "B475",
      quote: 1425,
      eta_window: "4:00–4:30 PM",
      status: "assigned",
      waste_type: "plastic",
    },
    {
      request_id: "RQ2338",
      vendor: "RecyloLogix",
      bin_id: "B272",
      quote: 880,
      eta_window: "2:30–3:00 PM",
      status: "completed",
      waste_type: "glass",
    },
  ]

  useEffect(() => {
    // Use mock data for demonstration
    setBins(mockBins)
    setPickupRequests(mockPickupRequests)
    setLoading(false)
  }, [])

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

  const criticalBins = bins.filter((bin) => bin.fill_level >= 90)
  const highFillBins = bins.filter((bin) => bin.fill_level >= 80)
  const lowBatteryBins = bins.filter((bin) => bin.battery_level < 20)
  const completedPickups = mockPickupRequests.filter((req) => req.status === "completed").length

  const fillLevelDistribution = {
    critical: bins.filter((bin) => bin.fill_level >= 90).length,
    high: bins.filter((bin) => bin.fill_level >= 70 && bin.fill_level < 90).length,
    medium: bins.filter((bin) => bin.fill_level >= 40 && bin.fill_level < 70).length,
    low: bins.filter((bin) => bin.fill_level < 40).length,
  }

  return (
    <DashboardLayout title="Industry Dashboard" userRole="industry">
      <div className="space-y-6">
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
                          <Badge className={getStatusColor(bin.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(bin.status)}
                              {bin.status.toUpperCase()}
                            </div>
                          </Badge>
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
                                          <span>Quality Grade:</span>
                                          <span>{selectedBin.quality_grade}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Avg Fill Time:</span>
                                          <span>{selectedBin.avg_fill_time}</span>
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
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Bin ID</TableHead>
                      <TableHead>Quote</TableHead>
                      <TableHead>ETA Window</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockPickupRequests.map((request) => (
                      <TableRow key={request.request_id}>
                        <TableCell className="font-medium">{request.request_id}</TableCell>
                        <TableCell>{request.vendor}</TableCell>
                        <TableCell>{request.bin_id}</TableCell>
                        <TableCell>₹{request.quote}</TableCell>
                        <TableCell>{request.eta_window}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(request.status)}>{request.status.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            Track
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vendor Assignment Info</CardTitle>
                <CardDescription>Vendors are assigned based on proximity, quote, and availability</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Our smart algorithm considers multiple factors including distance, pricing, vendor ratings, and
                  real-time availability to ensure optimal pickup assignments.
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
      </div>
    </DashboardLayout>
  )
}
