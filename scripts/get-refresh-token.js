// Run this ONCE locally (not on Vercel) to generate a refresh token for
// info@utahreia.org. Requires the OAuth Client ID + Secret from Cloud Console
// (Credentials -> Create Credentials -> OAuth client ID -> Desktop app).
//
// Usage:
//   npm install googleapis open
//   GOOGLE_OAUTH_CLIENT_ID=xxx GOOGLE_OAUTH_CLIENT_SECRET=xxx node get-refresh-token.js
//
// A browser window opens. Log in as info@utahreia.org and approve access.
// The script then prints the refresh token to paste into Vercel env vars.

const { google } = require('googleapis');
const http = require('http');
const open = require('open').default;
const url = require('url');

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
];

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET first.');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // forces a refresh token to be issued even on repeat runs
    scope: SCOPES,
  });

  const server = http.createServer(async (req, res) => {
    if (!req.url?.startsWith('/oauth2callback')) return;

    const qs = new url.URL(req.url, REDIRECT_URI).searchParams;
    const code = qs.get('code');

    res.end('Auth complete. You can close this tab and return to your terminal.');
    server.close();

    const { tokens } = await oauth2Client.getToken(code);

    console.log('\n--- Save these as Vercel env vars ---');
    console.log(`GOOGLE_OAUTH_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GOOGLE_OAUTH_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('--------------------------------------\n');
  });

  server.listen(3000, () => {
    console.log('Opening browser for you to log in as info@utahreia.org...');
    open(authUrl);
  });
}

main();
