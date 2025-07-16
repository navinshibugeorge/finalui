"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { Hub } from "aws-amplify/utils"
import { getCurrentUser, signOut } from "@/lib/aws-auth"

interface AuthContextType {
  user: any | null
  userRole: string | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const updateUserState = (currentUser: any) => {
    if (currentUser) {
      setUser(currentUser)
      const role = currentUser.attributes?.["custom:role"] || null
      setUserRole(role)
      console.log("✅ User authenticated:", currentUser.attributes?.email, "Role:", role)
    } else {
      setUser(null)
      setUserRole(null)
      console.log("❌ No authenticated user")
    }
  }

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { user: currentUser, error } = await getCurrentUser()
        if (currentUser && !error) {
          updateUserState(currentUser)
        } else {
          updateUserState(null)
        }
      } catch (error) {
        console.log("No authenticated user found")
        updateUserState(null)
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    // Listen for auth events (only if AWS is configured)
    const isAWSConfigured = !!(
      process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID && process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID
    )

    if (isAWSConfigured) {
      const hubListener = (data: any) => {
        const { payload } = data

        switch (payload.event) {
          case "signedIn":
            updateUserState(payload.data)
            break
          case "signedOut":
            updateUserState(null)
            break
          case "signUp":
            console.log("User signed up")
            break
          case "confirmSignUp":
            console.log("User confirmed sign up")
            break
        }
      }

      Hub.listen("auth", hubListener)
      return () => Hub.remove("auth", hubListener)
    }
  }, [])

  const handleSignOut = async () => {
    try {
      console.log("🚪 Signing out user...")

      await signOut()
      updateUserState(null)

      // Only clear current user session, not all stored data
      localStorage.removeItem("mockAuth_currentUser")

      console.log("✅ User signed out successfully")

      // Force page reload to ensure clean state
      setTimeout(() => {
        window.location.href = "/"
      }, 500)
    } catch (error) {
      console.error("❌ Error signing out:", error)
      // Even if there's an error, clear the state and redirect
      updateUserState(null)
      window.location.href = "/"
    }
  }

  return (
    <AuthContext.Provider value={{ user, userRole, loading, signOut: handleSignOut }}>{children}</AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
