# Canvas Tab Pricing & Color Fixes

## Issues Fixed

### Problem 1: Incorrect Pricing Display
**Issue**: Ad slots were not showing the correct prices because the system was trying to match text-based slot sizes ("small", "medium", "large") to numeric pricing fields (slot_1_price, slot_2_price, etc.)

**Root Cause**: When campaigns were created, slots were being saved with `slot_size: slotConfig.size`, which contained text values like "small", "medium", "large" instead of numeric values like "1", "2", "4", "8", "12", "16".

**Fix**: 
- Updated campaign creation to calculate numeric slot size as `width * height`
- Modified `getSlotBasePrice()` in CampaignCanvasTab to calculate slot count from width × height
- Now correctly matches slots to pricing: slot_1_price, slot_2_price, etc.

### Problem 2: Incorrect Slot Colors
**Issue**: Slot colors were not rendering correctly (e.g., slot 2 showing wrong color)

**Root Cause**: The `getSlotColor()` function was trying to parse text-based slot sizes and map them to colors.

**Fix**: 
- Updated `getSlotColor()` to calculate slot count from `width * height`
- Now correctly maps to color palette:
  - 1 slot = #dbeafe (blue)
  - 2 slots = #dcfce7 (green) ✅
  - 4 slots = #fef9c3 (yellow)
  - 8 slots = #fee2e2 (red)
  - 12 slots = #e0f2fe (cyan)
  - 16 slots = #ede9fe (purple)

## Files Modified

1. **src/pages/Campaigns.jsx**
   - Updated slot creation to use numeric slot sizes
   - Changed: `slot_size: slotConfig.size` → `slot_size: numericSlotSize.toString()`
   - Calculates: `numericSlotSize = slotConfig.width * slotConfig.height`

2. **src/components/campaign/CampaignCanvasTab.jsx**
   - Simplified `getSlotBasePrice()` to calculate slot count from width × height
   - Simplified `getSlotColor()` to calculate slot count from width × height
   - Removed complex parsing logic for text-based sizes

## Database Migration Required

### For Existing Campaigns

If you have existing campaigns with slots that were created before this fix, you need to run the migration to update their slot_size values.

**Migration File**: `FIX_SLOT_SIZES_MIGRATION.sql`

**How to Apply**:

1. **Using Supabase SQL Editor**:
   - Log in to Supabase dashboard
   - Go to SQL Editor
   - Copy contents of `FIX_SLOT_SIZES_MIGRATION.sql`
   - Run the SQL

2. **Using psql**:
   ```bash
   psql -h your-db-host -U your-db-user -d your-db-name -f FIX_SLOT_SIZES_MIGRATION.sql
   ```

**What the Migration Does**:
```sql
-- Updates all ad_slots to have numeric slot_size
UPDATE ad_slots
SET slot_size = (width * height)::text
WHERE slot_size IS NOT NULL;
```

This will convert:
- "small" → "1" (if width=1, height=1)
- "medium" → "2" (if width=1, height=2)
- "large" → "4" (if width=2, height=2)
- etc.

## Testing

After applying the migration:

1. **Open an existing campaign** with slots
2. **Go to the Canvas tab**
3. **Verify**:
   - ✅ Slot colors match the slot size (2-slot = green, 4-slot = yellow, etc.)
   - ✅ Prices display correctly based on campaign pricing (slot_2_price for 2-slot, etc.)
   - ✅ Hover overlay shows correct price

4. **Create a new campaign**
5. **Verify**:
   - ✅ New slots are created with numeric slot_size values
   - ✅ Colors and prices work immediately

## Expected Behavior

### Before Fix
- Slot 2 (width=1, height=2) → slot_size="medium" → ❌ Wrong color, wrong price
- System tried to match "medium" to pricing fields → Failed

### After Fix
- Slot 2 (width=1, height=2) → slot_size="2" → ✅ Green color, correct price
- System calculates: 1 × 2 = 2 → Uses campaign.slot_2_price

## Backwards Compatibility

The fix maintains backwards compatibility:
- Old campaigns with text sizes: Will work after migration
- New campaigns: Will use numeric sizes automatically
- Fallback pricing: Still supports old price_small/price_medium/price_large fields

## Troubleshooting

### Issue: Prices still showing as $0.00
**Solution**: 
1. Check if campaign has slot_X_price values set
2. Go to Campaign Settings → Ad Slot Prices
3. Set prices for each slot size
4. Save changes

### Issue: Colors still wrong after migration
**Solution**:
1. Verify migration ran successfully
2. Check ad_slots table: `SELECT slot_position, slot_size, width, height FROM ad_slots;`
3. Ensure slot_size is numeric (e.g., "2" not "medium")
4. Refresh browser cache (Ctrl+Shift+R)

### Issue: New campaigns still using text sizes
**Solution**:
1. Verify code changes are deployed/built
2. Check terminal for Vite HMR update confirmation
3. Hard refresh the page

## Summary

✅ **Fixed**: Slot colors now render correctly based on width × height calculation  
✅ **Fixed**: Slot prices now display correctly using slot_X_price fields  
✅ **Fixed**: New campaigns create slots with numeric slot_size values  
⚠️ **Action Required**: Run database migration for existing campaigns  

The canvas tab should now correctly display:
- Proper color coding for each slot size
- Accurate pricing from campaign slot pricing configuration
- Consistent behavior for both new and migrated campaigns

