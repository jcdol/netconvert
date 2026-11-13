// NetConvert — /api/config
// GET : renvoie la configuration publique du site (lue dans Workers KV).
// PUT : enregistre la configuration (réservé à l'administrateur connecté).
// Liaisons requises dans Cloudflare Pages : KV « NC_KV » et secret « ADMIN_CODE ».

const KEY = 'config';
const BANNER_TYPES = ['info', 'ok', 'warn'];

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

// Ne garde que les champs attendus, avec des longueurs maximales.
function clean(c) {
  const o = {};
  if (!c || typeof c !== 'object' || Array.isArray(c)) return o;
  const str = (k, max) => { if (typeof c[k] === 'string') o[k] = c[k].slice(0, max); };
  str('title', 60); str('subtitle', 80); str('banner', 200); str('lockMsg', 500);
  if (BANNER_TYPES.includes(c.bannerType)) o.bannerType = c.bannerType;
  if (typeof c.locked === 'boolean') o.locked = c.locked;
  if (Array.isArray(c.hidden)) o.hidden = c.hidden.filter(x => typeof x === 'string' && /^[a-z0-9-]{1,40}$/.test(x)).slice(0, 60);
  return o;
}

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

// Jeton de session délivré par /api/login : "<expiration>.<signature HMAC>"
async function isAuthorized(request, env) {
  const m = (request.headers.get('authorization') || '').match(/^Bearer (\d+)\.([a-f0-9]{64})$/);
  if (!m || !env.ADMIN_CODE) return false;
  const exp = Number(m[1]);
  if (exp < Date.now() / 1000) return false;
  return safeEqual(await hmacHex(String(env.ADMIN_CODE), 'nc-admin:' + exp), m[2]);
}

export async function onRequestGet({ env }) {
  if (!env.NC_KV) return json({ error: 'Stockage KV « NC_KV » non configuré.' }, 500);
  const c = await env.NC_KV.get(KEY, 'json');
  return json(clean(c || {}));
}

export async function onRequestPut({ request, env }) {
  if (!env.NC_KV) return json({ error: 'Stockage KV « NC_KV » non configuré.' }, 500);
  if (!(await isAuthorized(request, env))) return json({ error: 'Non autorisé.' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON invalide.' }, 400); }
  const c = clean(body);
  await env.NC_KV.put(KEY, JSON.stringify(c));
  return json(c);
}
