-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    address TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('citizen', 'vendor', 'industry', 'admin')),
    company_name TEXT,
    factory_type TEXT,
    waste_types TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Citizens table
CREATE TABLE citizens (
    user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    address TEXT NOT NULL,
    wallet_balance DECIMAL(10,2) DEFAULT 0,
    eco_coins INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendors table
CREATE TABLE vendors (
    vendor_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    contact TEXT NOT NULL,
    address TEXT NOT NULL,
    service_radius DECIMAL(5,2) DEFAULT 10,
    rating DECIMAL(3,2) DEFAULT 0,
    total_pickups INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor waste types and pricing
CREATE TABLE vendor_waste_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vendor_id UUID REFERENCES vendors(vendor_id),
    waste_type TEXT NOT NULL,
    rate_per_kg DECIMAL(8,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Factories/Industries table
CREATE TABLE factories (
    factory_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    factory_name TEXT NOT NULL,
    contact TEXT NOT NULL,
    address TEXT NOT NULL,
    email TEXT NOT NULL,
    factory_type TEXT NOT NULL,
    waste_types_produced TEXT[],
    monthly_waste_volume DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Smart bins table
CREATE TABLE bins (
    bin_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    factory_id UUID REFERENCES factories(factory_id),
    waste_type TEXT NOT NULL,
    fill_level DECIMAL(5,2) DEFAULT 0,
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    tamper_status BOOLEAN DEFAULT false,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pickup requests table
CREATE TABLE pickup_requests (
    request_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_type TEXT NOT NULL CHECK (user_type IN ('citizen', 'industry')),
    citizen_id UUID REFERENCES citizens(user_id),
    factory_id UUID REFERENCES factories(factory_id),
    citizen_name TEXT,
    citizen_contact TEXT,
    citizen_address TEXT,
    factory_name TEXT,
    factory_contact TEXT,
    factory_address TEXT,
    waste_type TEXT NOT NULL,
    estimated_quantity DECIMAL(8,2) NOT NULL,
    actual_quantity DECIMAL(8,2),
    description TEXT,
    preferred_date DATE,
    preferred_time TIME,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
    assigned_vendor UUID REFERENCES vendors(vendor_id),
    estimated_price DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    pickup_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
    transaction_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    request_id UUID REFERENCES pickup_requests(request_id),
    vendor_id UUID REFERENCES vendors(vendor_id),
    bin_id UUID REFERENCES bins(bin_id),
    factory_id UUID REFERENCES factories(factory_id),
    citizen_id UUID REFERENCES citizens(user_id),
    waste_type TEXT NOT NULL,
    collected_qty DECIMAL(8,2) NOT NULL,
    price_per_kg DECIMAL(8,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    pickup_cost DECIMAL(8,2) DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL,
    pickup_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_by_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_pickup_requests_status ON pickup_requests(status);
CREATE INDEX idx_pickup_requests_user_type ON pickup_requests(user_type);
CREATE INDEX idx_pickup_requests_waste_type ON pickup_requests(waste_type);
CREATE INDEX idx_bins_factory_id ON bins(factory_id);
CREATE INDEX idx_bins_fill_level ON bins(fill_level);
CREATE INDEX idx_transactions_vendor_id ON transactions(vendor_id);
CREATE INDEX idx_transactions_pickup_timestamp ON transactions(pickup_timestamp);

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE citizens ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_waste_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Citizens policies
CREATE POLICY "Citizens can view own data" ON citizens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Citizens can update own data" ON citizens FOR UPDATE USING (auth.uid() = user_id);

-- Vendors policies
CREATE POLICY "Vendors can view own data" ON vendors FOR SELECT USING (auth.uid() = vendor_id);
CREATE POLICY "Vendors can update own data" ON vendors FOR UPDATE USING (auth.uid() = vendor_id);
CREATE POLICY "Public can view active vendors" ON vendors FOR SELECT USING (is_active = true);

-- Vendor waste types policies
CREATE POLICY "Vendors can manage own waste types" ON vendor_waste_types FOR ALL USING (auth.uid() = vendor_id);
CREATE POLICY "Public can view vendor waste types" ON vendor_waste_types FOR SELECT USING (true);

-- Factories policies
CREATE POLICY "Factories can view own data" ON factories FOR SELECT USING (auth.uid() = factory_id);
CREATE POLICY "Factories can update own data" ON factories FOR UPDATE USING (auth.uid() = factory_id);

-- Bins policies
CREATE POLICY "Factories can view own bins" ON bins FOR SELECT USING (auth.uid() = factory_id);
CREATE POLICY "Factories can manage own bins" ON bins FOR ALL USING (auth.uid() = factory_id);

-- Pickup requests policies
CREATE POLICY "Users can view own requests" ON pickup_requests FOR SELECT USING (
    auth.uid() = citizen_id OR auth.uid() = factory_id OR auth.uid() = assigned_vendor
);
CREATE POLICY "Citizens can create requests" ON pickup_requests FOR INSERT WITH CHECK (auth.uid() = citizen_id);
CREATE POLICY "Factories can create requests" ON pickup_requests FOR INSERT WITH CHECK (auth.uid() = factory_id);
CREATE POLICY "Vendors can update assigned requests" ON pickup_requests FOR UPDATE USING (auth.uid() = assigned_vendor);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (
    auth.uid() = vendor_id OR auth.uid() = citizen_id OR auth.uid() = factory_id
);

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pickup_requests_updated_at BEFORE UPDATE ON pickup_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
