"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { signUp, signIn, confirmSignUp } from "@/lib/aws-auth"

interface AuthModalProps {
  open: boolean
  mode: "signin" | "signup"
  defaultRole?: string
  onClose: () => void
  onModeChange: (mode: "signin" | "signup") => void
}

export function AuthModal({ open, mode, defaultRole, onClose, onModeChange }: AuthModalProps) {
  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationEmail, setConfirmationEmail] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmationCode: "",
    name: "",
    contact: "",
    address: "",
    role: defaultRole || "citizen",
    companyName: "",
    factoryType: "",
    wasteTypes: [] as string[],
  })
  const { toast } = useToast()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { user, error } = await signIn(formData.email, formData.password)

      if (error) throw error

      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      })

      // Close modal first
      onClose()

      // Force a page refresh to trigger auth state update
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error: any) {
      let errorMessage = error.message

      if (error.message?.includes("not confirmed") || error.message?.includes("check your email")) {
        errorMessage = "Please check your email and confirm your account first."
        setShowConfirmation(true)
        setConfirmationEmail(formData.email)
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const attributes = {
        email: formData.email,
        name: formData.name,
        contact: formData.contact,
        address: formData.address,
        role: formData.role,
        company_name: formData.role === "vendor" ? formData.companyName : undefined,
        factory_type: formData.role === "industry" ? formData.factoryType : undefined,
        waste_types: formData.role === "industry" ? formData.wasteTypes : undefined,
      }

      const { user, error } = await signUp(formData.email, formData.password, attributes)

      if (error) throw error

      toast({
        title: "Account created!",
        description: "Please check your email for a confirmation code.",
      })

      setShowConfirmation(true)
      setConfirmationEmail(formData.email)
    } catch (error: any) {
      let errorMessage = error.message

      if (error.code === "UsernameExistsException") {
        errorMessage = "An account with this email already exists. Please sign in instead."
      } else if (error.code === "InvalidPasswordException") {
        errorMessage = "Password must be at least 8 characters with uppercase, lowercase, number and special character."
      } else if (error.code === "TooManyRequestsException") {
        errorMessage = "Too many signup attempts. Please wait a moment before trying again."
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

  const handleConfirmSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await confirmSignUp(confirmationEmail, formData.confirmationCode)

      if (error) throw error

      toast({
        title: "Account confirmed!",
        description: "You can now sign in to your account.",
      })

      setShowConfirmation(false)
      onModeChange("signin")

      // Auto-fill the email for sign in
      setFormData((prev) => ({ ...prev, email: confirmationEmail, confirmationCode: "" }))
    } catch (error: any) {
      let errorMessage = error.message

      if (error.message?.includes("Invalid") || error.message?.includes("code")) {
        errorMessage = "Invalid confirmation code. Please check and try again."
      } else if (error.message?.includes("expired") || error.message?.includes("Expired")) {
        errorMessage = "Confirmation code has expired. Please request a new one."
      }

      toast({
        title: "Confirmation Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (showConfirmation) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Your Account</DialogTitle>
            <DialogDescription>We've sent a confirmation code to {confirmationEmail}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmSignUp} className="space-y-4">
            <div>
              <Label htmlFor="confirmationCode">Confirmation Code</Label>
              <Input
                id="confirmationCode"
                type="text"
                placeholder="Enter 6-digit code"
                value={formData.confirmationCode}
                onChange={(e) => setFormData((prev) => ({ ...prev, confirmationCode: e.target.value }))}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Account
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "signin" ? "Sign In" : "Create Account"}</DialogTitle>
          <DialogDescription>
            {mode === "signin" ? "Welcome back to EcoSync" : "Join the EcoSync community"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(value) => onModeChange(value as "signin" | "signup")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <Label htmlFor="role">I am a</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="citizen">Citizen</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="industry">Industry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">{formData.role === "vendor" ? "Contact Person" : "Name"}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact">Contact</Label>
                  <Input
                    id="contact"
                    value={formData.contact}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contact: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {formData.role === "vendor" && (
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
                    required
                  />
                </div>
              )}

              {formData.role === "industry" && (
                <div>
                  <Label htmlFor="factoryType">Factory Type</Label>
                  <Select
                    value={formData.factoryType}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, factoryType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select factory type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="textile">Textile</SelectItem>
                      <SelectItem value="chemical">Chemical</SelectItem>
                      <SelectItem value="food">Food Processing</SelectItem>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="automotive">Automotive</SelectItem>
                      <SelectItem value="pharmaceutical">Pharmaceutical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 8 chars with uppercase, lowercase, number & symbol"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
