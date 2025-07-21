-- Create notifications table for vendor notification system
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('pickup_request', 'bid_update', 'payment', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Industries table for referencing industry data
CREATE TABLE industries (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    address TEXT NOT NULL,
    factory_type TEXT,
    waste_types_produced TEXT[],
    monthly_waste_volume DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Indexes for industries
CREATE INDEX idx_industries_email ON industries(email);
CREATE INDEX idx_industries_is_active ON industries(is_active);

-- RLS policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (true);

-- RLS policies for industries
CREATE POLICY "Industries can view own data" ON industries FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Industries can update own data" ON industries FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Industries can insert own data" ON industries FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Public can view active industries" ON industries FOR SELECT USING (is_active = true);

-- Trigger for notifications updated_at
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
