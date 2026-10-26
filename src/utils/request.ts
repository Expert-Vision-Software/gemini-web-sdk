import type { FollowResponse } from 'follow-redirects';

import followRedirects from 'follow-redirects';

export const DEFAULT_MAX_RESPONSE_HEADER_SIZE = 65536;

export function headerLimitConfig(maxHeaderSize: number = DEFAULT_MAX_RESPONSE_HEADER_SIZE, { maxRedirects } = {} as { maxRedirects: number }) {
    return {
        transport: {
            request(options: { protocol?: string }, callback: (res: Response & FollowResponse) => void) {
                const isHttps = /^https:?$/i.test(options.protocol || 'https:');
                const mod = isHttps ? followRedirects.https : followRedirects.http;
                return mod.request({
                    ...options,
                    maxHeaderSize,
                    ...(maxRedirects !== undefined ? { maxRedirects } : {}),
                }, callback as never);
            },
        },
    };
}
