// Mock authentication for development when AWS is not configured
interface MockUser {
  username: string
  attributes: {
    email: string
    name: string
    "custom:role": string
    "custom:contact": string
    "custom:address": string
    "custom:company_name"?: string
    "custom:factory_type"?: string
  }
}

class MockAuthService {
  private users: Map<string, { password: string; user: MockUser; confirmed: boolean }> = new Map()
  private currentUser: MockUser | null = null

  constructor() {
    // Load existing users from localStorage on initialization
    this.loadUsersFromStorage()
    this.initializeTestUsers()
  }

  private loadUsersFromStorage() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const storedUsers = window.localStorage.getItem("mockAuth_users")
        if (storedUsers) {
          const usersData = JSON.parse(storedUsers)
          this.users = new Map(Object.entries(usersData))
          console.log("📂 Loaded", this.users.size, "users from storage")
        }
      }
    } catch (error) {
      console.warn("Failed to load users from storage:", error)
    }
  }

  private saveUsersToStorage() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const usersData = Object.fromEntries(this.users.entries())
        window.localStorage.setItem("mockAuth_users", JSON.stringify(usersData))
        console.log("💾 Saved", this.users.size, "users to storage")
      }
    } catch (error) {
      console.warn("Failed to save users to storage:", error)
    }
  }

  private initializeTestUsers() {
    const testUsers = [
      {
        email: "citizen@test.com",
        password: "Test123!",
        user: {
          username: "citizen@test.com",
          attributes: {
            email: "citizen@test.com",
            name: "Test Citizen",
            "custom:role": "citizen",
            "custom:contact": "9876543210",
            "custom:address": "123 Test Street, Test City",
          },
        },
        confirmed: true,
      },
      {
        email: "vendor@test.com",
        password: "Test123!",
        user: {
          username: "vendor@test.com",
          attributes: {
            email: "vendor@test.com",
            name: "Test Vendor",
            "custom:role": "vendor",
            "custom:contact": "9876543211",
            "custom:address": "456 Vendor Lane, Test City",
            "custom:company_name": "Test Waste Solutions",
          },
        },
        confirmed: true,
      },
      {
        email: "industry@test.com",
        password: "Test123!",
        user: {
          username: "industry@test.com",
          attributes: {
            email: "industry@test.com",
            name: "Test Factory",
            "custom:role": "industry",
            "custom:contact": "9876543212",
            "custom:address": "789 Industrial Ave, Test City",
            "custom:factory_type": "textile",
          },
        },
        confirmed: true,
      },
      {
        email: "admin@test.com",
        password: "Test123!",
        user: {
          username: "admin@test.com",
          attributes: {
            email: "admin@test.com",
            name: "Test Admin",
            "custom:role": "admin",
            "custom:contact": "9876543214",
            "custom:address": "Admin Office, Test City",
          },
        },
        confirmed: true,
      },
    ]

    // Only add test users if they don't already exist
    testUsers.forEach((userData) => {
      if (!this.users.has(userData.email)) {
        this.users.set(userData.email, userData)
      }
    })

    this.saveUsersToStorage()
  }

  async signUp(email: string, password: string, attributes: any) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (this.users.has(email)) {
      throw new Error("User already exists")
    }

    const user: MockUser = {
      username: email,
      attributes: {
        email,
        name: attributes.name,
        "custom:role": attributes.role,
        "custom:contact": attributes.contact,
        "custom:address": attributes.address,
        "custom:company_name": attributes.company_name || "",
        "custom:factory_type": attributes.factory_type || "",
      },
    }

    this.users.set(email, {
      password,
      user,
      confirmed: false,
    })

    // Save to localStorage
    this.saveUsersToStorage()

    console.log("✅ User registered:", email)
    return { userId: email }
  }

  async signIn(email: string, password: string) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    const userData = this.users.get(email)
    if (!userData) {
      console.error("❌ User not found:", email)
      console.log("Available users:", Array.from(this.users.keys()))
      throw new Error("User not found")
    }

    if (userData.password !== password) {
      throw new Error("Invalid password")
    }

    if (!userData.confirmed) {
      throw new Error("User not confirmed. Please check your email for confirmation code.")
    }

    this.currentUser = userData.user

    // Store in localStorage for persistence
    localStorage.setItem("mockAuth_currentUser", JSON.stringify(userData.user))

    console.log("✅ User signed in:", email)
    return { user: userData.user }
  }

  async confirmSignUp(email: string, code: string) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    const userData = this.users.get(email)
    if (!userData) {
      throw new Error("User not found")
    }

    // Accept any 6-digit code for demo
    if (code.length !== 6) {
      throw new Error("Invalid confirmation code")
    }

    userData.confirmed = true
    this.saveUsersToStorage()

    console.log("✅ User confirmed:", email)
    return { success: true }
  }

  async getCurrentUser() {
    // First check memory
    if (this.currentUser) {
      return this.currentUser
    }

    // Then check localStorage
    const storedUser = localStorage.getItem("mockAuth_currentUser")
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser)
        console.log("📂 Loaded current user from storage:", this.currentUser.attributes.email)
        return this.currentUser
      } catch (error) {
        console.warn("Failed to parse stored user:", error)
        localStorage.removeItem("mockAuth_currentUser")
      }
    }

    throw new Error("No current user")
  }

  async signOut() {
    console.log("🚪 Mock auth: Signing out user")

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    this.currentUser = null
    localStorage.removeItem("mockAuth_currentUser")
    // Don't clear all sessionStorage, just auth-related items

    console.log("✅ Mock auth: User signed out successfully")
    return { success: true }
  }
}

export const mockAuth = new MockAuthService()
