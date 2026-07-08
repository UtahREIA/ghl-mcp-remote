// OpusClip API. Requires OPUSCLIP_API_KEY and OPUSCLIP_ORG_ID env vars.

const OPUSCLIP_BASE = 'https://api.opus.pro/api';

async function opusGet(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${OPUSCLIP_BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.OPUSCLIP_API_KEY}`,
      'x-org-id': process.env.OPUSCLIP_ORG_ID as string,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`OpusClip API error (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export interface OpusClipRow {
  clipId: string;
  title: string;
  projectId: string;
  score: number;
  durationSeconds: number;
  createdAt: string;
}

export async function pullOpusClipMonthlyData(sinceISODate: string): Promise<OpusClipRow[]> {
  const projects = await opusGet('/v1/projects', { since: sinceISODate });

  const allClips: OpusClipRow[] = [];
  for (const project of projects.data || []) {
    const clips = await opusGet(`/v1/projects/${project.id}/clips`);
    for (const clip of clips.data || []) {
      allClips.push({
        clipId: clip.id,
        title: clip.title,
        projectId: project.id,
        score: clip.score ?? 0,
        durationSeconds: clip.duration ?? 0,
        createdAt: clip.createdAt,
      });
    }
  }

  return allClips.sort((a, b) => b.score - a.score);
}
