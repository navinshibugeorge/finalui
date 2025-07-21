"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { vendorSelectionAlgorithm } from "@/lib/vendor-selection-algorithm"
import { AlertTriangle, Users, CheckCircle } from "lucide-react"

export function VendorSelectionDemo() {
  const [selectedBin, setSelectedBin] = useState<any>(null)
  const [selectionResults, setSelectionResults] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Mock bin data for demonstration
  const mockBins = [
    {
      binId: "BIN001",
      factoryId: "factory_123",
      wasteType: "plastic",
      fillLevel: 85,
      location: "Factory Floor A",
      industryName: "Manufacturing Corp"
    },
    {
      binId: "BIN002", 
      factoryId: "factory_123",
      wasteType: "organic",
      fillLevel: 87,
      location: "Cafeteria Area",
      industryName: "Manufacturing Corp"
    },
    {
      binId: "BIN003",
      factoryId: "factory_123", 
      wasteType: "metal",
      fillLevel: 92,
      location: "Production Line B",
      industryName: "Manufacturing Corp"
    },
    {
      binId: "BIN004",
      factoryId: "factory_123",
      wasteType: "electronic", 
      fillLevel: 88,
      location: "IT Department",
      industryName: "Manufacturing Corp"
    },
    {
      binId: "BIN005",
      factoryId: "factory_123",
      wasteType: "glass",
      fillLevel: 83,
      location: "Laboratory",
      industryName: "Manufacturing Corp"
    }
  ]

  const handleProcessBinAlert = async (bin: any) => {
    setSelectedBin(bin)
    setIsProcessing(true)
    setSelectionResults([])

    try {
      // Process the bin alert using the vendor selection algorithm
      const results = await vendorSelectionAlgorithm.processBinAlert(bin)
      setSelectionResults(results)
    } catch (error) {
      console.error("Error processing bin alert:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const getBinStatusColor = (fillLevel: number) => {
    if (fillLevel >= 90) return "bg-red-500"
    if (fillLevel >= 80) return "bg-orange-500"
    return "bg-green-500"
  }

  const getWasteTypeColor = (wasteType: string) => {
    const colors: { [key: string]: string } = {
      plastic: "bg-blue-100 text-blue-800",
      organic: "bg-green-100 text-green-800", 
      metal: "bg-gray-100 text-gray-800",
      electronic: "bg-purple-100 text-purple-800",
      glass: "bg-teal-100 text-teal-800"
    }
    return colors[wasteType] || "bg-gray-100 text-gray-800"
  }

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Vendor Selection System Demo</h1>
        <p className="text-muted-foreground mt-2">
          Click on a bin that's ≥80% full to see which vendors would be notified
        </p>
      </div>

      {/* Bin Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockBins.map((bin) => (
          <Card 
            key={bin.binId} 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedBin?.binId === bin.binId ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleProcessBinAlert(bin)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{bin.binId}</CardTitle>
                <Badge className={getWasteTypeColor(bin.wasteType)}>
                  {bin.wasteType}
                </Badge>
              </div>
              <CardDescription>{bin.location}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Fill Level</span>
                  <span className="text-sm font-bold">{bin.fillLevel}%</span>
                </div>
                <Progress value={bin.fillLevel} className="h-3" />
                
                {bin.fillLevel >= 80 && (
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800 text-xs">
                      Ready for pickup! Click to see vendor selection
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-muted-foreground mt-2">Processing vendor selection...</p>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {selectedBin && selectionResults.length > 0 && !isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Vendor Selection Results for {selectedBin.binId}
            </CardTitle>
            <CardDescription>
              {selectedBin.wasteType} waste • {selectedBin.fillLevel}% full • {selectedBin.location}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>{selectionResults.length} compatible vendors</strong> found and notified for {selectedBin.wasteType} waste collection
                </AlertDescription>
              </Alert>

              <div className="grid gap-3">
                {selectionResults.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{result.vendorName}</h4>
                      <Badge variant={result.isCompatible ? "default" : "secondary"}>
                        {result.isCompatible ? "✓ Compatible" : "✗ Not Compatible"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <strong>Specializations:</strong> {result.wasteTypes.join(", ")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Reason:</strong> {result.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {selectedBin && selectionResults.length === 0 && !isProcessing && (
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No Compatible Vendors Found</h3>
            <p className="text-muted-foreground">
              No vendors currently collect {selectedBin.wasteType} waste in this area
            </p>
          </CardContent>
        </Card>
      )}

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>How the System Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold">Waste Types</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <Badge className="mr-1 bg-blue-100 text-blue-800">plastic</Badge> Bottles, containers</li>
                <li>• <Badge className="mr-1 bg-green-100 text-green-800">organic</Badge> Food waste, biodegradables</li>
                <li>• <Badge className="mr-1 bg-gray-100 text-gray-800">metal</Badge> Cans, scrap metal</li>
                <li>• <Badge className="mr-1 bg-purple-100 text-purple-800">electronic</Badge> E-waste, batteries</li>
                <li>• <Badge className="mr-1 bg-teal-100 text-teal-800">glass</Badge> Bottles, jars</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">Process</h4>
              <ol className="space-y-1 text-muted-foreground">
                <li>1. Bin reaches ≥80% capacity</li>
                <li>2. System identifies waste type</li>
                <li>3. Finds vendors with matching specialization</li>
                <li>4. Sends collection request to compatible vendors only</li>
                <li>5. Other vendors are not notified</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
