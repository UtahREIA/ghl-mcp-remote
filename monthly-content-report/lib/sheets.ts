import { google } from 'googleapis';
import { getOAuthClient } from './google-auth';

// Authenticates as info@utahreia.org via refresh token (see lib/google-auth.ts).
// Since that account already owns the target sheet, no separate sharing step
// is needed. SHEETS_SPREADSHEET_ID should already be set to the sheet David
// created via Drive, so getOrCreateSpreadsheet just returns it directly.

async function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getOAuthClient() });
}

export async function getOrCreateSpreadsheet(): Promise<string> {
  if (process.env.SHEETS_SPREADSHEET_ID) {
    return process.env.SHEETS_SPREADSHEET_ID;
  }

  const sheets = await getSheetsClient();
  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: 'Utah REIA Monthly Content Performance' },
    },
  });

  const spreadsheetId = created.data.spreadsheetId as string;
  console.log(`Created new spreadsheet. Save this as SHEETS_SPREADSHEET_ID: ${spreadsheetId}`);
  return spreadsheetId;
}

async function ensureTab(spreadsheetId: string, sheets: any, tabName: string) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets?.some((s: any) => s.properties.title === tabName);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tabName } } }],
      },
    });
  }
}

export async function writeRowsToTab(
  spreadsheetId: string,
  tabName: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const sheets = await getSheetsClient();
  await ensureTab(spreadsheetId, sheets, tabName);

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${tabName}!A1:Z10000`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [headers, ...rows],
    },
  });
}
