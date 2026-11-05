'use strict';
const crypto = require('node:crypto');
const { validateLead, buildContent, text, digits, STYLES } = require('../studio-source/shared.js');
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const config = () => ({ url: (process.env.SUPABASE_URL || '').replace(/\/$/, ''), key: process.env.SUPABASE_PUBLISHABLE_KEY || '' });
const configured = () => !!(config().url && config().key);
const cookies = req => Object.fromEntries(String(req.headers.cookie || '').split(';').map(s => s.trim().split('=')).filter(a => a.length === 2));
function sessionCookies(res, session) {
  const secure = process.env.STUDIO_LOCAL === '1' ? '' : '; Secure';
  const attrs = '; HttpOnly; SameSite=Lax; Path=/' + secure;
  res.setHeader('Set-Cookie', [
    `shine_access=${session?.access_token || ''}; Max-Age=${session ? Math.max(60, Number(session.expires_in) || 3600) : 0}${attrs}`,
    `shine_refresh=${session?.refresh_token || ''}; Max-Age=${session ? 604800 : 0}${attrs}`
  ]);
}
async function sb(path, { method = 'GET', body, token, prefer } = {}) {
  const { url, key } = config();
  if (!url || !key) throw new HttpError(503, 'The studio database is not connected yet. You can explore the demo workspace.');
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (prefer) headers.Prefer = prefer;
  const response = await fetch(url + path, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new HttpError(401, 'Please sign in again.');
    if (response.status === 400 && path.startsWith('/auth/')) throw new HttpError(400, 'Sign-in failed. Check your email and password.');
    throw new HttpError(502, 'The database request failed. Please try again or check the studio setup.');
  }
  return data;
}
async function identity(req, res) {
  const c = cookies(req);
  let token = c.shine_access;
  let user;
  try { if (token) user = await sb('/auth/v1/user', { token }); } catch (e) { if (e.status !== 401) throw e; }
  if (!user && c.shine_refresh) {
    try {
      const session = await sb('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: c.shine_refresh } });
      token = session.access_token;
      user = await sb('/auth/v1/user', { token });
      sessionCookies(res, session);
    } catch (e) { sessionCookies(res, null); if (e.status === 502 || e.status === 503) throw e; }
  }
  if (!user?.id) throw new HttpError(401, 'Sign in to your studio.');
  const members = await sb('/rest/v1/studio_members?select=role&user_id=eq.' + encodeURIComponent(user.id), { token });
  if (!members?.length) throw new HttpError(403, 'Your account has not been added to this studio. Ask the owner to give you access.');
  return { id: user.id, email: user.email, role: members[0].role, token };
}
function originCheck(req) {
  const origin = req.headers.origin;
  if (!origin) throw new HttpError(403, 'This action must be made from the studio.');
  const host = req.headers.host;
  let parsed; try { parsed = new URL(origin); } catch { throw new HttpError(403, 'Invalid request origin.'); }
  if (parsed.host !== host) throw new HttpError(403, 'Invalid request origin.');
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw new HttpError(415, 'Send JSON data.');
}
function bodyOf(req) {
  const raw = req.body;
  if (typeof raw === 'string' && Buffer.byteLength(raw) > 30000) throw new HttpError(413, 'This request is too large.');
  const body = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Invalid form data.');
  if (Buffer.byteLength(JSON.stringify(body)) > 30000) throw new HttpError(413, 'This request is too large.');
  return body;
}
function send(res, status, data) { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)); }
function privateHeaders(res) { res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Robots-Tag', 'noindex, nofollow'); res.setHeader('X-Content-Type-Options', 'nosniff'); }
const uuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
async function getLead(id, token) {
  if (!uuid(id)) throw new HttpError(400, 'Invalid business.');
  const rows = await sb('/rest/v1/studio_leads?id=eq.' + id + '&limit=1', { token });
  if (!rows?.length) throw new HttpError(404, 'Business not found.');
  return rows[0];
}
async function handler(req, res) {
  privateHeaders(res);
  try {
    const url = new URL(req.url, 'https://' + req.headers.host);
    const action = url.searchParams.get('action') || 'session';
    if (!['GET','POST'].includes(req.method)) throw new HttpError(405, 'Method not allowed.');
    if (req.method === 'POST') originCheck(req);
    if (action === 'health' && req.method === 'GET') return send(res, 200, { configured: configured() });
    if (action === 'login' && req.method === 'POST') {
      const body = bodyOf(req);
      const session = await sb('/auth/v1/token?grant_type=password', { method:'POST', body:{ email:text(body.email,254), password:String(body.password || '').slice(0,256) } });
      const verifiedUser = await sb('/auth/v1/user', { token: session.access_token });
      const members = await sb('/rest/v1/studio_members?select=role&user_id=eq.'+encodeURIComponent(verifiedUser.id), { token:session.access_token });
      if (!members?.length) throw new HttpError(403, 'Your account has not been added to this studio.');
      sessionCookies(res, session);
      return send(res,200,{ user:{ email:verifiedUser.email, role:members[0].role } });
    }
    if (action === 'logout' && req.method === 'POST') {
      const token = cookies(req).shine_access;
      if (token) await sb('/auth/v1/logout?scope=local', { method:'POST', token }).catch(() => {});
      sessionCookies(res,null); return send(res,200,{ok:true});
    }
    const user = await identity(req,res);
    if (action === 'session' && req.method === 'GET') return send(res,200,{user:{email:user.email,role:user.role}});
    if (action === 'leads' && req.method === 'GET') return send(res,200,{ leads:await sb('/rest/v1/studio_leads?order=updated_at.desc&limit=1000',{token:user.token}) });
    if (action === 'events' && req.method === 'GET') return send(res,200,{ events:await sb('/rest/v1/studio_events?select=lead_id,event_type,style,created_at&order=created_at.desc&limit=100',{token:user.token}) });
    if (action === 'settings' && req.method === 'GET') { const rows=await sb('/rest/v1/studio_settings?id=eq.1',{token:user.token}); return send(res,200,{ settings:rows[0] || {} }); }
    if (req.method !== 'POST') throw new HttpError(404,'Unknown action.');
    const body=bodyOf(req);
    if (action === 'save') {
      let lead; try { lead=validateLead(body); } catch(e) { throw new HttpError(400,e.message); }
      lead.updated_at = new Date().toISOString();
      if (body.id) {
        await getLead(body.id,user.token);
        const rows=await sb('/rest/v1/studio_leads?id=eq.'+body.id,{method:'PATCH',body:lead,token:user.token,prefer:'return=representation'});
        return send(res,200,{lead:rows[0]});
      }
      lead.created_by=user.id;
      const rows=await sb('/rest/v1/studio_leads',{method:'POST',body:lead,token:user.token,prefer:'return=representation'});
      return send(res,201,{lead:rows[0]});
    }
    if (action === 'prepare') {
      const lead=await getLead(body.id,user.token);
      if (!lead.verified || !lead.phone || !lead.services.length) throw new HttpError(400,'Confirm the business details, phone number, and at least one service before creating a preview.');
      const changes={preview_token:lead.preview_token || crypto.randomBytes(24).toString('hex'),preview_content:buildContent(lead),preview_enabled:true,preview_updated_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      if (lead.status==='New') changes.status='Ready';
      const rows=await sb('/rest/v1/studio_leads?id=eq.'+lead.id,{method:'PATCH',body:changes,token:user.token,prefer:'return=representation'});
      return send(res,200,{lead:rows[0]});
    }
    if (action === 'disable') {
      const lead=await getLead(body.id,user.token);
      const rows=await sb('/rest/v1/studio_leads?id=eq.'+lead.id,{method:'PATCH',body:{preview_enabled:false,updated_at:new Date().toISOString()},token:user.token,prefer:'return=representation'});
      return send(res,200,{lead:rows[0]});
    }
    if (action === 'settings') {
      if(user.role!=='owner') throw new HttpError(403,'Only the owner can change studio settings.');
      const number=digits(body.whatsapp);
      if(number && (number.length<8 || number.length>15)) throw new HttpError(400,'Enter a WhatsApp number with its country code.');
      const settings={id:1,business_name:text(body.business_name,100)||'Shine Digital',whatsapp:number,email:text(body.email,254),package_note:text(body.package_note,1000),updated_at:new Date().toISOString()};
      await sb('/rest/v1/studio_settings',{method:'POST',body:settings,token:user.token,prefer:'resolution=merge-duplicates'});
      return send(res,200,{settings});
    }
    throw new HttpError(404,'Unknown action.');
  } catch(e) { send(res,e.status || 500,{ error:e.status ? e.message : 'Something went wrong. Please try again.' }); }
}
async function preview(req,res) {
  privateHeaders(res);
  try {
    const url=new URL(req.url,'https://'+req.headers.host);
    const token=url.searchParams.get('token') || '';
    if(!/^[a-f0-9]{48}$/.test(token)) throw new HttpError(404,'Preview not found.');
    if(req.method==='GET') {
      const result=await sb('/rest/v1/rpc/studio_get_preview',{method:'POST',body:{p_token:token}});
      if(!result) throw new HttpError(404,'This preview is unavailable or has been turned off.');
      return send(res,200,result);
    }
    if(req.method==='POST') {
      originCheck(req); const b=bodyOf(req);
      if(!uuid(b.session) || !['style','interest'].includes(b.event) || !STYLES.includes(b.style)) throw new HttpError(400,'Invalid activity.');
      await sb('/rest/v1/rpc/studio_record_event',{method:'POST',body:{p_token:token,p_session:b.session,p_event:b.event,p_style:b.style}});
      return send(res,200,{ok:true});
    }
    throw new HttpError(405,'Method not allowed.');
  } catch(e) { send(res,e.status || 500,{error:e.status ? e.message : 'Preview could not be loaded.'}); }
}
module.exports={handler,preview,originCheck,bodyOf,sessionCookies};
