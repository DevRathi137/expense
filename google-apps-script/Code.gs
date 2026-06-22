/**
 * EXPENSE TRACKER - GOOGLE APPS SCRIPT
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete default code and paste this entire file
 * 4. Click Deploy > New deployment
 * 5. Type: Web app
 * 6. Execute as: Me
 * 7. Who has access: Anyone
 * 8. Copy the deployment URL
 * 9. Add URL to your .env as SHEETS_SCRIPT_URL
 */

const SHEET_NAME = 'ExpenseData';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    // Get or create the data sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      // Initialize with headers
      sheet.appendRow(['timestamp', 'dataType', 'jsonData']);
      sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
    }
    
    if (action === 'save') {
      return saveData(sheet, data);
    } else if (action === 'load') {
      return loadData(sheet);
    } else {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Unknown action' })
      ).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function saveData(sheet, data) {
  const timestamp = new Date().toISOString();
  const dataType = data.dataType || 'full_state';
  const jsonData = JSON.stringify(data.state);
  
  // Find existing row for this dataType or append new
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (values[i][1] === dataType) {
      rowIndex = i + 1; // +1 because getRange is 1-indexed
      break;
    }
  }
  
  if (rowIndex > 0) {
    // Update existing row
    sheet.getRange(rowIndex, 1, 1, 3).setValues([[timestamp, dataType, jsonData]]);
  } else {
    // Append new row
    sheet.appendRow([timestamp, dataType, jsonData]);
  }
  
  return ContentService.createTextOutput(
    JSON.stringify({ success: true, timestamp })
  ).setMimeType(ContentService.MimeType.JSON);
}

function loadData(sheet) {
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // Find the full_state row
  for (let i = 1; i < values.length; i++) {
    if (values[i][1] === 'full_state') {
      const jsonData = values[i][2];
      const state = JSON.parse(jsonData);
      return ContentService.createTextOutput(
        JSON.stringify({ success: true, state })
      ).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // No data found, return empty state
  return ContentService.createTextOutput(
    JSON.stringify({ 
      success: true, 
      state: {
        expenses: {},
        people: [],
        splits: {},
        wishlist: [],
        settlements: {},
        budget: 30000
      }
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

// Test function - run this to verify script works
function testScript() {
  const testData = {
    action: 'save',
    dataType: 'full_state',
    state: {
      expenses: {},
      people: [],
      splits: {},
      wishlist: [],
      settlements: {},
      budget: 30000
    }
  };
  
  const e = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const result = doPost(e);
  Logger.log(result.getContent());
}
