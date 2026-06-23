// Simple local server for testing
const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Load .env file

const PORT = 3000;
const SHEETS_URL = process.env.SHEETS_SCRIPT_URL;

if (!SHEETS_URL) {
  console.error('❌ ERROR: SHEETS_SCRIPT_URL not found in .env file!');
  process.exit(1);
}

console.log('✅ Using Google Sheets URL:', SHEETS_URL);

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Handle API endpoint
  if (req.url === '/api/save-expense' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        
        console.log('Forwarding to Google Sheets:', SHEETS_URL);
        
        // Forward to Google Sheets
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(SHEETS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(data)
        });

        const result = await response.text();
        console.log('Google Sheets response:', result.substring(0, 200));
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(result);
      } catch (err) {
        console.error('API Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Serve static files
  let filePath = '.' + req.url;
  if (filePath === './') filePath = './test.html';

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log('\n🚀 Local server running!');
  console.log(`\n   📱 Open: http://localhost:${PORT}`);
  console.log(`   🧪 Test: http://localhost:${PORT}/test.html`);
  console.log('\n   Press Ctrl+C to stop\n');
});
