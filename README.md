# Monthly Expense Tracker

A simple, single-user expense tracking web app with Google Sheets backup.

## Features

- 📊 Track monthly expenses by category
- 👥 Split expenses with roommates/family
- 📈 Visual charts and analytics
- 💾 Google Sheets backup for reliable storage
- 🎨 Clean, modern UI
- 📱 Mobile-friendly design
- 🔄 Works offline with localStorage cache

## Quick Start

### 1. Set Up Google Sheets

1. Create a new Google Sheet
2. Go to **Extensions > Apps Script**
3. Copy code from `google-apps-script/Code.gs`
4. Deploy as Web App (Execute as: Me, Access: Anyone)
5. Copy the deployment URL

### 2. Configure Environment

Create `.env` file:
```bash
SHEETS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
GEMINI_API_KEY=your-gemini-key-here  # Optional, for AI insights
```

### 3. Deploy

```bash
npm install vercel -g
vercel
```

### 4. Use the App

- Open the deployed URL
- Add expenses, people, and split costs
- Click "Save to sheet" (or Ctrl+S) to backup to Google Sheets
- Your data syncs automatically on page load

## How It Works

- **Local First**: All data is stored in your browser's localStorage for instant access
- **Cloud Backup**: Click "Save to sheet" to backup your data to Google Sheets
- **Auto Load**: On page load, the app fetches the latest data from Google Sheets
- **Single User**: No authentication needed - your Google Sheet is your database

## Project Structure

```
├── index.html              # Main app (needs manual Supabase removal)
├── js/
│   └── sheets-sync.js     # Google Sheets sync logic
├── api/
│   ├── save-expense.js    # Vercel serverless function
│   └── report-insights.js # AI insights (optional)
├── google-apps-script/
│   └── Code.gs            # Google Apps Script for Sheets
└── MIGRATION_GUIDE.md     # Detailed migration instructions
```

## Migration Required

⚠️ **Important**: The `index.html` still contains Supabase references. Follow `MIGRATION_GUIDE.md` to complete the migration to Google Sheets.

**Key changes needed:**
1. Remove Supabase script tags
2. Remove authentication UI
3. Replace all `sb*` function calls
4. Update initialization code

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for complete instructions.

## Tech Stack

- Vanilla JavaScript (no frameworks)
- Chart.js for visualizations
- Google Sheets for data storage
- Vercel serverless functions
- Gemini AI for insights (optional)
