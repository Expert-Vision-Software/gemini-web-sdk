'use strict';

const followRedirects = require('follow-redirects');

const DEFAULT_MAX_RESPONSE_HEADER_SIZE = 65536;

function headerLimitTransport(maxHeaderSize) {
    return {
        request(options, callback) {
            const isHttps = /^https:?$/i.test(options.protocol || 'https:');
            const mod = isHttps ? followRedirects.https : followRedirects.http;
            return mod.request({ ...options, maxHeaderSize }, callback);
        },
    };
}

function headerLimitConfig(maxHeaderSize = DEFAULT_MAX_RESPONSE_HEADER_SIZE, { maxRedirects } = {}) {
    return {
        ...(maxRedirects !== undefined ? { maxRedirects } : {}),
        transport: headerLimitTransport(maxHeaderSize),
    };
}

module.exports = { DEFAULT_MAX_RESPONSE_HEADER_SIZE, headerLimitConfig };
