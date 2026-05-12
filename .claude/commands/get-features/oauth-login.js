/**
 * oauth-login.js
 * OAuth 2.0 (3-legged) authentication against Atlassian / Jira
 *
 * Usage:
 *   node oauth-login.js
 *
 * - Opens the browser with the Atlassian login screen
 * - The user enters their Jira credentials
 * - The token is saved to tokens.json (personal per user)
 * - Expires in 60 min; the refresh token allows renewal without logging in again
 */

const http    = require('http');
const https   = require('https');
const { exec } = require('child_process');
const fs      = require('fs');
const crypto  = require('crypto');
const path    = require('path');

// Load shared configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'oauth-config.json')));

const CLIENT_ID     = config.client_id;
const CLIENT_SECRET = config.client_secret;
const REDIRECT_URI  = config.redirect_uri;
const SCOPES        = config.scopes;
const TOKENS_FILE   = path.join(__dirname, 'tokens.json');

const state = crypto.randomBytes(16).toString('hex');

const authUrl =
  'https://auth.atlassian.com/authorize' +
  '?audience=api.atlassian.com' +
  '&client_id=' + CLIENT_ID +
  '&scope=' + encodeURIComponent(SCOPES) +
  '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) +
  '&state=' + state +
  '&response_type=code' +
  '&prompt=consent';

function openBrowser(url) {
  const platform = process.platform;
  if (platform === 'win32') {
    exec('start "" "' + url + '"');
  } else if (platform === 'darwin') {
    exec('open "' + url + '"');
  } else {
    exec('xdg-open "' + url + '"');
  }
}

function exchangeCode(code) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      grant_type:    'authorization_code',
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code:          code,
      redirect_uri:  REDIRECT_URI
    });

    const req = https.request({
      hostname: 'auth.atlassian.com',
      path:     '/oauth/token',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  const url   = new URL(req.url, 'http://localhost:3000');
  const error = url.searchParams.get('error');
  const code  = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');

  if (url.pathname !== '/callback') {
    res.writeHead(404); res.end(); return;
  }

  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>Error: ' + error + '</h2><p>Close this tab and try again.</p>');
    console.error('\nAuthentication error:', error);
    server.close(); return;
  }

  if (returnedState !== state) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>Security error: invalid state</h2>');
    server.close(); return;
  }

  try {
    const tokens = await exchangeCode(code);

    if (tokens.error) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h2>Error obtaining token: ' + tokens.error_description + '</h2>');
      console.error('\nToken error:', tokens);
      server.close(); return;
    }

    tokens.obtained_at = new Date().toISOString();
    tokens.expires_at  = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <html><body style="font-family:sans-serif;padding:40px;max-width:500px">
        <h2>Authentication successful</h2>
        <p>Token saved to <code>tokens.json</code></p>
        <table border="1" cellpadding="8" style="border-collapse:collapse">
          <tr><td>Expires in</td><td>${Math.round(tokens.expires_in / 60)} minutes</td></tr>
          <tr><td>Refresh token</td><td>${tokens.refresh_token ? 'Yes (auto-renewal available)' : 'No'}</td></tr>
        </table>
        <p>You can close this tab.</p>
      </body></html>
    `);

    console.log('\nAuthentication successful!');
    console.log('User authenticated, token saved to tokens.json');
    console.log('Expires: ' + tokens.expires_at);

    server.close();

  } catch (e) {
    res.writeHead(500); res.end('Internal error: ' + e.message);
    server.close();
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error('\nError: port 3000 is already in use.');
    console.error('Close any process using it and try again.');
    process.exit(1);
  }
});

server.listen(3000, () => {
  console.log('Starting OAuth 2.0 authentication...');
  console.log('Opening browser... sign in with your Jira account.');
  openBrowser(authUrl);
});
