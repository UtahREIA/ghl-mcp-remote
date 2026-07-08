import { google } from 'googleapis';

// Authenticates as info@utahreia.org via a long-lived refresh token instead of
// a service account key, since org policy blocks service account key creation.
// See scripts/get-refresh-token.js for how GOOGLE_OAUTH_REFRESH_TOKEN was generated.

export function getOAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  });

  return oauth2Client;
}
