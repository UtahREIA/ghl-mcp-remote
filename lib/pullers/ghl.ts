// GHL API v2. Mirrors the exact working pattern already proven in api/mcp.js
// (ghl_get_social_posts), rather than guessing at endpoint shape independently.
// GHL's POST /posts/list requires skip/limit as STRINGS, and has no native
// date-range filter, so date filtering happens client-side after the fetch.

const GHL_BASE = 'https://services.leadconnectorhq.com';
const TOKEN = process.env.GHL_API_KEY;
const LOCATION = process.env.GHL_LOCATION_ID;

const GHL_HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
  Version: '2021-07-28',
};

async function ghl(path: string) {
  const res = await fetch(`${GHL_BASE}${path}`, { headers: GHL_HEADERS });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `GHL ${res.status}: ${path}`);
  return data;
}

async function ghlPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${GHL_BASE}${path}`, {
    method: 'POST',
    headers: GHL_HEADERS,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `GHL ${res.status}: ${path}`);
  return data;
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
  // GHL's posts/list has no date filter param, so pull a generous page and
  // filter client-side. 200 covers a typical month of posts with headroom;
  // bump this if a given month has more posts than that.
  const data = await ghlPost(`/social-media-posting/${LOCATION}/posts/list`, {
    type: 'post',
    limit: '200',
    skip: '0',
    includeUsers: 'true',
  });

  const posts =
    data.posts || data.data || data.results?.posts || (Array.isArray(data.results) ? data.results : []) || [];

  let accountPlatformMap: Record<string, string> = {};
  try {
    const accData = await ghl(`/social-media-posting/${LOCATION}/accounts`);
    const accounts = accData.results?.accounts || accData.accounts || [];
    for (const a of accounts) {
      if (a.id) accountPlatformMap[a.id] = a.platform || a.type || '';
    }
  } catch {
    // non-fatal, falls back to whatever platform field the post itself has
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return posts
    .map((p: any) => {
      const accountIds: string[] = p.accountIds || p.accounts || [];
      const derivedPlatforms = [...new Set(accountIds.map((id) => accountPlatformMap[id]).filter(Boolean))];
      const postedAt =
        p.createdAt ||
        p.dateAdded ||
        p.scheduledAt ||
        p.scheduledTime ||
        p.publishAt ||
        p.publishTime ||
        p.postDate ||
        '';

      return {
        platform: derivedPlatforms.join(', ') || p.platform || p.platformType || p.channelType || 'unknown',
        postId: p.id || p._id || '',
        postedAt,
        impressions: p.stats?.impressions ?? p.impressions ?? 0,
        reach: p.stats?.reach ?? p.reach ?? 0,
        engagement: p.stats?.engagement ?? p.engagement ?? 0,
      };
    })
    .filter((row) => {
      if (!row.postedAt) return false;
      const d = new Date(row.postedAt);
      return d >= start && d <= end;
    });
}
