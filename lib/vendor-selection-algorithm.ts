// Vendor Selection Algorithm for Waste Collection
// This algorithm automatically selects and notifies vendors based on waste type compatibility

import { pickupRequestService } from './pickup-request-service'

export interface VendorSelectionResult {
  vendorId: string
  vendorName: string
  wasteTypes: string[]
  isCompatible: boolean
  reason: string
}

export const vendorSelectionAlgorithm = {
  /**
   * Main function that processes a bin alert and notifies compatible vendors
   * @param binData - Information about the bin that reached 80% capacity
   */
  async processBinAlert(binData: {
    binId: string
    factoryId: string
    wasteType: string
    fillLevel: number
    location: string
    industryName: string
  }): Promise<VendorSelectionResult[]> {
    
    console.log(`🚨 Processing bin alert for ${binData.wasteType} waste (${binData.fillLevel}% full)`)
    
    // Step 1: Map industry waste type to vendor waste type
    const mappedWasteType = this.mapIndustryWasteTypeToVendorType(binData.wasteType)
    
    // Step 2: Get all vendors who collect this specific waste type
    const compatibleVendors = await pickupRequestService.getVendorsForWasteType(mappedWasteType)
    
    console.log(`📋 Found ${compatibleVendors.length} vendors who collect ${mappedWasteType} waste (mapped from ${binData.wasteType})`)
    
    // Step 3: Create selection results
    const results: VendorSelectionResult[] = compatibleVendors.map(vendor => ({
      vendorId: vendor.vendor_id,
      vendorName: vendor.name,
      wasteTypes: vendor.collecting_waste_types || [],
      isCompatible: true,
      reason: `Vendor specializes in ${mappedWasteType} waste collection`
    }))
    
    // Step 4: Create pickup request (this will automatically notify compatible vendors)
    if (results.length > 0) {
      try {
        // Map binData to the format expected by pickup request service
        const pickupRequestData = {
          ...binData,
          factory_id: binData.factoryId, // Map factoryId to factory_id
          industry_id: binData.factoryId, // Also provide as industry_id
          waste_type: binData.wasteType,
          bin_id: binData.binId,
          fill_level: binData.fillLevel,
          industry_name: binData.industryName
        }
        
        await pickupRequestService.createPickupRequest(pickupRequestData)
        console.log(`✅ Pickup request created and ${results.length} vendors notified`)
      } catch (error: any) {
        console.log(`⚠️ Pickup request creation skipped: ${error.message}`)
      }
    } else {
      console.log(`❌ No vendors available for ${mappedWasteType} waste collection (from ${binData.wasteType})`)
    }
    
    return results
  },

  /**
   * Map industry waste types to vendor collecting waste types
   */
  mapIndustryWasteTypeToVendorType(industryWasteType: string): string {
    const wasteTypeMap: { [key: string]: string } = {
      'plastic': 'Plastic',
      'organic': 'Organic', 
      'metal': 'Metal',
      'electronic': 'E-Waste',
      'e-waste': 'E-Waste',
      'glass': 'Glass',
      'paper': 'Organic', // Assuming paper goes to organic processing
      'mixed': 'Plastic' // Default to plastic for mixed waste
    }
    
    return wasteTypeMap[industryWasteType.toLowerCase()] || industryWasteType
  },

  /**
   * Get vendor selection summary for a specific waste type
   */
  async getVendorSelectionSummary(wasteType: string): Promise<{
    totalVendors: number
    compatibleVendors: number
    wasteType: string
    vendorNames: string[]
  }> {
    const allVendors = await pickupRequestService.getVendorsForWasteType(wasteType)
    
    return {
      totalVendors: allVendors.length,
      compatibleVendors: allVendors.length,
      wasteType,
      vendorNames: allVendors.map(v => v.name)
    }
  },

  /**
   * Test function to demonstrate the waste type mapping
   */
  demonstrateWasteTypeMatching(): void {
    const wasteTypeExamples = [
      { industry: 'plastic', vendorTypes: ['Plastic'] },
      { industry: 'organic', vendorTypes: ['Organic'] },
      { industry: 'metal', vendorTypes: ['Metal'] },
      { industry: 'electronic', vendorTypes: ['E-Waste'] },
      { industry: 'glass', vendorTypes: ['Glass'] }
    ]

    console.log('\n🔍 Waste Type Matching Examples:')
    wasteTypeExamples.forEach(example => {
      console.log(`  Industry bin: "${example.industry}" → Vendor types: [${example.vendorTypes.join(', ')}]`)
    })
    console.log('\n📝 Only vendors with matching waste types will receive collection requests!')
  }
}
