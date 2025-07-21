import { auth } from '@/lib/auth'

interface SignUpData {
  email: string
  password: string
  role: 'citizen' | 'vendor'
  fullName: string
  contact: string
  address: string
  companyName?: string
  wasteTypes?: string[]
  collectingWasteTypes?: string[]
}

export function createAuthModalHelpers(
  onClose: () => void,
  onModeChange: (mode: "signin" | "signup") => void,
  setLoading: (loading: boolean) => void,
  toast: any
) {
  const handleSignIn = async (formData: any) => {
    try {
      const { user, error, profile } = await auth.signIn({
        email: formData.email,
        password: formData.password,
      })

      if (error) throw error

      toast({
        title: `Welcome back${profile?.name ? `, ${profile.name}` : ''}!`,
        description: "You have been signed in successfully.",
      })

      // Close modal first
      onClose()

      // Redirect to role-specific dashboard
      window.location.href = `/${profile?.role}-dashboard`
    } catch (error: any) {
      let errorMessage = error.message

      if (error.message?.includes("pending approval")) {
        errorMessage = "Your industry account is pending approval. Please contact the administrator."
      } else if (error.message?.includes("Invalid") || error.message?.includes("password")) {
        errorMessage = "Invalid email or password. Please check your credentials."
      } else if (error.message?.includes("Too many")) {
        errorMessage = "Too many attempts. Please wait a moment before trying again."
      }

      toast({
        title: "Sign In Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (formData: any) => {
    // Prevent industry signups
    if (formData.role === 'industry') {
      toast({
        title: "Sign Up Error",
        description: "Industry accounts can only be created by administrators. Please contact support.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    try {
      const signUpData: SignUpData = {
        email: formData.email,
        password: formData.password,
        role: formData.role as 'citizen' | 'vendor',
        fullName: formData.name,
        contact: formData.contact,
        address: formData.address,
        companyName: formData.role === "vendor" ? formData.companyName : undefined,
        wasteTypes: formData.role === "vendor" ? [] : undefined,
        collectingWasteTypes: formData.role === "vendor" ? formData.collectingWasteTypes : undefined,
      }

      const result = await auth.signUp(signUpData)

      if (result.error) throw result.error

      toast({
        title: "Account created successfully",
        description: "You can now sign in with your credentials.",
      })

      // Switch to sign in mode
      onModeChange("signin")
    } catch (error: any) {
      let errorMessage = error.message

      if (error.message?.includes("already exists")) {
        errorMessage = "An account with this email already exists. Please sign in instead."
        onModeChange("signin")
      }

      toast({
        title: "Sign Up Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return {
    handleSignIn,
    handleSignUp,
  }
}
