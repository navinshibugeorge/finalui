# Vendor Waste Type Collection System

## Overview
This system automatically routes waste collection requests to only those vendors who specialize in collecting specific waste types.

## How It Works

### 1. Vendor Signup
When vendors sign up, they select which waste types they collect:
- **Plastic** - Bottles, containers, packaging
- **Organic** - Food waste, biodegradable materials 
- **Metal** - Cans, scrap metal, aluminum
- **E-Waste** - Electronics, batteries, computer equipment
- **Glass** - Bottles, jars, broken glass

### 2. Industry Bin Monitoring
Each industry has 5 bins corresponding to the waste types:
- **Bin 1**: Plastic waste
- **Bin 2**: Organic waste  
- **Bin 3**: Metal waste
- **Bin 4**: E-Waste
- **Bin 5**: Glass waste

Each bin has:
- `binId`: Unique identifier
- `wasteType`: Type of waste (plastic, organic, metal, electronic, glass)
- `fillLevel`: Current fill percentage (0-100%)
- `totalVolume`: Maximum capacity in liters

### 3. Automatic Collection Triggers
When a bin reaches ≥80% capacity:
1. System creates an automatic pickup request
2. Identifies the waste type (e.g., "plastic")
3. Queries vendors who collect that specific waste type
4. Sends collection requests ONLY to matching vendors

### 4. Vendor Filtering Examples

**Example 1: Plastic Bin Alert**
- Bin BIN001 (Plastic) reaches 85% capacity
- System finds vendors with "Plastic" in their `collectingWasteTypes`
- Only plastic-collecting vendors receive the request
- Vendors who only collect organic/metal don't get notified

**Example 2: E-Waste Bin Alert**  
- Bin BIN004 (Electronic) reaches 82% capacity
- System finds vendors with "E-Waste" in their `collectingWasteTypes`
- Only e-waste specialists receive the request
- Regular waste collectors are not contacted

## Database Schema

### Vendors Table (Updated)
```sql
CREATE TABLE vendors (
    vendor_id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    contact TEXT NOT NULL,
    address TEXT NOT NULL,
    collecting_waste_types TEXT[] DEFAULT '{}', -- NEW FIELD
    service_radius DECIMAL(5,2) DEFAULT 10,
    rating DECIMAL(3,2) DEFAULT 0,
    total_pickups INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Bins Table
```sql
CREATE TABLE bins (
    bin_id UUID PRIMARY KEY,
    factory_id UUID REFERENCES factories(factory_id),
    waste_type TEXT NOT NULL, -- plastic, organic, metal, electronic, glass
    fill_level DECIMAL(5,2) DEFAULT 0,
    total_volume DECIMAL(8,2) DEFAULT 100,
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    tamper_status BOOLEAN DEFAULT false,
    last_updated TIMESTAMP DEFAULT NOW()
);
```

## Key Features

### 1. Waste Type Mapping
The system maps industry waste types to vendor specializations:
- `plastic` → `Plastic`
- `organic` → `Organic`
- `metal` → `Metal`
- `electronic` → `E-Waste`
- `glass` → `Glass`

### 2. Smart Vendor Selection
```typescript
// Get vendors who collect specific waste type
async getVendorsForWasteType(wasteType: string): Promise<Vendor[]> {
    const { data } = await supabase
        .from('vendors')
        .select('*')
        .contains('collecting_waste_types', [wasteType])
        .eq('is_active', true)
    
    return data || []
}
```

### 3. Automatic Notifications
When a pickup request is created:
1. System identifies waste type
2. Finds matching vendors
3. Sends notifications (email, SMS, push notifications)
4. Only relevant vendors see the request in their dashboard

## Testing Scenarios

### Scenario 1: Plastic Waste Collection
1. Industry has plastic bin that reaches 80%
2. Three vendors in system:
   - **EcoWaste Solutions**: [Plastic, Metal, Glass] ✓
   - **Green Recyclers**: [Organic] ✗
   - **Tech Waste Pro**: [E-Waste] ✗
3. Only EcoWaste Solutions gets notified

### Scenario 2: E-Waste Collection  
1. Electronics bin reaches 85%
2. Same three vendors:
   - **EcoWaste Solutions**: [Plastic, Metal, Glass] ✗
   - **Green Recyclers**: [Organic] ✗  
   - **Tech Waste Pro**: [E-Waste] ✓
3. Only Tech Waste Pro gets notified

## Benefits

1. **Targeted Notifications**: Vendors only see relevant requests
2. **Efficiency**: No spam notifications for incompatible waste types
3. **Specialization**: Encourages vendors to focus on their expertise
4. **Better Service**: Right vendor for the right waste type
5. **Cost Optimization**: Industries get specialized service providers

## Implementation Status

✅ **Completed**:
- Updated vendor signup form with waste type selection
- Modified database schema to include `collecting_waste_types`
- Created vendor filtering algorithm
- Updated vendor dashboard to show only matching requests
- Integrated automatic bin monitoring with vendor selection

🔄 **In Progress**:
- Email/SMS notification system
- Advanced vendor ranking algorithm
- Performance analytics

## Usage

When testing the system:
1. Sign up as a vendor and select specific waste types
2. Create industry bins with different waste types
3. Simulate bin fill levels reaching 80%+
4. Observe that only matching vendors receive requests
5. Check vendor dashboard shows filtered requests based on their specialization
