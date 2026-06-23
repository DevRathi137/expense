// Google Sheets Sync Module for Expense Tracker

const SHEETS_ENDPOINT = '/api/save-expense';
let syncInProgress = false;

// Save all state to Google Sheets
async function saveToSheet() {
  if (syncInProgress) {
    console.log('[Sheets] Save already in progress...');
    return;
  }

  const saveBtn = document.getElementById('saveSheetBtn');
  const syncDot = document.getElementById('syncDot');
  
  if (saveBtn) saveBtn.disabled = true;
  if (syncDot) {
    syncDot.className = 'syncing';
    syncDot.title = 'Syncing to Google Sheets...';
  }

  syncInProgress = true;

  try {
    console.log('[Sheets] Saving state:', state);
    
    const response = await fetch(SHEETS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save',
        dataType: 'full_state',
        state: state
      })
    });

    const result = await response.json();
    console.log('[Sheets] Save response:', result);

    if (result.success) {
      if (syncDot) {
        syncDot.className = '';
        syncDot.title = 'Last synced: ' + new Date().toLocaleTimeString();
      }
      console.log('[Sheets] Saved successfully at', result.timestamp);
      
      // Show brief success feedback
      if (saveBtn) {
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '✓ Saved';
        setTimeout(() => {
          if (saveBtn) saveBtn.textContent = originalText;
        }, 2000);
      }
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch (err) {
    console.error('[Sheets] Save failed:', err);
    if (syncDot) {
      syncDot.className = 'error';
      syncDot.title = 'Sync error: ' + err.message;
    }
    alert('Failed to save to Google Sheets: ' + err.message);
  } finally {
    syncInProgress = false;
    if (saveBtn) saveBtn.disabled = false;
  }
}

// Load state from Google Sheets
async function loadFromSheet() {
  const syncDot = document.getElementById('syncDot');
  
  if (syncDot) {
    syncDot.className = 'syncing';
    syncDot.title = 'Loading from Google Sheets...';
  }

  try {
    console.log('[Sheets] Loading from Google Sheets...');
    
    const response = await fetch(SHEETS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'load'
      })
    });

    const result = await response.json();
    console.log('[Sheets] Load response:', result);

    if (result.success && result.state) {
      // Merge loaded state with current state
      state = result.state;
      _ensureStateDefaults();
      
      // Also save to localStorage as backup
      localStorage.setItem('expTrackerV5', JSON.stringify(state));
      
      if (syncDot) {
        syncDot.className = '';
        syncDot.title = 'Loaded from Google Sheets';
      }
      console.log('[Sheets] Loaded successfully:', state);
      return true;
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch (err) {
    console.error('[Sheets] Load failed:', err);
    if (syncDot) {
      syncDot.className = 'error';
      syncDot.title = 'Load error: ' + err.message;
    }
    return false;
  }
}

// Auto-save on keyboard shortcut
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveToSheet();
  }
});
