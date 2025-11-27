# Cash Tows EDDM Pro

A professional web application for analyzing and managing EDDM (Every Door Direct Mail) routes. Import route data, analyze metrics, optimize selections, and generate campaign summaries with integrated CRM, payment processing, and email marketing.

## Features

### Core Features
- **Authentication**: Secure sign in/sign up with Supabase
- **Route Management**: Import, analyze, and optimize EDDM routes
- **Contact CRM**: Manage clients through sales pipeline stages
- **Design Templates**: Create custom postcard templates with ad slots
- **Campaign Management**: Track EDDM campaigns and ad slot bookings
- **Email Marketing**: Send targeted email campaigns with scheduling
- **Payment Processing**: Integrated Stripe payments for ad slots
- **Packing Slips**: Generate USPS EDDM packing slips

### Advanced Features
- Route optimization for target quantities (2,500, 5,000, 10,000, 15,000)
- PDF import and processing for route data
- Demographic analysis and income targeting
- Team collaboration with account members
- Email templates with personalization
- Payment tracking and reporting

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- Stripe account (for payments)
- Resend account (for emails)

### Installation

1. Clone the repository and navigate to the project directory:
```bash
cd "Cash Tows EDDM Pro"
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
- Supabase URL and keys
- Stripe API keys
- Resend API key

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The production build will be in the `dist` directory.

## Production Deployment

### Netlify Deployment (Recommended)

1. **Connect Repository**:
   - Link your Git repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `dist`

2. **Configure Environment Variables**:
   Add these in Netlify dashboard under Site settings > Environment variables:
   ```
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   VITE_SUPABASE_SERVICE_ROLE_KEY
   STRIPE_SECRET_KEY
   STRIPE_WEBHOOK_SECRET
   RESEND_API_KEY
   RESEND_FROM_EMAIL
   ```

3. **Set up Netlify Functions**:
   - Functions are automatically deployed from `netlify/functions/`
   - Configure Stripe webhook to point to: `https://yourdomain.com/.netlify/functions/stripe-webhook`

4. **Deploy**:
   - Push to your main branch
   - Netlify will automatically build and deploy

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy the `dist` folder to your hosting provider

3. Set up serverless functions for:
   - Email sending (`send-email.js`)
   - Stripe webhooks (`stripe-webhook.js`)
   - Scheduled emails (`schedule-emails.js`)

### Post-Deployment Checklist

- [ ] Verify all environment variables are set
- [ ] Test authentication flow
- [ ] Configure Stripe webhook endpoint
- [ ] Set up custom domain and SSL
- [ ] Test payment processing
- [ ] Verify email sending works
- [ ] Check security headers are applied
- [ ] Monitor error logs

## Usage

### Getting Started
1. **Sign Up/Sign In**: Create an account or sign in to access the dashboard
2. **Import Routes**: Upload EDDM route PDFs or paste tab-separated data
3. **Analyze Routes**: View demographics, income levels, and costs
4. **Manage Contacts**: Add clients and track them through your sales pipeline
5. **Create Designs**: Build custom postcard templates with ad slots
6. **Launch Campaigns**: Create campaigns and assign ad slots to clients
7. **Process Payments**: Generate payment links and track transactions
8. **Send Emails**: Create and schedule email marketing campaigns

### Route Data Format

The application accepts tab-separated data with these columns:
- Route
- Residential
- Business
- Total
- Age: 25-34 (percentage)
- Size
- Income
- Cost

## Project Structure

```
Cash Tows EDDM Pro/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/               # Page components
│   │   ├── settings/        # Settings subpages
│   │   ├── Auth pages       # SignIn, SignUp
│   │   └── Feature pages    # Routes, Contacts, Designs, etc.
│   ├── hooks/               # Custom React hooks (useAuth)
│   ├── lib/                 # API clients (Supabase, API helpers)
│   ├── utils/               # Utility functions (PDF processing, etc.)
│   ├── App.jsx              # Main app with routing
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── netlify/
│   └── functions/           # Serverless functions
│       ├── send-email.js    # Email sending via Resend
│       ├── stripe-webhook.js # Stripe payment webhooks
│       └── schedule-emails.js # Scheduled email campaigns
├── public/
│   └── templates/           # EDDM PDF templates
├── dist/                    # Production build output
├── netlify.toml             # Netlify configuration
├── vite.config.js           # Vite build configuration
└── package.json             # Dependencies and scripts
```

## Technologies Used

### Frontend
- React 18 with hooks
- React Router DOM for routing
- Vite for build tooling
- Tailwind CSS for styling
- Lucide React for icons
- PDF.js for PDF processing
- PDF-lib for PDF generation

### Backend & Services
- Supabase for database and authentication
- Stripe for payment processing
- Resend for email delivery
- Netlify Functions for serverless backend

### Development
- ESLint for code quality
- PostCSS with Autoprefixer
- Git for version control

## Security

- All API keys stored in environment variables
- Supabase Row Level Security (RLS) policies
- Stripe webhook signature verification
- Security headers configured in Netlify
- Content Security Policy (CSP) enabled
- HTTPS enforced with HSTS

## Support & Documentation

For issues or questions:
1. Check the `.env.example` file for required environment variables
2. Review Supabase database schema and RLS policies
3. Verify Netlify function logs for serverless errors
4. Check browser console for client-side errors

## License

Proprietary - All rights reserved.

