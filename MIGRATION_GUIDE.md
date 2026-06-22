# Migration Guide: From Multi-User Supabase to Single-User Google Sheets

## Overview
This project has been simplified from a multi-user Supabase application to a single-user application using Google Sheets for data storage. This eliminates authentication complexity and makes the data easily accessible in a familiar spreadsheet format.

## What Changed

### ✅ Removed:
- Supabase database and authentication
- User login/signup system
- Row-level security and user isolation
- `js/supabase.js` file
- `supabase/migration.sql` folder
- All authentication UI components

### ✅ Added:
- Google Apps Script for Google Sheets integration
- Simple sync button to save/load data
- Local storage as primary cache
- `js/sheets-sync.js` for sheet synchronization

## Setup Instructions

### Step 1: Create Google Sheet & Deploy Script

1. Create a new Google Sheet (this will store all your expense data)
2. Go to **Extensions > Apps Script**
3. Delete the default code
4. Copy the entire contents of `google-apps-script/Code.gs` and paste it
5. Click **Save** (disk icon)
6. Click **Deploy > New deployment**
7. Settings:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Click **Deploy**
9. Copy the **Web app URL** (it looks like: `https://script.google.com/macros/s/...../exec`)

### Step 2: Configure Environment

1. Copy `.env.example` to `.env`
2. Add your Google Apps Script URL:
   ```
   SHEETS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ```
3. (Optional) Add Gemini API key for AI insights:
   ```
   GEMINI_API_KEY=your-gemini-key-here
   ```

### Step 3: Deploy to Vercel

```bash
npm install vercel -g
vercel
```

Follow the prompts to deploy.

### Step 4: Update index.html

The following changes need to be made to `index.html`:

#### Remove Supabase script tags (lines ~868-870):
```html
<!-- DELETE THESE LINES -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<script src="js/supabase.js"></script>
```

#### Add Sheets sync script instead:
```html
<!-- ADD THIS LINE -->
<script src="js/sheets-sync.js"></script>
```

#### Remove authentication overlay (lines ~827-865):
Delete the entire `<div id="authOverlay"...>...</div>` block

#### Remove auth UI from topbar (lines ~895-898):
```html
<!-- DELETE THESE LINES -->
<span class="auth-user-badge" id="topbarUser" title="Signed in as"></span>
<button class="ic-btn" id="signOutBtn" onclick="handleSignOut()" title="Sign out" style="display:none">&#x2192;</button>
```

#### Update sync dot title (line ~895):
```html
<!-- CHANGE FROM -->
<span id="syncDot" title="Supabase sync status"></span>

<!-- CHANGE TO -->
<span id="syncDot" title="Google Sheets sync status"></span>
```

#### Remove ALL Supabase function calls:

Replace ALL occurrences of these patterns:

```javascript
// FIND:
sbSaveExpense(m,expense).catch(showSyncError);
// REPLACE WITH:
// Auto-save handled by saveState()

// FIND:
sbSaveEntry(expId,entry).catch(showSyncError);
// REPLACE WITH:
// Auto-save handled by saveState()

// FIND:
sbDeleteExpense(id).catch(showSyncError);
// REPLACE WITH:
// Auto-save handled by saveState()

// Similar for all other sb* function calls
```

#### Remove authentication functions (lines ~2429-2510):
Delete these entire functions:
- `showAuthModal()`
- `hideAuthModal()`
- `showAuthForm()`
- `switchAuthTab()`
- `submitAuth()`
- `handleSignOut()`
- `setUserBadge()`

#### Replace initialization code (lines ~2504-2592):

```javascript
// DELETE the entire Supabase authentication and loading section
// REPLACE WITH:

// Initialize on page load
(async function init() {
  // Try to load from Google Sheets first
  const loaded = await loadFromSheet();
  
  if (!loaded) {
    // Fall back to localStorage
    loadState();
  }
  
  render();
  populatePaidBySelects();
})();
```

#### Remove diagnostic functions (lines ~2615-2660):
Delete:
- `window._testSupabase`
- `window._resync`

## How to Use

1. **Local Mode**: The app works offline using localStorage. All your data is saved in your browser.

2. **Sync to Sheet**: Click the "Save to sheet" button (or press Ctrl+S / Cmd+S) to backup your data to Google Sheets.

3. **Load from Sheet**: Refresh the page - it will automatically try to load your latest data from Google Sheets. If the sheet is empty or unavailable, it uses localStorage.

4. **View Your Data**: Open your Google Sheet to see all your expense data in a structured format.

## Benefits of This Approach

✅ **No authentication hassle** - Just open and use  
✅ **Your data in your Google Sheet** - Full control and easy export  
✅ **Works offline** - LocalStorage keeps everything cached  
✅ **Simple** - No database management or user accounts  
✅ **Reliable** - Google Sheets is more reliable than browser cache  

## Data Structure in Sheets

Your Google Sheet will have a simple structure:

| timestamp | dataType | jsonData |
|-----------|----------|----------|
| 2026-06-22T... | full_state | {"expenses":{...},...} |

All your expenses, wishlists, people, and splits are stored as JSON in a single row, making it easy to backup or migrate.

## Troubleshooting

### "Failed to save to Google Sheets"
- Check your `SHEETS_SCRIPT_URL` in `.env`
- Verify the Google Apps Script is deployed as "Anyone" can access
- Check the browser console for detailed error messages

### "Data not loading from sheet"
- The app will fall back to localStorage automatically
- Click "Save to sheet" to push your current data to Google Sheets
- Check if your Google Apps Script has the correct permissions

### "Sync dot shows error"
- Click on the sync status dot for error details
- Run the network tab in DevTools to see the actual API response
- Verify your Vercel function is working: visit `/api/save-expense` directly

## Migration from Old Version

If you have existing data in localStorage from the Supabase version:

1. Open the app - it will use your localStorage data
2. Click "Save to sheet" immediately
3. Your data is now backed up to Google Sheets
4. Future sessions will load from Google Sheets first

Your localStorage data is never deleted, so you always have a backup.
