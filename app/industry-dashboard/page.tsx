"use client"

import { useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { IndustryDashboard } from "@/components/dashboards/industry-dashboard"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"

export default function IndustryDashboardPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/")
        return
      }

      // Check if user is from industry
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single()

      if (!profile || profile.role !== "industry") {
        router.push("/")
      }
    }

    checkAuth()
  }, [router, supabase])

  return (
    <DashboardLayout title="Industry Dashboard" userRole="industry">
      <IndustryDashboard />
    </DashboardLayout>
  )
}
