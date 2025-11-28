# Row Level Security (RLS) Policies - Security Fix

## ⚠️ CRITICAL SECURITY ISSUE

Three tables/views are currently **UNRESTRICTED**, meaning any authenticated user can access **ANY user's data**. This is a serious security vulnerability!

## Affected Tables/Views

### 1. `pipeline_stages` ⚠️ CRITICAL
- **Type**: Table (newly created)
- **Contains**: User-specific pipeline stage configurations
- **Current State**: NO RLS POLICIES ❌
- **Risk**: Any user can see/modify other users' custom pipeline stages
- **Impact**: High - this is the new table we just created for pipeline management

### 2. `campaign_revenue` ⚠️ HIGH PRIORITY
- **Type**: View (or table)
- **Contains**: User-specific campaign revenue data
- **Current State**: NO RLS POLICIES ❌
- **Risk**: Any user can see other users' revenue data
- **Impact**: High - financial data exposure

### 3. `contact_pipeline_summary` ⚠️ HIGH PRIORITY
- **Type**: View (or table)
- **Contains**: User-specific contact pipeline statistics
- **Current State**: NO RLS POLICIES ❌
- **Risk**: Any user can see other users' contact statistics
- **Impact**: Medium-High - business intelligence data exposure

## Why This is a Problem

Without RLS policies, any authenticated user can run:

```sql
-- Without RLS, User A can see User B's pipeline stages!
SELECT * FROM pipeline_stages WHERE user_id = 'user-b-id';

-- Without RLS, User A can see User B's revenue!
SELECT * FROM campaign_revenue WHERE user_id = 'user-b-id';

-- Without RLS, User A can see User B's contact stats!
SELECT * FROM contact_pipeline_summary WHERE user_id = 'user-b-id';
```

## The Solution

The SQL file `ADD_RLS_POLICIES_FOR_UNRESTRICTED_TABLES.sql` adds:

### For `pipeline_stages` (Table)
```sql
-- Enable RLS on the table
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Add 4 policies: SELECT, INSERT, UPDATE, DELETE
-- All policies enforce: auth.uid() = user_id
```

### For `campaign_revenue` (View)
```sql
-- Recreate as a SECURE VIEW with security_barrier
-- Add WHERE clause: user_id = auth.uid()
-- This filters data at the database level
```

### For `contact_pipeline_summary` (View)
```sql
-- Recreate as a SECURE VIEW with security_barrier
-- Add WHERE clause: user_id = auth.uid()
-- This filters data at the database level
```

## How RLS Works

### Before RLS (Unrestricted)
```
User A logs in → Queries pipeline_stages
                  ↓
Database returns ALL rows (including User B's, C's, etc.)
                  ↓
Application has to filter (but database already exposed data!)
```

### After RLS (Secure)
```
User A logs in → Queries pipeline_stages
                  ↓
Database checks: auth.uid() = user_id
                  ↓
Database returns ONLY User A's rows
                  ↓
Impossible for User A to see other users' data
```

## Migration Steps

### Step 1: Backup (Optional but Recommended)
```bash
# Backup these tables/views before making changes
pg_dump -d your_database -t pipeline_stages -t campaign_revenue -t contact_pipeline_summary > backup.sql
```

### Step 2: Apply RLS Policies
```bash
# Run the security fix SQL
psql -d your_database < ADD_RLS_POLICIES_FOR_UNRESTRICTED_TABLES.sql
```

### Step 3: Verify
```sql
-- Check that RLS is enabled on pipeline_stages
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'pipeline_stages';
-- Should return: rowsecurity = true

-- Check policies exist
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'pipeline_stages';
-- Should show 4 policies: SELECT, INSERT, UPDATE, DELETE

-- Test data isolation
-- (As User A, try to access User B's data - should return 0 rows)
SELECT * FROM pipeline_stages WHERE user_id != auth.uid();
-- Should return 0 rows
```

### Step 4: Update CREATE_PIPELINE_STAGES_TABLE.sql
Add RLS policies to the original creation script so future deployments are secure:

```sql
-- Add at the end of CREATE_PIPELINE_STAGES_TABLE.sql

-- Enable Row Level Security
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Add policies (same as in the fix file)
CREATE POLICY "Users can view own pipeline stages"...
```

## Testing Checklist

- [ ] Run the SQL file successfully
- [ ] Verify RLS is enabled on `pipeline_stages`
- [ ] Verify 4 policies exist for `pipeline_stages`
- [ ] Verify views are recreated with security_barrier
- [ ] Test as User A - can see own data
- [ ] Test as User A - cannot see User B's data
- [ ] Test pipeline stage CRUD operations work normally
- [ ] Test dashboard loads campaign_revenue correctly
- [ ] Test contacts page loads pipeline summary correctly

## Impact on Application Code

**Good News**: NO APPLICATION CODE CHANGES NEEDED! ✅

The RLS policies are enforced at the database level. Your existing API calls will continue to work exactly as before, but now they're automatically secured by the database.

```javascript
// This code doesn't change at all!
const { data } = await supabase
  .from('pipeline_stages')
  .select('*')
  .eq('user_id', userId);

// Before: Database returned all users' stages (security risk!)
// After: Database automatically filters to only current user's stages (secure!)
```

## Why Views Need Special Handling

Views in PostgreSQL don't support RLS policies directly. Instead, we use:

1. **`security_barrier = true`**: Forces PostgreSQL to apply security filters BEFORE any other query optimization
2. **`security_invoker = true`**: Runs the view with the permissions of the current user (not the view creator)
3. **`WHERE user_id = auth.uid()`**: Hardcoded filter in the view definition

This ensures views are just as secure as tables with RLS.

## Additional Security Recommendations

While fixing these three, consider reviewing:

1. **Storage buckets**: Ensure client_ads images are only accessible to owners
2. **Email logs**: Verify users can't see other users' email activity
3. **Audit logging**: Consider adding audit trails for sensitive operations
4. **Rate limiting**: Add rate limits to prevent data scraping attempts

## Questions?

- **Q: Will this break existing functionality?**
  - A: No! The app already filters by user_id in most queries. RLS adds an extra security layer at the database level.

- **Q: What if we want team members to share data?**
  - A: You can add additional policies that check the `account_members` table (like contacts already does).

- **Q: Can I test this in development first?**
  - A: Yes! Apply to your dev database first, test thoroughly, then apply to production.

- **Q: What happens if I forget to add user_id in a query?**
  - A: RLS will still protect you! Even if your application code forgets to filter by user_id, the database will automatically add that filter.

## Next Steps

1. ✅ Review this document
2. ✅ Review the SQL file: `ADD_RLS_POLICIES_FOR_UNRESTRICTED_TABLES.sql`
3. ⏳ Apply to development database and test
4. ⏳ Apply to production database
5. ⏳ Update CREATE_PIPELINE_STAGES_TABLE.sql with RLS policies
6. ⏳ Mark as complete in your security checklist

