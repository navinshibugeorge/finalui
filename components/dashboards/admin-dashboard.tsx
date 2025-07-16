"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Truck, BarChart3, AlertTriangle, CheckCircle, Clock, DollarSign } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/components/auth-provider"
import { getPickupRequests, getVendors, updatePickupRequest } from "@/lib/aws-api"
import { useToast } from "@/hooks/use-toast"

export function AdminDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVendors: 0,
    totalFactories: 0,
    totalPickups: 0,
    pendingRequests: 0,
    completedRequests: 0,
    totalRevenue: 0,
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchStats()
      fetchRecentActivity()
      fetchVendors()
    }
  }, [user])

  const fetchStats = async () => {
    try {
      // Fetch pickup requests to calculate stats
      const { data: pickupData, error: pickupError } = await getPickupRequests()
      const { data: vendorData, error: vendorError } = await getVendors()

      if (pickupError) console.warn("Could not fetch pickup requests:", pickupError)
      if (vendorError) console.warn("Could not fetch vendors:", vendorError)

      const pickups = pickupData || []
      const vendorList = vendorData || []

      const pendingRequests = pickups.filter((r: any) => r.status === "pending").length
      const completedRequests = pickups.filter((r: any) => r.status === "completed").length
      const totalRevenue = completedRequests * 50 // Mock calculation

      setStats({
        totalUsers: 25, // Mock data
        totalVendors: vendorList.length,
        totalFactories: 8, // Mock data
        totalPickups: pickups.length,
        pendingRequests,
        completedRequests,
        totalRevenue,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
      // Use fallback stats
      setStats({
        totalUsers: 25,
        totalVendors: 5,
        totalFactories: 8,
        totalPickups: 15,
        pendingRequests: 3,
        completedRequests: 12,
        totalRevenue: 600,
      })
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const { data, error } = await getPickupRequests()
      if (error) {
        console.warn("Could not fetch recent activity:", error)
        setRecentActivity([])
      } else {
        // Sort by created_at and take latest 10
        const sortedData = (data || [])
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10)
        setRecentActivity(sortedData)
      }
    } catch (error) {
      console.error("Error fetching recent activity:", error)
      setRecentActivity([])
    } finally {
      setLoading(false)
    }
  }

  const fetchVendors = async () => {
    try {
      const { data, error } = await getVendors()
      if (error) {
        console.warn("Could not fetch vendors:", error)
        setVendors([])
      } else {
        setVendors(data || [])
      }
    } catch (error) {
      console.error("Error fetching vendors:", error)
      setVendors([])
    }
  }

  const handleUpdateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      console.log(`🔄 Updating request ${requestId} to status: ${newStatus}`)

      const { data, error } = await updatePickupRequest(requestId, {
        status: newStatus,
        updated_at: new Date().toISOString(),
      })

      if (error) {
        throw error
      }

      toast({
        title: "Status Updated ✅",
        description: `Request ${requestId} has been updated to ${newStatus}`,
      })

      // Refresh data
      fetchRecentActivity()
      fetchStats()
    } catch (error: any) {
      console.error("❌ Failed to update request status:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update request status",
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
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <DashboardLayout title="Admin Dashboard" userRole="admin">
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalVendors} vendors, {stats.totalFactories} industries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pickups</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPickups}</div>
              <p className="text-xs text-muted-foreground">{stats.completedRequests} completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingRequests}</div>
              <p className="text-xs text-muted-foreground">Awaiting assignment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Total transactions</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pickups">Pickup Management</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest pickup requests and system activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.slice(0, 5).map((activity) => (
                      <div
                        key={activity.request_id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(activity.status)}
                          <div>
                            <p className="font-medium capitalize">
                              {activity.waste_type} pickup - {activity.estimated_quantity}kg
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {activity.user_type === "citizen" ? activity.citizen_name : activity.factory_name} •{" "}
                              {new Date(activity.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(activity.status)}>
                          {activity.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>
                    ))}

                    {recentActivity.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">No recent activity</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>System Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>Active Vendors</span>
                        <Badge variant="outline">{stats.totalVendors}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Connected Industries</span>
                        <Badge variant="outline">{stats.totalFactories}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Pending Assignments</span>
                        <Badge variant={stats.pendingRequests > 0 ? "destructive" : "outline"}>
                          {stats.pendingRequests}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Button className="w-full justify-start">
                        <Users className="mr-2 h-4 w-4" />
                        Manage Users
                      </Button>
                      <Button variant="outline" className="w-full justify-start bg-transparent">
                        <Truck className="mr-2 h-4 w-4" />
                        Review Pickups
                      </Button>
                      <Button variant="outline" className="w-full justify-start bg-transparent">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Generate Reports
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pickups" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pickup Management</CardTitle>
                <CardDescription>Monitor and manage all pickup requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((request) => (
                    <div key={request.request_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(request.status)}
                        <div>
                          <p className="font-medium capitalize">
                            {request.waste_type} - {request.estimated_quantity}kg
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {request.user_type === "citizen" ? request.citizen_name : request.factory_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.replace("_", " ").toUpperCase()}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateRequestStatus(request.request_id, "cancelled")}
                          disabled={request.status === "completed" || request.status === "cancelled"}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateRequestStatus(request.request_id, "completed")}
                          disabled={request.status === "completed" || request.status === "cancelled"}
                        >
                          Mark Complete
                        </Button>
                      </div>
                    </div>
                  ))}

                  {recentActivity.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">No pickup requests found</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vendors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Vendor Management</CardTitle>
                <CardDescription>Monitor vendor performance and activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vendors.map((vendor) => (
                    <div key={vendor.vendor_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{vendor.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {vendor.total_pickups} pickups • ⭐ {vendor.rating}/5 • {vendor.service_radius}km radius
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={vendor.is_active ? "default" : "secondary"}>
                          {vendor.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}

                  {vendors.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">No vendors found</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Analytics</CardTitle>
                  <CardDescription>Comprehensive insights and reporting</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    Advanced analytics dashboard coming soon...
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
