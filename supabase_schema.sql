-- ============================================================
-- CHMSU OSAS Binalbagan - Lost and Found System
-- Supabase Database Schema
-- WP 06 Compliant
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: found_items
-- Stores all found/lost items logged into the system
-- Forms: F.18 (Found Property Report), F.21, F.22, F.23
-- ============================================================
CREATE TABLE IF NOT EXISTS found_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_code VARCHAR(50) NOT NULL UNIQUE,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Valuable', 'Non-Valuable', 'ID')),
    date_found DATE NOT NULL,
    location_found VARCHAR(255) NOT NULL,
    found_by VARCHAR(255),
    description TEXT NOT NULL,
    image TEXT,
    status VARCHAR(50) DEFAULT 'Logged' CHECK (status IN ('Logged', 'Posted', 'Claimed', 'Disposed')),
    
    -- Claim information
    claimant_name VARCHAR(255),
    claimant_id VARCHAR(100),
    claimant_contact VARCHAR(100),
    date_claimed DATE,
    claim_remarks TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_found_items_category ON found_items(category);
CREATE INDEX IF NOT EXISTS idx_found_items_status ON found_items(status);
CREATE INDEX IF NOT EXISTS idx_found_items_date_found ON found_items(date_found);
CREATE INDEX IF NOT EXISTS idx_found_items_item_code ON found_items(item_code);

-- ============================================================
-- TABLE: lost_items
-- Stores lost item reports from students/faculty
-- Form: F.19 (Lost Property Report)
-- ============================================================
CREATE TABLE IF NOT EXISTS lost_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Valuable', 'Non-Valuable', 'ID')),
    date_lost DATE NOT NULL,
    location_lost VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Matched', 'Closed')),
    
    -- Reporter information
    reporter_name VARCHAR(255) NOT NULL,
    reporter_contact VARCHAR(100) NOT NULL,
    reporter_email VARCHAR(255),
    reporter_id VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lost_items_status ON lost_items(status);
CREATE INDEX IF NOT EXISTS idx_lost_items_date_lost ON lost_items(date_lost);

-- ============================================================
-- TABLE: disposed_items
-- Tracks items turned over to CHMSU Cares/Extension Office
-- Form: F.20 (Acknowledgment of Item Disposition)
-- ============================================================
CREATE TABLE IF NOT EXISTS disposed_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_id UUID REFERENCES found_items(id) ON DELETE SET NULL,
    item_code VARCHAR(50) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    
    -- Disposal information
    disposal_date DATE NOT NULL,
    disposed_to VARCHAR(255) NOT NULL,
    received_by VARCHAR(255) NOT NULL,
    remarks TEXT,
    form_f20_number VARCHAR(100) NOT NULL UNIQUE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disposed_items_disposal_date ON disposed_items(disposal_date);

-- ============================================================
-- TABLE: system_settings
-- Stores admin profile and system configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    admin_name VARCHAR(255) DEFAULT 'OSAS Clerk',
    admin_profile_picture TEXT,
    last_backup_date TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO system_settings (id, admin_name) 
VALUES (1, 'OSAS Clerk')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS for security
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE found_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE disposed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (full access)
CREATE POLICY "Allow all access" ON found_items
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access" ON lost_items
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access" ON disposed_items
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access" ON system_settings
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for found_items
DROP TRIGGER IF EXISTS update_found_items_updated_at ON found_items;
CREATE TRIGGER update_found_items_updated_at
    BEFORE UPDATE ON found_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for lost_items
DROP TRIGGER IF EXISTS update_lost_items_updated_at ON lost_items;
CREATE TRIGGER update_lost_items_updated_at
    BEFORE UPDATE ON lost_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for system_settings
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SAMPLE DATA (Optional - for testing)
-- Uncomment if you want sample data
-- ============================================================
/*
INSERT INTO found_items (item_code, item_name, category, date_found, location_found, found_by, description, status)
VALUES 
    ('V-0001-0426', 'iPhone 13 Pro', 'Valuable', '2026-04-10', 'Library - 2nd Floor', 'Juan Dela Cruz', 'Black iPhone 13 Pro with clear case, 80% battery', 'Posted'),
    ('NV-0001-0426', 'Blue Umbrella', 'Non-Valuable', '2026-04-12', 'Canteen Area', 'Maria Santos', 'Blue folding umbrella, slightly wet', 'Logged'),
    ('V-0002-0426', 'Gold Necklace', 'Valuable', '2026-04-05', 'AVR Room', 'Pedro Reyes', '18k gold chain necklace with small pendant', 'Claimed');

INSERT INTO lost_items (item_name, category, date_lost, location_lost, description, reporter_name, reporter_contact, status)
VALUES 
    ('Black Wallet', 'Valuable', '2026-04-11', 'Canteen Area', 'Black leather wallet with IDs and cash', 'Carlos Mendoza', '09123456789', 'Pending');
*/

-- ============================================================
-- VIEWS FOR REPORTS
-- ============================================================

-- View for items ready for disposal (past retention period)
CREATE OR REPLACE VIEW items_for_disposal AS
SELECT 
    fi.*,
    CASE 
        WHEN fi.category = 'Valuable' THEN 180
        WHEN fi.category = 'Non-Valuable' THEN 90
        ELSE 30
    END as retention_days,
    CURRENT_DATE - fi.date_found as days_since_found,
    CURRENT_DATE - fi.date_found - CASE 
        WHEN fi.category = 'Valuable' THEN 180
        WHEN fi.category = 'Non-Valuable' THEN 90
        ELSE 30
    END as days_overdue
FROM found_items fi
WHERE fi.status NOT IN ('Claimed', 'Disposed')
AND CURRENT_DATE - fi.date_found > CASE 
    WHEN fi.category = 'Valuable' THEN 180
    WHEN fi.category = 'Non-Valuable' THEN 90
    ELSE 30
END;

-- View for monthly inventory summary
CREATE OR REPLACE VIEW monthly_inventory_summary AS
SELECT 
    DATE_TRUNC('month', date_found) as month,
    category,
    COUNT(*) as total_items,
    COUNT(*) FILTER (WHERE status = 'Claimed') as claimed_items,
    COUNT(*) FILTER (WHERE status = 'Disposed') as disposed_items,
    COUNT(*) FILTER (WHERE status IN ('Logged', 'Posted')) as pending_items
FROM found_items
GROUP BY DATE_TRUNC('month', date_found), category
ORDER BY month DESC, category;
