-- Add custom_price column to ad_slots table
-- This allows per-slot pricing when negotiated rates differ from campaign base prices

ALTER TABLE ad_slots
ADD COLUMN custom_price DECIMAL(10, 2) DEFAULT NULL;

COMMENT ON COLUMN ad_slots.custom_price IS 'Custom negotiated price for this specific slot. If NULL, uses campaign base pricing (slot_1_price, slot_2_price, etc.) based on slot size.';

