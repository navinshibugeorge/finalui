"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Database, Settings, RefreshCw } from "lucide-react"

export function DevHelper() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Only show in development
  if (process.env.NODE_ENV !== "development") {
    return null
  }

  const isAWSConfigured = !!(
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID && process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID
  )

  const clearAuthCache = async () => {
    setLoading(true)
    try {
      // Clear only auth-related cache
      localStorage.removeItem("mockAuth_currentUser")
      sessionStorage.clear()

      toast({
        title: "Auth Cache Cleared",
        description: "Authentication cache cleared. You can now sign in again.",
      })

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const clearAllData = async () => {
    setLoading(true)
    try {
      // Clear all mock data
      const keys = Object.keys(localStorage)
      keys.forEach((key) => {
        if (key.startsWith("mockAuth_") || key.startsWith("mockAPI_")) {
          localStorage.removeItem(key)
        }
      })
      sessionStorage.clear()

      toast({
        title: "All Data Cleared",
        description: "All mock data has been cleared. App will reload.",
        variant: "destructive",
      })

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const viewStoredData = () => {
    const users = localStorage.getItem("mockAuth_users")
    const requests = localStorage.getItem("mockAPI_pickup_requests")

    console.log("📊 Stored Users:", users ? JSON.parse(users) : "None")
    console.log("📊 Stored Pickup Requests:", requests ? JSON.parse(requests) : "None")

    toast({
      title: "Data Logged",
      description: "Check browser console for stored data details",
    })
  }

  const setupAWS = () => {
    toast({
      title: "AWS Setup Required",
      description: "Please configure your AWS environment variables in .env.local",
    })
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-orange-600" />
          <CardTitle className="text-sm text-orange-800">Dev Helper</CardTitle>
          <Badge variant={isAWSConfigured ? "default" : "destructive"} className="text-xs">
            {isAWSConfigured ? "AWS" : "MOCK"}
          </Badge>
        </div>
        <CardDescription className="text-xs text-orange-700">
          {isAWSConfigured ? "AWS Cognito is configured and ready" : "Using mock authentication - AWS not configured"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          onClick={clearAuthCache}
          disabled={loading}
          size="sm"
          variant="outline"
          className="w-full text-xs bg-transparent"
        >
          <RefreshCw className="mr-2 h-3 w-3" />
          Clear Auth Cache
        </Button>

        <Button onClick={viewStoredData} size="sm" variant="outline" className="w-full text-xs bg-transparent">
          <Database className="mr-2 h-3 w-3" />
          View Stored Data
        </Button>

        <Button
          onClick={clearAllData}
          disabled={loading}
          size="sm"
          variant="outline"
          className="w-full text-xs bg-transparent text-red-600 hover:text-red-700"
        >
          <Trash2 className="mr-2 h-3 w-3" />
          Clear All Data
        </Button>

        {!isAWSConfigured && (
          <Button onClick={setupAWS} size="sm" variant="outline" className="w-full text-xs bg-transparent">
            <Settings className="mr-2 h-3 w-3" />
            Setup AWS
          </Button>
        )}

        <div className="text-xs text-orange-600 mt-2">
          <p>
            <strong>Test Accounts {!isAWSConfigured && "(Mock)"}:</strong>
          </p>
          <p>• citizen@test.com</p>
          <p>• vendor@test.com</p>
          <p>• industry@test.com</p>
          <p>• admin@test.com</p>
          <p>
            <strong>Password:</strong> Test123!
          </p>
          {!isAWSConfigured && (
            <p className="mt-2 text-xs">
              <strong>Confirmation Code:</strong> Any 6 digits (e.g., 123456)
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
