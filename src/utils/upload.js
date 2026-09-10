'use strict';

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const FormData = require('form-data');
const { Endpoint, Headers } = require('../constants');
const { parseProxy } = require('./auth');
const { DEFAULT_MAX_RESPONSE_HEADER_SIZE, headerLimitConfig } = require('./request');

function generateRandomName(ext = '.txt') {
    return `input_${Math.floor(Math.random() * 9000000) + 1000000}${ext}`;
}

function parseFileName(file) {
    if (typeof file === 'string') {
        const fp = path.resolve(file);
        if (!fs.existsSync(fp)) throw new Error(`${fp} is not a valid file.`);
        return path.basename(fp);
    }
    if (Buffer.isBuffer(file)) return generateRandomName();
    return generateRandomName();
}

async function uploadFile(file, proxy = null, pushId = '', cookies = {}, { maxHeaderSize = DEFAULT_MAX_RESPONSE_HEADER_SIZE, endpoints = {} } = {}) {
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

module.exports = { uploadFile, parseFileName };
