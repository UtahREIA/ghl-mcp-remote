import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pullGA4MonthlyData } from '../../lib/pullers/ga4';
// Ahrefs API requires their Enterprise plan; not currently active.
// Re-enable once confirmed: import { pullAhrefsMonthlyData } from '../../lib/pullers/ahrefs';
import { pullOpusClipMonthlyData } from '../../lib/pullers/opusclip';
import { pullGHLSocialMonthlyData } from '../../lib/pullers/ghl';
import { getOrCreateSpreadsheet, writeRowsToTab } from '../../lib/sheets';

function getLastMonthRange() {
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastOfLastMonth = new Date(firstOfThisMonth.getTime() - 1);

  const format = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: format(firstOfLastMonth), endDate: format(lastOfLastMonth) };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron sends a bearer token matching CRON_SECRET; reject anything else.
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { startDate, endDate } = getLastMonthRange();
  const monthLabel = startDate.slice(0, 7); // e.g. "2026-06"

  try {
    const spreadsheetId = await getOrCreateSpreadsheet();

    const [ga4Rows, opusRows, ghlRows] = await Promise.all([
      pullGA4MonthlyData(startDate, endDate),
      pullOpusClipMonthlyData(startDate),
      pullGHLSocialMonthlyData(startDate, endDate),
    ]);

    await writeRowsToTab(
      spreadsheetId,
      `GA4 - ${monthLabel}`,
      ['Date', 'Page Path', 'Sessions', 'Users', 'Conversions', 'Page Views'],
      ga4Rows.map((r) => [r.date, r.pagePath, r.sessions, r.users, r.conversions, r.pageViews]),
    );

    await writeRowsToTab(
      spreadsheetId,
      `GHL Engagement Stats - ${monthLabel}`,
      ['Platform', 'Impressions', 'Reach', 'Engagement (Likes+Comments+Shares)', 'Posts Published'],
      [
        [
          'Fill in via Claude in Chrome: GHL > Marketing > Social Planner > Analytics. See runbook for the exact prompt.',
          '',
          '',
          '',
          '',
        ],
      ],
    );

    await writeRowsToTab(
      spreadsheetId,
      `OpusClip - ${monthLabel}`,
      ['Clip ID', 'Title', 'Project ID', 'Score', 'Duration (s)', 'Created At'],
      opusRows.map((r) => [r.clipId, r.title, r.projectId, r.score, r.durationSeconds, r.createdAt]),
    );

    await writeRowsToTab(
      spreadsheetId,
      `GHL Social - ${monthLabel}`,
      ['Platform', 'Post ID', 'Posted At', 'Impressions', 'Reach', 'Engagement'],
      ghlRows.map((r) => [r.platform, r.postId, r.postedAt, r.impressions, r.reach, r.engagement]),
    );

    const summaryRows: (string | number)[][] = [
      ['GA4', 'Total Sessions', ga4Rows.reduce((sum, r) => sum + r.sessions, 0)],
      ['GA4', 'Total Conversions', ga4Rows.reduce((sum, r) => sum + r.conversions, 0)],
      ['OpusClip', 'Clips Produced', opusRows.length],
      ['OpusClip', 'Top Clip Score', opusRows[0]?.score ?? 0],
      ['GHL Social', 'Posts Published', ghlRows.length],
      ['GHL Social', 'Total Impressions', ghlRows.reduce((sum, r) => sum + r.impressions, 0)],
    ];

    await writeRowsToTab(spreadsheetId, `Summary - ${monthLabel}`, ['Source', 'Metric', 'Value'], summaryRows);

    return res.status(200).json({
      status: 'ok',
      spreadsheetId,
      month: monthLabel,
      counts: {
        ga4: ga4Rows.length,
        opusclip: opusRows.length,
        ghl: ghlRows.length,
      },
    });
  } catch (err: any) {
    console.error('Monthly content report failed:', err);
    return res.status(500).json({ error: err.message });
  }
}
