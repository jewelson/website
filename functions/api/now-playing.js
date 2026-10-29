// GET /api/now-playing: the track you're playing on Spotify right now, or the last one you played.
// Runs as a Cloudflare Pages Function. Set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET and
// SPOTIFY_REFRESH_TOKEN in the Pages project's settings (get the refresh token with scripts/spotify-token.mjs).
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API = 'https://api.spotify.com/v1/me/player';

export async function onRequestGet({ env }) {
  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret, SPOTIFY_REFRESH_TOKEN: refresh } = env;
  if (!id || !secret || !refresh) return json({ error: 'Spotify is not configured' }, 503);

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(id + ':' + secret), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh })
  });
  if (!tokenRes.ok) return json({ error: 'Could not refresh the Spotify token' }, 502);
  const { access_token } = await tokenRes.json();
  const headers = { Authorization: 'Bearer ' + access_token };

  const now = await fetch(API + '/currently-playing', { headers });
  if (now.status === 200) {
    const d = await now.json();
    if (d && d.item && d.currently_playing_type === 'track') return json(pick(d.item, d.is_playing));
  }
  const recent = await fetch(API + '/recently-played?limit=1', { headers });
  if (recent.ok) {
    const d = await recent.json();
    const t = d.items && d.items[0] && d.items[0].track;
    if (t) return json(pick(t, false));
  }
  return json({});
}

function pick(t, playing) {
  return { title: t.name, artist: t.artists.map(a => a.name).join(', '), url: t.external_urls && t.external_urls.spotify, playing: !!playing };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=30' } });
}
