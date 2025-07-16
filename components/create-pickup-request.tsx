"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { createPickupRequest } from "@/lib/aws-api"
import { useToast } from "@/hooks/use-toast"

interface CreatePickupRequestProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreatePickupRequest({ open, onClose, onSuccess }: CreatePickupRequestProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [wasteType, setWasteType] = useState("")
  const [wasteWeight, setWasteWeight] = useState("")
  const [wasteImage, setWasteImage] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!wasteType || !wasteWeight) {
      toast({
        title: "Missing Information",
        description: "Please select waste type and weight category",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const userId = user?.username || user?.attributes?.email
      const requestData = {
        user_id: userId,
        waste_type: wasteType,
        size_category: wasteWeight,
        estimated_quantity: wasteWeight === "small" ? 2.5 : wasteWeight === "medium" ? 10 : 20,
        estimated_price: wasteWeight === "small" ? 25 : wasteWeight === "medium" ? 75 : 150,
        status: "pending",
        created_at: new Date().toISOString(),
        waste_image: wasteImage ? URL.createObjectURL(wasteImage) : null,
      }

      await createPickupRequest(requestData)

      toast({
        title: "Request Created! 🎉",
        description: "Your pickup request has been submitted successfully",
      })

      // Reset form
      setWasteType("")
      setWasteWeight("")
      setWasteImage(null)

      onSuccess()
    } catch (error: any) {
      toast({
        title: "Request Failed",
        description: error.message || "Failed to create pickup request",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setWasteType("")
    setWasteWeight("")
    setWasteImage(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Pickup Request</DialogTitle>
          <DialogDescription>Fill in the details for your waste pickup request</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="waste-type">Waste Type</Label>
            <Select value={wasteType} onValueChange={setWasteType}>
              <SelectTrigger>
                <SelectValue placeholder="Select waste type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plastic">Plastic</SelectItem>
                <SelectItem value="paper">Paper</SelectItem>
                <SelectItem value="metal">Metal</SelectItem>
                <SelectItem value="glass">Glass</SelectItem>
                <SelectItem value="electronic">Electronic</SelectItem>
                <SelectItem value="organic">Organic</SelectItem>
                <SelectItem value="mixed">Mixed Recyclables</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Approximate Weight</Label>
            <RadioGroup value={wasteWeight} onValueChange={setWasteWeight} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="small" id="small" />
                <Label htmlFor="small">Small (0-5 kg)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium">Medium (5-15 kg)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="large" id="large" />
                <Label htmlFor="large">Large (15+ kg)</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="waste-image">Waste Image (Optional)</Label>
            <Input
              id="waste-image"
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                setWasteImage(file)
              }}
              className="cursor-pointer"
            />
            <p className="text-sm text-muted-foreground mt-1">Upload a photo of your waste (JPG, PNG only)</p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-green-600 hover:bg-green-700">
              {submitting ? "Creating..." : "Submit Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
