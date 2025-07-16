"use client"

import { useAuth } from "@/components/auth-provider"
import { LandingPage } from "@/components/landing-page"
import { DashboardRouter } from "@/components/dashboard-router"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"

export default function HomePage() {
  const { user, userRole, loading } = useAuth()

  // Debug logging
  useEffect(() => {
    console.log("🔍 HomePage State:", {
      user: user?.attributes?.email || "none",
      userRole,
      loading,
    })
  }, [user, userRole, loading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    console.log("👤 No user found, showing landing page")
    return <LandingPage />
  }

  console.log("🚀 User found, showing dashboard for role:", userRole)
  return <DashboardRouter userRole={userRole} />
}
