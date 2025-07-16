"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Recycle, Truck, Factory, Shield, BarChart3, MapPin } from "lucide-react"
import { AuthModal } from "@/components/auth-modal"
import { DevHelper } from "@/components/dev-helper"

export function LandingPage() {
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: "signin" | "signup"; role?: string }>({
    open: false,
    mode: "signin",
  })

  const features = [
    {
      icon: <Recycle className="h-8 w-8 text-green-600" />,
      title: "Smart Waste Tracking",
      description: "IoT-enabled bins with real-time fill level monitoring and tamper detection",
    },
    {
      icon: <Truck className="h-8 w-8 text-blue-600" />,
      title: "Automated Vendor Selection",
      description: "AI-powered vendor matching based on price, distance, and ratings",
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-purple-600" />,
      title: "Analytics Dashboard",
      description: "Comprehensive insights on waste patterns, costs, and environmental impact",
    },
    {
      icon: <MapPin className="h-8 w-8 text-red-600" />,
      title: "Route Optimization",
      description: "Efficient pickup routes to minimize fuel consumption and costs",
    },
  ]

  const userTypes = [
    {
      role: "citizen",
      title: "Citizens",
      description: "Request waste pickup and earn eco-coins",
      icon: <Shield className="h-12 w-12 text-green-600" />,
      benefits: ["Easy pickup requests", "Competitive pricing", "Eco-coins rewards", "Pickup history tracking"],
    },
    {
      role: "vendor",
      title: "Vendors",
      description: "Grow your waste collection business",
      icon: <Truck className="h-12 w-12 text-blue-600" />,
      benefits: ["Automated job matching", "Route optimization", "Digital payments", "Performance analytics"],
    },
    {
      role: "industry",
      title: "Industries",
      description: "Manage industrial waste efficiently",
      icon: <Factory className="h-12 w-12 text-purple-600" />,
      benefits: ["Smart bin monitoring", "Automated scheduling", "Compliance reporting", "Cost optimization"],
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Recycle className="h-8 w-8 text-green-600" />
            <span className="text-2xl font-bold text-gray-900">EcoSync</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => setAuthModal({ open: true, mode: "signin" })}>
              Sign In
            </Button>
            <Button onClick={() => setAuthModal({ open: true, mode: "signup" })}>Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Intelligent Waste Management
            <span className="text-green-600 block">for a Cleaner Future</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Connect citizens, vendors, and industries through our AI-powered platform. Smart bins, automated vendor
            selection, and real-time analytics for efficient waste management.
          </p>
          <Button size="lg" className="text-lg px-8 py-3" onClick={() => setAuthModal({ open: true, mode: "signup" })}>
            Start Your Journey
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Platform Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="flex justify-center mb-4">{feature.icon}</div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* User Types Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Join as</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {userTypes.map((type, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-center mb-4">{type.icon}</div>
                  <CardTitle className="text-xl">{type.title}</CardTitle>
                  <CardDescription>{type.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-600 space-y-2 mb-6">
                    {type.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center justify-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    onClick={() => setAuthModal({ open: true, mode: "signup", role: type.role })}
                  >
                    Join as {type.title.slice(0, -1)}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Recycle className="h-6 w-6" />
            <span className="text-xl font-bold">EcoSync</span>
          </div>
          <p className="text-gray-400">Building a sustainable future through intelligent waste management</p>
        </div>
      </footer>

      <AuthModal
        open={authModal.open}
        mode={authModal.mode}
        defaultRole={authModal.role}
        onClose={() => setAuthModal({ open: false, mode: "signin" })}
        onModeChange={(mode) => setAuthModal((prev) => ({ ...prev, mode }))}
      />

      <DevHelper />
    </div>
  )
}
