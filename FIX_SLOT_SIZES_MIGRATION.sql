-- Migration: Fix slot_size values to be numeric instead of text-based
-- Date: 2025-11-28
-- Description: Updates existing ad_slots to use numeric slot sizes (calculated from width * height)
--              instead of text-based sizes like 'small', 'medium', 'large'

-- Update all slots to have numeric slot_size based on width * height
UPDATE ad_slots
SET slot_size = (width * height)::text
WHERE slot_size IS NOT NULL;

-- Alternative: If you only want to update text-based sizes and leave numeric ones alone
-- UPDATE ad_slots
-- SET slot_size = (width * height)::text
-- WHERE slot_size IN ('small', 'medium', 'large')
--    OR slot_size NOT IN ('1', '2', '4', '8', '12', '16');

-- Verify the update
SELECT 
  slot_position,
  slot_size AS old_size,
  width,
  height,
  (width * height) AS calculated_size,
  (width * height)::text AS new_size
FROM ad_slots
ORDER BY campaign_id, slot_position;

