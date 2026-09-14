'use strict';

const followRedirects = require('follow-redirects');

const DEFAULT_MAX_RESPONSE_HEADER_SIZE = 65536;

function headerLimitConfig(maxHeaderSize = DEFAULT_MAX_RESPONSE_HEADER_SIZE, { maxRedirects } = {}) {
    return {
        transport: {
            request(options, callback) {
                const isHttps = /^https:?$/i.test(options.protocol || 'https:');
                const mod = isHttps ? followRedirects.https : followRedirects.http;
                return mod.request({
                    ...options,
                    maxHeaderSize,
                    ...(maxRedirects !== undefined ? { maxRedirects } : {}),
                }, callback);
            },
        },
    };
}

module.exports = { DEFAULT_MAX_RESPONSE_HEADER_SIZE, headerLimitConfig };
