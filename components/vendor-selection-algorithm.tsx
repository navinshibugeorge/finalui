"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Star, MapPin, DollarSign, Clock } from "lucide-react"

interface Vendor {
  id: string
  name: string
  contact: string
  pricePerKg: number
  distance: number
  rating: number
  responseTime: number
  availability: boolean
  specialties: string[]
}

interface VendorSelectionProps {
  wasteType: string
  quantity: number
  location: { lat: number; lng: number }
  onVendorsSelected?: (vendors: Vendor[]) => void
}

export function VendorSelectionAlgorithm({ wasteType, quantity, location, onVendorsSelected }: VendorSelectionProps) {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedVendors, setSelectedVendors] = useState<Vendor[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [algorithmStep, setAlgorithmStep] = useState(0)

  // Mock vendor data
  const mockVendors: Vendor[] = [
    {
      id: "V001",
      name: "EcoWaste Solutions",
      contact: "+91-9876543210",
      pricePerKg: 45,
      distance: 2.3,
      rating: 4.8,
      responseTime: 15,
      availability: true,
      specialties: ["plastic", "metal", "electronic"],
    },
    {
      id: "V002",
      name: "Green Collectors",
      contact: "+91-9876543211",
      pricePerKg: 48,
      distance: 1.8,
      rating: 4.6,
      responseTime: 12,
      availability: true,
      specialties: ["organic", "paper", "plastic"],
    },
    {
      id: "V003",
      name: "Waste Warriors",
      contact: "+91-9876543212",
      pricePerKg: 50,
      distance: 3.1,
      rating: 4.9,
      responseTime: 20,
      availability: true,
      specialties: ["metal", "electronic", "mixed"],
    },
    {
      id: "V004",
      name: "Clean Earth Co.",
      contact: "+91-9876543213",
      pricePerKg: 42,
      distance: 4.2,
      rating: 4.4,
      responseTime: 25,
      availability: false,
      specialties: ["plastic", "glass", "textile"],
    },
    {
      id: "V005",
      name: "Recycle Pro",
      contact: "+91-9876543214",
      pricePerKg: 52,
      distance: 1.2,
      rating: 4.7,
      responseTime: 10,
      availability: true,
      specialties: ["electronic", "metal", "plastic"],
    },
  ]

  useEffect(() => {
    setVendors(mockVendors)
  }, [])

  const runVendorSelection = async () => {
    setIsProcessing(true)
    setAlgorithmStep(0)
    setSelectedVendors([])

    // Step 1: Filter by availability and waste type specialty
    setAlgorithmStep(1)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const availableVendors = vendors.filter((vendor) => vendor.availability && vendor.specialties.includes(wasteType))

    // Step 2: Check market price API (simulated)
    setAlgorithmStep(2)
    await new Promise((resolve) => setTimeout(resolve, 800))

    const marketPrice = 47 // Simulated market price for waste type

    // Step 3: Calculate scores based on multiple factors
    setAlgorithmStep(3)
    await new Promise((resolve) => setTimeout(resolve, 1200))

    const scoredVendors = availableVendors.map((vendor) => {
      // Scoring algorithm: Price (40%) + Distance (30%) + Rating (20%) + Response Time (10%)
      const priceScore = Math.max(0, 100 - ((vendor.pricePerKg - marketPrice) / marketPrice) * 100)
      const distanceScore = Math.max(0, 100 - (vendor.distance / 10) * 100) // Assuming max 10km
      const ratingScore = (vendor.rating / 5) * 100
      const responseScore = Math.max(0, 100 - (vendor.responseTime / 60) * 100) // Assuming max 60min

      const totalScore = priceScore * 0.4 + distanceScore * 0.3 + ratingScore * 0.2 + responseScore * 0.1

      return {
        ...vendor,
        scores: {
          price: priceScore,
          distance: distanceScore,
          rating: ratingScore,
          response: responseScore,
          total: totalScore,
        },
      }
    })

    // Step 4: Sort by total score and select top 3
    setAlgorithmStep(4)
    await new Promise((resolve) => setTimeout(resolve, 800))

    const sortedVendors = scoredVendors.sort((a, b) => b.scores.total - a.scores.total)
    const top3Vendors = sortedVendors.slice(0, 3)

    setSelectedVendors(top3Vendors)
    onVendorsSelected?.(top3Vendors)
    setIsProcessing(false)
    setAlgorithmStep(5)
  }

  const getStepDescription = (step: number) => {
    switch (step) {
      case 1:
        return "Filtering vendors by availability and waste type specialty..."
      case 2:
        return "Checking market price API for current rates..."
      case 3:
        return "Calculating vendor scores based on price, distance, rating, and response time..."
      case 4:
        return "Sorting vendors and selecting top 3 candidates..."
      case 5:
        return "Vendor selection complete! Sending pickup requests..."
      default:
        return "Ready to run vendor selection algorithm"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🤖 Vendor Selection Algorithm
            {isProcessing && <div className="animate-spin">⚙️</div>}
          </CardTitle>
          <CardDescription>
            AI-powered vendor matching: Price (40%) + Distance (30%) + Rating (20%) + Response Time (10%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Waste Type:</span> {wasteType}
              </div>
              <div>
                <span className="font-medium">Quantity:</span> {quantity} kg
              </div>
              <div>
                <span className="font-medium">Location:</span> {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </div>
              <div>
                <span className="font-medium">Available Vendors:</span> {vendors.filter((v) => v.availability).length}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Algorithm Progress</span>
                <span className="text-sm text-gray-600">Step {algorithmStep}/5</span>
              </div>
              <Progress value={(algorithmStep / 5) * 100} className="h-2" />
              <p className="text-xs text-gray-600">{getStepDescription(algorithmStep)}</p>
            </div>

            <Button onClick={runVendorSelection} disabled={isProcessing} className="w-full">
              {isProcessing ? "Processing..." : "Run Vendor Selection"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedVendors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🎯 Selected Vendors (Top 3)</CardTitle>
            <CardDescription>Pickup requests will be sent to these vendors in order</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="results" className="space-y-4">
              <TabsList>
                <TabsTrigger value="results">Results</TabsTrigger>
                <TabsTrigger value="scoring">Scoring Details</TabsTrigger>
              </TabsList>

              <TabsContent value="results" className="space-y-4">
                {selectedVendors.map((vendor, index) => (
                  <Card key={vendor.id} className="relative">
                    <div className="absolute top-2 right-2">
                      <Badge variant={index === 0 ? "default" : "secondary"}>#{index + 1}</Badge>
                    </div>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{vendor.name}</CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />₹{vendor.pricePerKg}/kg
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {vendor.distance} km
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          {vendor.rating}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {vendor.responseTime}min
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          {vendor.specialties.map((specialty) => (
                            <Badge key={specialty} variant="outline" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">Score: {vendor.scores?.total.toFixed(1)}</div>
                          <div className="text-xs text-gray-600">Contact: {vendor.contact}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="scoring" className="space-y-4">
                {selectedVendors.map((vendor) => (
                  <Card key={vendor.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{vendor.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Price Score (40%)</span>
                          <span className="text-sm font-medium">{vendor.scores?.price.toFixed(1)}</span>
                        </div>
                        <Progress value={vendor.scores?.price} className="h-2" />

                        <div className="flex items-center justify-between">
                          <span className="text-sm">Distance Score (30%)</span>
                          <span className="text-sm font-medium">{vendor.scores?.distance.toFixed(1)}</span>
                        </div>
                        <Progress value={vendor.scores?.distance} className="h-2" />

                        <div className="flex items-center justify-between">
                          <span className="text-sm">Rating Score (20%)</span>
                          <span className="text-sm font-medium">{vendor.scores?.rating.toFixed(1)}</span>
                        </div>
                        <Progress value={vendor.scores?.rating} className="h-2" />

                        <div className="flex items-center justify-between">
                          <span className="text-sm">Response Score (10%)</span>
                          <span className="text-sm font-medium">{vendor.scores?.response.toFixed(1)}</span>
                        </div>
                        <Progress value={vendor.scores?.response} className="h-2" />

                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between font-medium">
                            <span>Total Score</span>
                            <span>{vendor.scores?.total.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
