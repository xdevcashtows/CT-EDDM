# Cash Tows EDDM Pro

A professional web application for analyzing and managing EDDM (Every Door Direct Mail) routes. Import route data, analyze metrics, optimize selections, and generate campaign summaries.

## Features

- **Authentication**: Sign in/Sign up with secure session management
- **Data Import**: Paste tab-separated EDDM route data for analysis
- **Route Analysis**: View comprehensive metrics including residential/business counts, demographics, income, and costs
- **Data Table**: Sortable table with batch selection capabilities
- **Optimization Tools**: Optimize route selections for target quantities (2,500, 5,000, 10,000, 15,000)
- **Saved Selections**: Save and manage route selections
- **Campaign Summary**: Generate EDDM campaign summaries with key metrics
- **Print Support**: Print route selection summaries with customizable display options

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
```bash
cd "Cash Tows EDDM Pro"
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The production build will be in the `dist` directory.

## Usage

1. **Sign Up/Sign In**: Create an account or sign in to access the dashboard
2. **Import Data**: Paste your tab-separated EDDM route data into the import panel
3. **Analyze Routes**: View metrics and filter by residential-only routes
4. **Select Routes**: Use checkboxes to select routes for your campaign
5. **Optimize**: Use optimization buttons to automatically select routes for target quantities
6. **Save Selections**: Save your route selections for later use
7. **Generate Summary**: View campaign summaries and print reports

## Data Format

The application expects tab-separated data with the following columns:
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
│   ├── components/       # Reusable UI components
│   ├── pages/            # Page components (SignIn, SignUp, Dashboard)
│   ├── App.jsx           # Main app component with routing
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
├── index.html
├── package.json
└── vite.config.js
```

## Technologies Used

- React 18
- React Router DOM
- Vite
- CSS3

## License

Free to use and modify as needed.

