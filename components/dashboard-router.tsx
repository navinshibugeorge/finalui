"use client"

import { CitizenDashboard } from "@/components/dashboards/citizen-dashboard"
import { VendorDashboard } from "@/components/dashboards/vendor-dashboard"
import { IndustryDashboard } from "@/components/dashboards/industry-dashboard"
import { AdminDashboard } from "@/components/dashboards/admin-dashboard"
import { useEffect } from "react"

interface DashboardRouterProps {
  userRole: string | null
}

export function DashboardRouter({ userRole }: DashboardRouterProps) {
  useEffect(() => {
    console.log("🎯 DashboardRouter - userRole:", userRole)
  }, [userRole])

  switch (userRole) {
    case "citizen":
      console.log("📱 Rendering CitizenDashboard")
      return <CitizenDashboard />
    case "vendor":
      console.log("🚛 Rendering VendorDashboard")
      return <VendorDashboard />
    case "industry":
      console.log("🏭 Rendering IndustryDashboard")
      return <IndustryDashboard />
    case "admin":
      console.log("👨‍💼 Rendering AdminDashboard")
      return <AdminDashboard />
    default:
      console.log("❌ Unknown or null role:", userRole)
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-4">Your account role is not recognized: "{userRole}"</p>
            <p className="text-sm text-gray-500">Please contact support or try signing in again.</p>
          </div>
        </div>
      )
  }
}
