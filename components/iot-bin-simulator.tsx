"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Wifi, WifiOff, Zap, Shield } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BinSensorData {
  binId: string
  fillLevel: number
  tamperDetected: boolean
  batteryLevel: number
  signalStrength: number
  temperature: number
  lastUpdate: string
}

interface IoTBinSimulatorProps {
  factoryId: string
  onDataUpdate?: (data: BinSensorData) => void
}

export function IoTBinSimulator({ factoryId, onDataUpdate }: IoTBinSimulatorProps) {
  const [isActive, setIsActive] = useState(false)
  const [sensorData, setSensorData] = useState<BinSensorData>({
    binId: `BIN_${factoryId}_001`,
    fillLevel: 25,
    tamperDetected: false,
    batteryLevel: 85,
    signalStrength: 75,
    temperature: 23.5,
    lastUpdate: new Date().toISOString(),
  })
  const [isTransmitting, setIsTransmitting] = useState(false)
  const { toast } = useToast()

  // Simulate sensor readings
  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setSensorData((prev) => {
        const newData = {
          ...prev,
          fillLevel: Math.min(100, prev.fillLevel + Math.random() * 2 - 0.5), // Gradual fill
          batteryLevel: Math.max(0, prev.batteryLevel - 0.01), // Slow battery drain
          signalStrength: 70 + Math.random() * 20, // Signal fluctuation
          temperature: 20 + Math.random() * 10, // Temperature variation
          lastUpdate: new Date().toISOString(),
        }

        // Simulate tamper detection (rare event)
        if (Math.random() < 0.001) {
          newData.tamperDetected = true
        }

        return newData
      })
    }, 2000) // Update every 2 seconds

    return () => clearInterval(interval)
  }, [isActive])

  // Check for critical conditions and trigger AWS IoT transmission
  useEffect(() => {
    const shouldTransmit = sensorData.fillLevel >= 85 || sensorData.tamperDetected

    if (shouldTransmit && isActive && !isTransmitting) {
      transmitToAWSIoT()
    }
  }, [sensorData.fillLevel, sensorData.tamperDetected, isActive, isTransmitting])

  const transmitToAWSIoT = async () => {
    setIsTransmitting(true)

    try {
      // Simulate GSM transmission delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const payload = {
        deviceId: sensorData.binId,
        timestamp: sensorData.lastUpdate,
        fillLevel: sensorData.fillLevel,
        tamperDetected: sensorData.tamperDetected,
        batteryLevel: sensorData.batteryLevel,
        signalStrength: sensorData.signalStrength,
        temperature: sensorData.temperature,
        location: {
          factoryId,
          lat: 28.6139 + Math.random() * 0.01, // Delhi area with small variation
          lng: 77.209 + Math.random() * 0.01,
        },
      }

      // Call our AWS Lambda function (simulated)
      console.log("📡 Transmitting to AWS IoT Core:", payload)

      if (sensorData.tamperDetected) {
        toast({
          title: "🚨 Tamper Alert!",
          description: `Bin ${sensorData.binId} has been tampered with. Admin notified.`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "📡 Bin Alert Sent",
          description: `Bin ${sensorData.binId} is ${sensorData.fillLevel.toFixed(1)}% full. Finding vendors...`,
        })
      }

      // Trigger vendor selection algorithm
      await triggerVendorSelection(payload)

      onDataUpdate?.(sensorData)
    } catch (error) {
      console.error("IoT transmission failed:", error)
      toast({
        title: "Transmission Failed",
        description: "Failed to send data to AWS IoT Core",
        variant: "destructive",
      })
    } finally {
      setIsTransmitting(false)
    }
  }

  const triggerVendorSelection = async (payload: any) => {
    // Simulate AWS Lambda processing
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Mock vendor selection results
    const selectedVendors = [
      { name: "EcoWaste Solutions", price: 45, distance: 2.3, rating: 4.8 },
      { name: "Green Collectors", price: 48, distance: 1.8, rating: 4.6 },
      { name: "Waste Warriors", price: 50, distance: 3.1, rating: 4.9 },
    ]

    toast({
      title: "🎯 Vendors Selected",
      description: `Top 3 vendors found. Pickup requests sent to ${selectedVendors[0].name} and others.`,
    })

    console.log("🤖 Vendor Selection Results:", selectedVendors)
  }

  const resetTamper = () => {
    setSensorData((prev) => ({ ...prev, tamperDetected: false }))
    toast({
      title: "Tamper Reset",
      description: "Tamper sensor has been reset",
    })
  }

  const simulateFillIncrease = () => {
    setSensorData((prev) => ({
      ...prev,
      fillLevel: Math.min(100, prev.fillLevel + 10),
    }))
  }

  const simulateTamper = () => {
    setSensorData((prev) => ({ ...prev, tamperDetected: true }))
  }

  const getFillLevelColor = (level: number) => {
    if (level >= 85) return "text-red-600"
    if (level >= 60) return "text-yellow-600"
    return "text-green-600"
  }

  const getSignalIcon = (strength: number) => {
    return strength > 50 ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              🗑️ Smart Bin Simulator
              {isTransmitting && <div className="animate-pulse text-blue-600">📡</div>}
            </CardTitle>
            <CardDescription>STM32L476 + JSN-SR04T + ADXL362 + Quectel EC200U</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="bin-active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="bin-active">Active</Label>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Bin Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Fill Level</span>
              <span className={`text-sm font-bold ${getFillLevelColor(sensorData.fillLevel)}`}>
                {sensorData.fillLevel.toFixed(1)}%
              </span>
            </div>
            <Progress value={sensorData.fillLevel} className="h-3" />
            {sensorData.fillLevel >= 85 && (
              <Badge variant="destructive" className="text-xs">
                🚨 Pickup Required
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Battery</span>
              <span className="text-sm font-bold">{sensorData.batteryLevel.toFixed(1)}%</span>
            </div>
            <Progress value={sensorData.batteryLevel} className="h-3" />
          </div>
        </div>

        {/* Sensor Status */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">{getSignalIcon(sensorData.signalStrength)}</div>
            <div className="text-xs text-gray-600">GSM Signal</div>
            <div className="text-sm font-medium">{sensorData.signalStrength.toFixed(0)}%</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Zap className="h-4 w-4 text-yellow-600" />
            </div>
            <div className="text-xs text-gray-600">Temperature</div>
            <div className="text-sm font-medium">{sensorData.temperature.toFixed(1)}°C</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Shield className={`h-4 w-4 ${sensorData.tamperDetected ? "text-red-600" : "text-green-600"}`} />
            </div>
            <div className="text-xs text-gray-600">Tamper</div>
            <div className="text-sm font-medium">{sensorData.tamperDetected ? "DETECTED" : "Normal"}</div>
          </div>
        </div>

        {/* Tamper Alert */}
        {sensorData.tamperDetected && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Tamper Detected!</span>
            </div>
            <p className="text-sm text-red-700 mb-3">
              ADXL362 accelerometer detected unauthorized movement. Admin has been notified via SMS.
            </p>
            <Button size="sm" variant="outline" onClick={resetTamper}>
              Reset Tamper Sensor
            </Button>
          </div>
        )}

        {/* Device Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>Device ID: {sensorData.binId}</div>
          <div>Last Update: {new Date(sensorData.lastUpdate).toLocaleTimeString()}</div>
          <div>Status: {isActive ? "🟢 Online" : "🔴 Offline"}</div>
        </div>

        {/* Simulation Controls */}
        <div className="flex gap-2 pt-4 border-t">
          <Button size="sm" variant="outline" onClick={simulateFillIncrease} disabled={!isActive}>
            +10% Fill
          </Button>
          <Button size="sm" variant="outline" onClick={simulateTamper} disabled={!isActive}>
            Simulate Tamper
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
