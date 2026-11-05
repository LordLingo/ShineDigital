(function (root) {
  'use strict';
  const STATUSES = ['New', 'Ready', 'Shared', 'Interested', 'Paid', 'Live', 'Not interested'];
  const STYLES = ['modern', 'classic', 'bold'];
  const TRADES = ['Electrician', 'Plumber', 'Auto service', 'Other'];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = (v, max = 500) => typeof v === 'string' ? v.trim().slice(0, max) : '';
  const digits = v => String(v || '').replace(/\D/g, '');
  function uuid() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const h = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
  }
  const phone = v => { const n = digits(v); return n.length >= 8 && n.length <= 15 ? '+' + n : ''; };
  const safeUrl = v => { try { const u = new URL(v); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
  function validateLead(input) {
    const name = text(input.name, 120);
    if (name.length < 2) throw new Error('Enter a business name with at least two characters.');
    const businessPhone = phone(input.phone);
    if (input.phone && !businessPhone) throw new Error('Enter a phone number with its country code, for example +40.');
    const services = (Array.isArray(input.services) ? input.services : String(input.services || '').split('\n')).map(v => text(v, 120)).filter(Boolean).slice(0, 8);
    const consent = input.consent === true;
    const consentNote = text(input.consent_note, 500);
    if (consent && !consentNote) throw new Error('Record when and how the owner agreed to receive a preview.');
    const followUp = /^\d{4}-\d{2}-\d{2}$/.test(input.follow_up || '') ? input.follow_up : null;
    const quoted = Number(input.quote_ron || 0);
    if (!Number.isFinite(quoted) || quoted < 0 || quoted > 1000000) throw new Error('Enter a valid quote amount.');
    return { name, phone: businessPhone, trade: TRADES.includes(input.trade) ? input.trade : 'Other', city: text(input.city, 120) || 'București', services,
      maps_url: safeUrl(input.maps_url), status: STATUSES.includes(input.status) ? input.status : 'New',
      notes: text(input.notes, 5000), consent, consent_note: consentNote, verified: input.verified === true,
      follow_up: followUp, quote_ron: quoted, style: STYLES.includes(input.style) ? input.style : 'modern',
      headline: text(input.headline, 160), intro: text(input.intro, 600), about: text(input.about, 1500),
      live_url: safeUrl(input.live_url) };
  }
  function buildContent(lead) {
    const labels = { Electrician: 'Servicii electrice', Plumber: 'Servicii de instalații', 'Auto service': 'Service auto', Other: 'Servicii locale' };
    const serviceLabel = labels[lead.trade] || labels.Other;
    return { name: lead.name, phone: lead.phone, trade: lead.trade, city: lead.city,
      headline: lead.headline || serviceLabel + ' în ' + lead.city + '.',
      intro: lead.intro || 'Spuneți-ne de ce aveți nevoie. Contactați ' + lead.name + ' pentru detalii despre servicii și disponibilitate.',
      about: lead.about || lead.name + ' oferă ' + serviceLabel.toLowerCase() + ' în ' + lead.city + '. Pentru informații despre lucrarea dumneavoastră, ne puteți contacta direct.',
      services: lead.services.slice(), style: lead.style };
  }
  function publicPreview(lead) {
    if (!lead.preview_enabled || !lead.preview_content) return null;
    return { token: lead.preview_token, content: lead.preview_content, quote_ron: lead.quote_ron || 0 };
  }
  const api = { STATUSES, STYLES, TRADES, esc, text, digits, phone, safeUrl, uuid, validateLead, buildContent, publicPreview };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.Shine = api;
})(typeof window !== 'undefined' ? window : null);
