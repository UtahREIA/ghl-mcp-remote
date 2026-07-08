import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { getOAuthClient } from '../google-auth';

// Authenticates as info@utahreia.org via refresh token (see lib/google-auth.ts)
// rather than a service account key, since org policy blocks key creation.
// Expects GA4_PROPERTY_ID as an env var on Vercel.

function getClient() {
  return new BetaAnalyticsDataClient({ authClient: getOAuthClient() as any });
}

export interface GA4Row {
  date: string;
  sessions: number;
  users: number;
  conversions: number;
  pagePath: string;
  pageViews: number;
}

export async function pullGA4MonthlyData(startDate: string, endDate: string): Promise<GA4Row[]> {
  const client = getClient();
  const propertyId = process.env.GA4_PROPERTY_ID;

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'date' }, { name: 'pagePath' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'conversions' },
      { name: 'screenPageViews' },
    ],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 500,
  });

  return (response.rows || []).map((row) => ({
    date: row.dimensionValues?.[0]?.value || '',
    pagePath: row.dimensionValues?.[1]?.value || '',
    sessions: Number(row.metricValues?.[0]?.value || 0),
    users: Number(row.metricValues?.[1]?.value || 0),
    conversions: Number(row.metricValues?.[2]?.value || 0),
    pageViews: Number(row.metricValues?.[3]?.value || 0),
  }));
}
