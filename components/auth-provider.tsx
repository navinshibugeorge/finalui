"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { auth } from "@/lib/auth"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  profile: any
  userRole: string | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  userRole: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      const { user, profile, error } = await auth.getSession()
      
      if (error) {
        console.error("Error checking auth state:", error)
        return
      }

      setUser(user)
      setProfile(profile)
      
      if (user) {
        // Fetch user role from profiles table
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        setUserRole(profileData?.role || null)
        console.log("🎭 User role set to:", profileData?.role)
      }
    } catch (error) {
      console.error("Error checking auth state:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    try {
      const { error } = await auth.signOut()
      if (error) throw error
      setUser(null)
      setProfile(null)
      window.location.href = "/"

      console.log("✅ User signed out successfully")

      // Force page reload to ensure clean state
      setTimeout(() => {
        window.location.href = "/"
      }, 500)
    } catch (error) {
      console.error("❌ Error signing out:", error)
      // Even if there's an error, clear the state and redirect
      setUser(null)
      setProfile(null)
      window.location.href = "/"
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, userRole, loading, signOut: handleSignOut }}>{children}</AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
