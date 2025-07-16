"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Wifi, Database, Zap, MessageSquare } from "lucide-react"
import { IoTBinSimulator } from "@/components/iot-bin-simulator"
import { VendorSelectionAlgorithm } from "@/components/vendor-selection-algorithm"

interface IoTMessage {
  id: string
  timestamp: string
  deviceId: string
  messageType: "bin_alert" | "tamper_alert" | "vendor_response"
  payload: any
  processed: boolean
}

export function AWSIoTDashboard() {
  const [messages, setMessages] = useState<IoTMessage[]>([])
  const [activeDevices, setActiveDevices] = useState(3)
  const [totalMessages, setTotalMessages] = useState(147)

  // Simulate incoming IoT messages
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.3) {
        // 30% chance of new message every 5 seconds
        const newMessage: IoTMessage = {
          id: `msg_${Date.now()}`,
          timestamp: new Date().toISOString(),
          deviceId: `BIN_${Math.floor(Math.random() * 10)
            .toString()
            .padStart(3, "0")}`,
          messageType: Math.random() < 0.1 ? "tamper_alert" : "bin_alert",
          payload: {
            fillLevel: 85 + Math.random() * 15,
            tamperDetected: Math.random() < 0.1,
            batteryLevel: 70 + Math.random() * 30,
            location: {
              lat: 28.6139 + Math.random() * 0.01,
              lng: 77.209 + Math.random() * 0.01,
            },
          },
          processed: false,
        }

        setMessages((prev) => [newMessage, ...prev.slice(0, 19)]) // Keep last 20 messages
        setTotalMessages((prev) => prev + 1)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleBinDataUpdate = (data: any) => {
    const newMessage: IoTMessage = {
      id: `msg_${Date.now()}`,
      timestamp: data.lastUpdate,
      deviceId: data.binId,
      messageType: data.tamperDetected ? "tamper_alert" : "bin_alert",
      payload: data,
      processed: true,
    }

    setMessages((prev) => [newMessage, ...prev.slice(0, 19)])
    setTotalMessages((prev) => prev + 1)
  }

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "tamper_alert":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "bin_alert":
        return <Database className="h-4 w-4 text-yellow-500" />
      case "vendor_response":
        return <MessageSquare className="h-4 w-4 text-blue-500" />
      default:
        return <Zap className="h-4 w-4 text-gray-500" />
    }
  }

  const getMessageColor = (type: string) => {
    switch (type) {
      case "tamper_alert":
        return "border-red-200 bg-red-50"
      case "bin_alert":
        return "border-yellow-200 bg-yellow-50"
      case "vendor_response":
        return "border-blue-200 bg-blue-50"
      default:
        return "border-gray-200 bg-gray-50"
    }
  }

  return (
    <div className="space-y-6">
      {/* AWS IoT Core Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDevices}</div>
            <p className="text-xs text-muted-foreground">Smart bins online</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Today</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMessages}</div>
            <p className="text-xs text-muted-foreground">IoT messages processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lambda Invocations</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor(totalMessages * 1.2)}</div>
            <p className="text-xs text-muted-foreground">Functions executed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messages.filter((m) => m.messageType === "tamper_alert").length}</div>
            <p className="text-xs text-muted-foreground">Tamper alerts today</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="simulator" className="space-y-4">
        <TabsList>
          <TabsTrigger value="simulator">IoT Simulator</TabsTrigger>
          <TabsTrigger value="messages">Live Messages</TabsTrigger>
          <TabsTrigger value="algorithm">Vendor Algorithm</TabsTrigger>
        </TabsList>

        <TabsContent value="simulator">
          <IoTBinSimulator factoryId="FACTORY_001" onDataUpdate={handleBinDataUpdate} />
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>📡 AWS IoT Core - Live Messages</CardTitle>
              <CardDescription>Real-time messages from smart bins and vendor responses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {messages.map((message) => (
                  <div key={message.id} className={`p-3 rounded-lg border ${getMessageColor(message.messageType)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getMessageIcon(message.messageType)}
                        <span className="font-medium text-sm">{message.deviceId}</span>
                        <Badge variant="outline" className="text-xs">
                          {message.messageType.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">{new Date(message.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-sm text-gray-700">
                      {message.messageType === "tamper_alert" && "🚨 Tamper detected! Admin notified via SMS."}
                      {message.messageType === "bin_alert" &&
                        `📊 Fill level: ${message.payload.fillLevel?.toFixed(1)}% - Vendor selection triggered`}
                      {message.messageType === "vendor_response" && "✅ Vendor accepted pickup request"}
                    </div>
                    {message.processed && (
                      <Badge variant="secondary" className="text-xs mt-2">
                        Processed by Lambda
                      </Badge>
                    )}
                  </div>
                ))}

                {messages.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No messages yet. Start the IoT simulator to see live data.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="algorithm">
          <VendorSelectionAlgorithm
            wasteType="plastic"
            quantity={25}
            location={{ lat: 28.6139, lng: 77.209 }}
            onVendorsSelected={(vendors) => {
              console.log("Selected vendors:", vendors)
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
