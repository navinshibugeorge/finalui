"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { CitizenDashboard } from "@/components/dashboards/citizen-dashboard"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"

export default function CitizenDashboardPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      console.log("Session:", session)
      
      if (!session) {
        console.log("No session found")
        router.push("/")
        return
      }

      // Check if user is a citizen
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()

      console.log("Profile:", profile)
      console.log("Profile Error:", profileError)
      console.log("User Metadata:", session.user.user_metadata)

      if (profileError) {
        console.error("Error fetching profile:", profileError)
      }

      const userRole = profile?.role

      console.log("User Role:", userRole)

      if (!userRole) {
        console.log("No role found")
        router.push("/")
        return
      }

      if (userRole !== "citizen") {
        console.log("Not a citizen role:", userRole)
        router.push("/")
      }
    }

    checkAuth()
  }, [router, supabase])

  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()
        
        if (profile?.role) {
          setUserRole(profile.role)
        }
      }
    }
    fetchUserRole()
  }, [supabase])

  if (!userRole) {
    return null // or a loading spinner
  }

  return (
    <DashboardLayout title="Citizen Dashboard" userRole={userRole}>
      <CitizenDashboard />
    </DashboardLayout>
  )
}
