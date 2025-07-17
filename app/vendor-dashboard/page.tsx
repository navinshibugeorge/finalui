"use client"

import { useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { VendorDashboard } from "@/components/dashboards/vendor-dashboard"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"

export default function VendorDashboardPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/")
        return
      }

      // Check if user is a vendor
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single()

      if (!profile || profile.role !== "vendor") {
        router.push("/")
      }
    }

    checkAuth()
  }, [router, supabase])

  return (
    <DashboardLayout title="Vendor Dashboard" userRole="vendor">
      <VendorDashboard />
    </DashboardLayout>
  )
}
