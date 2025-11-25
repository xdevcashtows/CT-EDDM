# Quick Start Guide - CT EDDM Pro

## 🚀 Get Running in 5 Minutes

### Step 1: Install Dependencies
```bash
cd "CT EDDM Pro"
npm install
```

### Step 2: Run the App (Development Mode)
```bash
npm run dev
```

The app will open at `http://localhost:5173`

**✅ The app now works WITHOUT Supabase configured!**

You'll see a yellow notice at the top indicating you're in development mode. All pages will load with empty data.

---

## 🔧 To Enable Full Functionality

### 1. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a project
2. In your Supabase dashboard, go to **SQL Editor**
3. Copy the entire contents of `supabase-schema.sql`
4. Paste and click **Run**
5. Wait for it to complete (creates all tables and storage buckets)

### 2. Get Your Supabase Keys

In your Supabase dashboard:
- Go to **Settings** > **API**
- Copy your **Project URL**
- Copy your **anon/public key**
- Copy your **service_role key** (keep this secret!)

### 3. Create .env File

Create a file named `.env` in the `CT EDDM Pro` folder:

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Storage Buckets
VITE_SUPABASE_STORAGE_BUCKET_CLIENT_ADS=client-ads
VITE_SUPABASE_STORAGE_BUCKET_BACKGROUNDS=design-backgrounds
VITE_SUPABASE_STORAGE_BUCKET_PACKING_SLIPS=packing-slips

# Stripe (optional for now)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend (optional for now)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@eddm.cashtows.com

# App Config
APP_DOMAIN=http://localhost:5173
VITE_APP_NAME=CT EDDM Pro
NODE_ENV=development
```

### 4. Restart the Dev Server

Stop the server (Ctrl+C) and run again:
```bash
npm run dev
```

Now the yellow notice will disappear and you'll have full database functionality!

---

## 📝 What Works Right Now (Without Supabase)

- ✅ All pages load
- ✅ Navigation works
- ✅ UI is fully functional
- ✅ Routes page (with local data)
- ✅ Packing Slips page
- ❌ Data won't persist (no database)
- ❌ Can't save contacts, campaigns, designs

## 📝 What Works With Supabase Configured

- ✅ Everything above PLUS:
- ✅ Save and load all data
- ✅ Create contacts with CRM
- ✅ Upload client ads
- ✅ Create design templates
- ✅ Build campaigns
- ✅ Assign ad slots
- ✅ Multi-user support

---

## 🎯 Testing the Full App

Once Supabase is configured, try this workflow:

1. **Routes Page**
   - Import your EDDM route data
   - Optimize for 5,000 households
   - Click "Save Selection"

2. **Contacts Page**
   - Click "Add Contact"
   - Fill in business details
   - Upload a logo/ad image
   - Save

3. **Designs Page**
   - Click "New Design"
   - Choose card size (9×12 or 6×12)
   - Set background
   - Configure ad slots
   - Save

4. **Campaigns Page**
   - Click "New Campaign"
   - Follow the 3-step wizard:
     - Enter campaign name
     - Select saved route and design
     - Set pricing
   - Create campaign
   - Assign slots to clients

5. **Home Dashboard**
   - See all your metrics update in real-time!

---

## ❓ Troubleshooting

### Pages Still Loading Forever?
- Check browser console for errors
- Make sure you ran `npm install`
- Try clearing browser cache and reloading

### "Module not found" errors?
```bash
npm install
```

### Supabase connection errors?
- Double-check your `.env` file
- Make sure keys are correct
- Restart dev server after adding `.env`

### Storage bucket errors?
- Make sure you ran the `supabase-schema.sql` file
- Check that buckets were created in Supabase dashboard

---

## 📚 More Help

- **Full setup guide**: See `FINAL_STATUS.md`
- **Environment variables**: See `ENV_SETUP.md`
- **Database schema**: See `supabase-schema.sql`

---

## 🎉 You're All Set!

The app is now running and ready to use. Start with development mode to explore the UI, then add Supabase when you're ready to save real data.

**Questions?** Check the browser console for helpful messages and warnings.

