// NetConvert — /api/login
// POST { code } : vérifie le code administrateur (secret ADMIN_CODE) et renvoie un jeton valable 8 h.
// Après 5 échecs, l'adresse IP est bloquée 15 minutes.

const SESSION_HOURS = 8;
const MAX_FAILS = 5;
const BLOCK_SECONDS = 900;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

async function hmacHex(key, msg) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_CODE) return json({ error: 'Code administrateur non configuré sur le serveur.' }, 500);

  const ip = request.headers.get('cf-connecting-ip') || 'inconnue';
  const failKey = 'fail:' + ip;
  let fails = 0;
  if (env.NC_KV) {
    fails = Number(await env.NC_KV.get(failKey)) || 0;
    if (fails >= MAX_FAILS) return json({ error: 'Trop de tentatives. Réessaie dans 15 minutes.' }, 429);
  }

  let code = '';
  try { code = String((await request.json()).code || ''); } catch { /* corps invalide */ }

  await new Promise(r => setTimeout(r, 400)); // ralentit les essais en série

  if (!safeEqual(code, String(env.ADMIN_CODE))) {
    if (env.NC_KV) await env.NC_KV.put(failKey, String(fails + 1), { expirationTtl: BLOCK_SECONDS });
    const left = MAX_FAILS - fails - 1;
    return json({ error: left > 0 ? `Code incorrect (${left} essai${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''}).` : 'Trop de tentatives. Réessaie dans 15 minutes.' }, 401);
  }

  if (env.NC_KV && fails) await env.NC_KV.delete(failKey);
  const exp = Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600;
  return json({ token: exp + '.' + await hmacHex(String(env.ADMIN_CODE), 'nc-admin:' + exp), exp });
}
