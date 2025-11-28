# Niche Selection Feature Implementation

## Overview
A new "Niche Selection" step has been added to the campaign creation flow, allowing users to control how niches are managed within campaigns.

## What Was Implemented

### 1. New Campaign Creation Step
The campaign creation flow now includes **5 steps** (previously 4):
1. **Templates** - Select front and back templates
2. **Pricing** - Set ad slot prices
3. **Niches** ⭐ **NEW** - Configure niche restrictions
4. **Route** - Select saved route
5. **Contacts** - Configure email communications

### 2. Niche Restriction Options

Users can choose between two niche management modes:

#### Option A: "Any Niche Accepted" (Default)
- **Description**: All niches are allowed to participate in the campaign
- **Use Case**: When you want maximum flexibility and don't need to restrict by niche
- **Behavior**: Clients from any niche can be assigned to ad slots

#### Option B: "One Niche Per Campaign"
- **Description**: Restrict which niches can participate, with only ONE niche allowed per canvas
- **Important Rule**: ⚠️ Only ONE niche can be assigned per canvas (combining both front AND back ad slots)
- **Use Case**: When you want to ensure that each canvas (mailer) is dedicated to a single niche/industry
- **Workflow**:
  1. User selects "One Niche Per Campaign" mode
  2. A list of all available niches appears with checkboxes
  3. User checks which niches are allowed in this campaign
  4. During ad slot assignment, only ONE of the selected niches can be used per canvas (front + back combined)

### 3. User Interface

The niche selection step features:
- **Modern card-based design** matching the existing Contacts step styling
- **Visual selection buttons** with icons for easy mode switching
- **Checkbox list** for selecting allowed niches (when using "One Niche Per Campaign")
- **Helper text** explaining the current selection and rules
- **Selection counter** showing how many niches are selected
- **Color-coded avatars** for each niche in the list

### 4. Validation

The step includes validation to ensure:
- User cannot advance from the Niche step if they selected "One Niche Per Campaign" but haven't chosen any niches
- The "Any Niche Accepted" option allows immediate advancement (no selection required)

## Database Schema Changes

### Required Migration
You **MUST** run the SQL migration to add the new columns to your `campaigns` table.

**Migration File**: `DATABASE_MIGRATION_NICHE_SELECTION.sql`

This adds two new columns:
1. `niche_restriction_type` (TEXT) - Values: 'any' or 'one_per_campaign'
2. `allowed_niches` (TEXT[]) - Array of niche IDs when restriction type is 'one_per_campaign'

### How to Apply the Migration

**Option 1: Using Supabase SQL Editor**
1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy the contents of `DATABASE_MIGRATION_NICHE_SELECTION.sql`
4. Paste and run the SQL

**Option 2: Using psql or another PostgreSQL client**
```bash
psql -h your-db-host -U your-db-user -d your-db-name -f DATABASE_MIGRATION_NICHE_SELECTION.sql
```

## Testing Instructions

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Navigate to Campaigns
- Sign in to the application
- Go to the "Campaign Cards" page
- Click "New Campaign" button

### 3. Test the Niche Selection Step

**Test Case 1: Any Niche Accepted (Default)**
1. Enter campaign name
2. Select front and back templates
3. Continue through pricing
4. On the **Niches** step, verify "Any Niche Accepted" is selected by default
5. Click "Next step" - should advance immediately (no validation)
6. Complete the campaign

**Test Case 2: One Niche Per Campaign**
1. Create a new campaign
2. Enter campaign name and select templates
3. Continue through pricing
4. On the **Niches** step, click "One Niche Per Campaign"
5. Verify the niche checkbox list appears
6. Try clicking "Next step" without selecting any niches
   - **Expected**: Cannot advance (validation prevents it)
7. Select 2-3 niches from the list
8. Verify the selection counter updates (e.g., "3 niches selected • Remember: Only ONE niche per canvas")
9. Click "Next step" - should advance successfully
10. Complete the campaign

### 4. Verify Data Persistence
After creating a campaign:
1. Check the database `campaigns` table
2. Verify the new columns are populated:
   - `niche_restriction_type` should be 'any' or 'one_per_campaign'
   - `allowed_niches` should be an empty array or contain selected niche IDs

## Code Changes Summary

### Files Modified
- **src/pages/Campaigns.jsx**
  - Added `niche_restriction_type` and `allowed_niches` to campaign form data
  - Created `nicheStepContent` with full UI for niche selection
  - Added `handleNicheToggle` function for checkbox management
  - Updated `steps` array to include 'Niches'
  - Updated `stepContents` to include `nicheStepContent`
  - Added `isNicheStepComplete` validation
  - Updated `canAdvanceFromStep` to validate niche step

### Key Functions Added
```javascript
// Toggle a niche on/off in the allowed_niches array
const handleNicheToggle = (nicheId) => {
  // Adds or removes niche ID from allowed_niches
}

// Validation for niche step completion
const isNicheStepComplete = 
  formData.niche_restriction_type === 'any' || 
  (formData.niche_restriction_type === 'one_per_campaign' && 
   (formData.allowed_niches || []).length > 0);
```

## Business Logic: "One Niche Per Canvas"

When `niche_restriction_type` is set to `'one_per_campaign'`:

1. **During Campaign Creation**: User selects which niches can participate
2. **During Ad Slot Assignment**: 
   - The canvas (which includes BOTH front and back ad slots) can only have ads from ONE niche
   - If a front slot is assigned to a contact with niche "Restaurants", then all back slots on that canvas must also be "Restaurants" or remain empty
   - No mixing of niches on a single canvas

### Implementation Note
The UI for enforcing this rule during slot assignment will need to be implemented separately. Currently, the campaign creation step allows users to:
- Configure the restriction type
- Select which niches are allowed

The slot assignment logic should check:
```javascript
// Pseudo-code for future slot assignment enforcement
if (campaign.niche_restriction_type === 'one_per_campaign') {
  // Get all slots already assigned on this canvas (front + back)
  const canvasSlots = slots.filter(s => s.canvas_id === currentCanvas);
  const assignedNiches = canvasSlots
    .filter(s => s.contact_id)
    .map(s => contacts.find(c => c.id === s.contact_id)?.niche_id);
  
  // If there's already a niche assigned, only allow that niche
  if (assignedNiches.length > 0) {
    const allowedNicheForThisCanvas = assignedNiches[0];
    // Filter contacts to only show those with allowedNicheForThisCanvas
  }
}
```

## Future Enhancements

1. **Slot Assignment Enforcement**: Update the slot assignment UI to enforce the "one niche per canvas" rule
2. **Visual Indicators**: Show which niches are already used on the canvas during assignment
3. **Niche Analytics**: Add reporting on niche distribution across campaigns
4. **Bulk Operations**: Allow copying niche settings from one campaign to another

## Support

If you encounter any issues:
1. Verify the database migration was applied successfully
2. Check the browser console for any errors
3. Ensure niches exist in the `niches` table (create some if needed)
4. Clear browser cache and reload

## Summary

✅ **Completed**: Campaign creation now includes niche selection step with two modes
✅ **Completed**: UI for selecting restriction type and allowed niches
✅ **Completed**: Form validation to ensure proper configuration
✅ **Completed**: Database migration SQL file
⏳ **Pending**: Slot assignment enforcement logic (separate implementation)

The feature is fully functional for campaign creation. The next step would be to implement the enforcement logic in the slot assignment workflow to actually restrict assignments based on the configured settings.

