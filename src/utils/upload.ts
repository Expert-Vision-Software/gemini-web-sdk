import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import mime from 'mime-types';
import FormData from 'form-data';
import { Endpoint, type EndpointOverrides, Headers } from '../constants.js';
import { parseProxy } from './auth.js';
import { DEFAULT_MAX_RESPONSE_HEADER_SIZE, headerLimitConfig } from './request.js';

function generateRandomName(ext = '.txt') {
    return `input_${Math.floor(Math.random() * 9000000) + 1000000}${ext}`;
}

export function parseFileName(file: string) {
    if (typeof file === 'string') {
        const fp = path.resolve(file);
        if (!fs.existsSync(fp)) throw new Error(`${fp} is not a valid file.`);
        return path.basename(fp);
    }
    if (Buffer.isBuffer(file)) return generateRandomName();
    return generateRandomName();
}

export async function uploadFile(file: string, proxy: string | null = null, pushId: string = '', cookies: Record<string, string> = {}, opts: { maxHeaderSize?: number, endpoints?: EndpointOverrides } = {}) {
    const { maxHeaderSize = DEFAULT_MAX_RESPONSE_HEADER_SIZE, endpoints = {} } = opts;
    let content, fname;

    if (typeof file === 'string') {
        const fp = path.resolve(file);
        if (!fs.existsSync(fp)) throw new Error(`${fp} is not a valid file.`);
        fname = path.basename(fp);
        content = fs.readFileSync(fp);
    } else if (Buffer.isBuffer(file)) {
        content = file;
        fname = generateRandomName();
    } else {
        throw new Error(`Unsupported file type: ${typeof file}`);
    }

    const contentType = mime.lookup(fname) || 'application/octet-stream';

    const form = new FormData();
    form.append('file', content, { filename: fname, contentType });

    const cookieStr = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');

    const res = await axios.post(endpoints.UPLOAD || Endpoint.UPLOAD, form, {
        headers: {
            ...Headers.REFERER,
            ...Headers.UPLOAD,
            ...form.getHeaders(),
            'Push-ID': pushId,
            ...(cookieStr ? { 'Cookie': cookieStr } : {}),
        },
        ...headerLimitConfig(maxHeaderSize, { maxRedirects: 5 }),
        ...(proxy ? { proxy: parseProxy(proxy) } : {}),
    });

    return res.data;
}
