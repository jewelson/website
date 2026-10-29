// One-time helper: gets the Spotify refresh token that functions/api/now-playing.js needs.
// Run it on your own computer (Node 18 or newer):
//   SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... node scripts/spotify-token.mjs
// Your Spotify app must list http://127.0.0.1:8888/callback as a redirect URI.
import http from 'node:http';
import { randomUUID } from 'node:crypto';

const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) {
  console.error('Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET first.');
  process.exit(1);
}
const REDIRECT = 'http://127.0.0.1:8888/callback';
const SCOPES = 'user-read-currently-playing user-read-recently-played';
const state = randomUUID();
const authorize = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({ response_type: 'code', client_id: id, scope: SCOPES, redirect_uri: REDIRECT, state });

http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  if (url.pathname !== '/callback') { res.writeHead(404).end(); return; }
  if (url.searchParams.get('state') !== state) { res.writeHead(400).end('State mismatch; run the script again.'); return; }
  const code = url.searchParams.get('code');
  if (!code) { res.writeHead(400).end('Spotify did not return a code: ' + (url.searchParams.get('error') || 'unknown error')); return; }

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT })
  });
  const data = await tokenRes.json();
  if (!data.refresh_token) {
    res.writeHead(500).end('Spotify said: ' + JSON.stringify(data));
    console.error(data);
    process.exit(1);
  }
  console.log('\nSPOTIFY_REFRESH_TOKEN=' + data.refresh_token + '\n');
  console.log('Add it, with your client ID and secret, to the hosting settings. Do not commit it.');
  res.end('Done. Your refresh token is in the terminal; you can close this tab.', () => process.exit(0));
}).listen(8888, '127.0.0.1', () => {
  console.log('Open this link, log in to Spotify and approve access:\n\n' + authorize + '\n');
});
