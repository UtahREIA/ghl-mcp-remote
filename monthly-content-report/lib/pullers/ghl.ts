// GHL API v2. Requires GHL_ACCESS_TOKEN env var (must include the social planner
// read scope; reconnect after any scope changes since tokens do not retroactively
// inherit new scopes).

const GHL_BASE = 'https://services.leadconnectorhq.com';
const LOCATION_ID = 'DNirEjy0ejVwbHsaBYrn';

async function ghlGet(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${GHL_BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.GHL_ACCESS_TOKEN}`,
      Version: '2021-07-28',
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`GHL API error (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export interface GHLSocialStatRow {
  platform: string;
  postId: string;
  postedAt: string;
  impressions: number;
  reach: number;
  engagement: number;
}

export async function pullGHLSocialMonthlyData(startDate: string, endDate: string): Promise<GHLSocialStatRow[]> {
  const posts = await ghlGet('/social-media-posting/posts', {
    locationId: LOCATION_ID,
    startDate,
    endDate,
  });

  return (posts.posts || []).map((post: any) => ({
    platform: post.platform ?? 'unknown',
    postId: post.id,
    postedAt: post.createdAt,
    impressions: post.stats?.impressions ?? 0,
    reach: post.stats?.reach ?? 0,
    engagement: post.stats?.engagement ?? 0,
  }));
}
