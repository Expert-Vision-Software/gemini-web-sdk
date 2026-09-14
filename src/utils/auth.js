'use strict';

const axios = require('axios');
const { Endpoint, Headers } = require('../constants');
const { AuthError } = require('../errors');
const { DEFAULT_MAX_RESPONSE_HEADER_SIZE, headerLimitConfig } = require('./request');

function cookieStr(c) {
    return Object.entries(c).map(([k, v]) => `${k}=${v}`).join('; ');
}

function parseCookies(headers, base = {}) {
    const out = { ...base };
    const raw = headers['set-cookie'] || headers['Set-Cookie'];
    const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const s of arr) {
        const p = s.split(';')[0].trim();
        const eq = p.indexOf('=');
        if (eq !== -1) out[p.slice(0, eq).trim()] = p.slice(eq + 1).trim();
    }
    return out;
}

function parseProxy(str) {
    if (!str) return undefined;
    try {
        const u = new URL(str);
        return { protocol: u.protocol.replace(':', ''), host: u.hostname, port: parseInt(u.port) };
    } catch {
        return undefined;
    }
}

async function sendInitRequest(cookies, proxy = null, { maxHeaderSize = DEFAULT_MAX_RESPONSE_HEADER_SIZE, endpoints = {} } = {}) {
    const res = await axios.get(endpoints.INIT || Endpoint.INIT, {
        headers: { ...Headers.GEMINI, 'Cookie': cookieStr(cookies) },
        ...headerLimitConfig(maxHeaderSize, { maxRedirects: 5 }),
        ...(proxy ? { proxy: parseProxy(proxy) } : {}),
    });
    const t = res.data;
    const snlm0e = (t.match(/"SNlM0e":\s*"(.*?)"/) || [])[1] || null;
    const cfb2h = (t.match(/"cfb2h":\s*"(.*?)"/) || [])[1] || null;
    const fdrfje = (t.match(/"FdrFJe":\s*"(.*?)"/) || [])[1] || null;
    const language = (t.match(/"TuX5cc":\s*"(.*?)"/) || [])[1] || null;
    const pushId = (t.match(/"qKIAYe":\s*"(.*?)"/) || [])[1] || null;
    if (!cfb2h && !fdrfje && !language) throw new AuthError('Cookies invalid.');
    return [snlm0e, cfb2h, fdrfje, language, pushId, parseCookies(res.headers, cookies)];
}

async function getAccessToken(baseCookies, proxy = null, verbose = false, { maxHeaderSize = DEFAULT_MAX_RESPONSE_HEADER_SIZE, endpoints = {} } = {}) {
    let extraCookies = {};
    try {
        const r = await axios.get(endpoints.GOOGLE || Endpoint.GOOGLE, {
            ...headerLimitConfig(maxHeaderSize, { maxRedirects: 5 }),
            ...(proxy ? { proxy: parseProxy(proxy) } : {}),
        });
        if (r.status === 200) extraCookies = parseCookies(r.headers);
    } catch {}

    const cookies = { ...extraCookies, ...baseCookies };

    if (!cookies['__Secure-1PSID']) {
        throw new AuthError('__Secure-1PSID cookie required for authentication.');
    }

    const result = await sendInitRequest(cookies, proxy, { maxHeaderSize, endpoints });
    const [snlm0e, cfb2h, fdrfje, language, pushId, validCookies] = result;
    return [snlm0e, cfb2h, fdrfje, language, pushId, validCookies];
}

module.exports = { getAccessToken, cookieStr, parseCookies, parseProxy };
