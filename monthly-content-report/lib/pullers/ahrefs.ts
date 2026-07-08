// Ahrefs API v3. Requires AHREFS_API_KEY env var.
// Docs: https://docs.ahrefs.com/docs/api/reference

const AHREFS_BASE = 'https://api.ahrefs.com/v3';
const TARGET = 'utahreia.org';

async function ahrefsGet(path: string, params: Record<string, string>) {
  const url = new URL(`${AHREFS_BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.AHREFS_API_KEY}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Ahrefs API error (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export interface AhrefsSummary {
  date: string;
  organicTraffic: number;
  organicKeywords: number;
  referringDomains: number;
  domainRating: number;
}

export async function pullAhrefsMonthlyData(dateFrom: string, dateTo: string): Promise<AhrefsSummary[]> {
  const metricsHistory = await ahrefsGet('/site-explorer/metrics-history', {
    target: TARGET,
    date_from: dateFrom,
    date_to: dateTo,
    mode: 'domain',
  });

  return (metricsHistory.metrics || []).map((entry: any) => ({
    date: entry.date,
    organicTraffic: entry.org_traffic ?? 0,
    organicKeywords: entry.org_keywords ?? 0,
    referringDomains: entry.ref_domains ?? 0,
    domainRating: entry.domain_rating ?? 0,
  }));
}
