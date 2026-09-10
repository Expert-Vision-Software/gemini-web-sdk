'use strict';

const assert = require('assert');
const http = require('http');
const net = require('net');
const path = require('path');

const { Gemini } = require(path.join(__dirname, '..', 'index'));
const { AuthError } = require(path.join(__dirname, '..', 'src', 'errors'));
const { RPCData } = require(path.join(__dirname, '..', 'src', 'types', 'model'));

const TARGET_HEADER_BYTES = 20 * 1024;
const BODY_INIT_OK = '<!doctype html><html><body><script>window.WIZ_global_data = '
    + JSON.stringify({
        SNlM0e: 'fixture-snlm0e-token',
        cfb2h: 'boq_assistant-bard-web-server_fixture',
        FdrFJe: '-1',
        TuX5cc: 'en-US',
        qKIAYe: 'feeds/fixture',
    })
    + ';</script></body></html>';

function buildSetCookieFlood(targetBytes) {
    const lines = [];
    let total = 0;
    let i = 0;
    while (total < targetBytes) {
        const line = `Set-Cookie: __Host-fixture${i}=${'x'.repeat(80)}; Path=/; Secure; HttpOnly\r\n`;
        lines.push(line);
        total += line.length;
        i += 1;
    }
    return lines.join('');
}

function startFixtureServer({ headerBytes = TARGET_HEADER_BYTES, getBody = '', postBody = null } = {}) {
    return new Promise((resolve) => {
        const flood = buildSetCookieFlood(headerBytes);
        const buildResponse = (body) => {
            const responseBody = Buffer.from(body, 'utf8');
            return Buffer.concat([
                Buffer.from(
                    'HTTP/1.1 200 OK\r\n' +
                    flood +
                    'Content-Type: text/html; charset=utf-8\r\n' +
                    `Content-Length: ${responseBody.length}\r\n` +
                    'Connection: close\r\n' +
                    '\r\n'
                ),
                responseBody,
            ]);
        };
        const server = net.createServer((socket) => {
            let responded = false;
            socket.on('data', (chunk) => {
                if (responded) return;
                responded = true;
                const isPost = /^POST/i.test(chunk.toString('utf8', 0, 16));
                socket.end(buildResponse(isPost && postBody !== null ? postBody : getBody));
            });
        });
        server.listen(0, '127.0.0.1', () => {
            resolve({ server, port: server.address().port, headerBlockBytes: flood.length });
        });
    });
}

function fixtureOrigin(port) {
    return `http://127.0.0.1:${port}`;
}

async function testFixtureExceedsLlhttpDefault() {
    const { server, port, headerBlockBytes } = await startFixtureServer({ getBody: BODY_INIT_OK });
    const setCookieCount = await new Promise((resolve, reject) => {
        const req = http.request(
            `${fixtureOrigin(port)}/init`,
            { maxHeaderSize: 65536 },
            (res) => {
                res.resume();
                res.on('end', () => {
                    server.close();
                    resolve(res.headers['set-cookie'].length);
                });
            }
        );
        req.on('error', (e) => {
            server.close();
            reject(e);
        });
        req.end();
    });
    assert.ok(headerBlockBytes >= TARGET_HEADER_BYTES, `Fixture header block should exceed ${TARGET_HEADER_BYTES} bytes, got ${headerBlockBytes}`);
    console.log(`  PASS fixture serves ${headerBlockBytes}B header block / ${setCookieCount} Set-Cookie headers (beyond llhttp 16KB default)`);
}

async function testInitToleratesLargeResponseHeaders() {
    const { server, port } = await startFixtureServer({ getBody: BODY_INIT_OK });
    try {
        const base = fixtureOrigin(port);
        const client = new Gemini({
            secure_1psid: 'fixture-1psid-value',
            endpoints: {
                GOOGLE: base,
                INIT: `${base}/init`,
                BATCH_EXEC: `${base}/batchexecute`,
            },
        });

        await client.init();

        assert.strictEqual(client.accessToken, 'fixture-snlm0e-token', 'init should parse SNlM0e from the large-header response');
        assert.strictEqual(client.buildLabel, 'boq_assistant-bard-web-server_fixture', 'init should parse cfb2h');
        assert.strictEqual(client.language, 'en-US', 'init should parse language');
    } finally {
        server.close();
    }
    console.log('  PASS init() succeeds against 20KB response header block');
}

async function testBatchExecuteToleratesLargeResponseHeaders() {
    const { server, port } = await startFixtureServer({ getBody: BODY_INIT_OK, postBody: ")]}'\n\n[[\"wrb.fr\",null,null,null,null,\"generic\"]]" });
    try {
        const base = fixtureOrigin(port);
        const client = new Gemini({
            secure_1psid: 'fixture-1psid-value',
            endpoints: {
                GOOGLE: base,
                INIT: `${base}/init`,
                BATCH_EXEC: `${base}/batchexecute`,
            },
        });
        await client.init();

        const res = await client._batchExecute([new RPCData({ rpcid: 'MaZiqc', payload: '[]' })]);

        assert.strictEqual(res.status, 200, 'batchexecute POST should resolve 200 against the 20KB-header fixture');
        assert.ok(Array.isArray(res.headers['set-cookie']) && res.headers['set-cookie'].length >= 150,
            'response headers should be parsed, not aborted');
    } finally {
        server.close();
    }
    console.log('  PASS _batchExecute POST succeeds against 20KB response header block');
}

async function testExplicitDefaultCapStillRejectsOversizedHeaders() {
    const { server, port } = await startFixtureServer({ getBody: BODY_INIT_OK });
    try {
        const base = fixtureOrigin(port);
        const client = new Gemini({
            secure_1psid: 'fixture-1psid-value',
            maxResponseHeaderSize: 16384,
            endpoints: {
                GOOGLE: base,
                INIT: `${base}/init`,
            },
        });

        await assert.rejects(
            () => client.init(),
            (e) => {
                let cur = e;
                while (cur) {
                    if (cur.code === 'HPE_HEADER_OVERFLOW' || /header overflow/i.test(cur.message || '')) return true;
                    cur = cur.cause;
                }
                return false;
            },
            'explicit 16384 cap should reject the 20KB fixture with an HPE_HEADER_OVERFLOW-classified error'
        );
    } finally {
        server.close();
    }
    console.log('  PASS explicit maxResponseHeaderSize: 16384 rejects 20KB fixture with HPE_HEADER_OVERFLOW');
}

async function testAuthClassificationUnchanged() {
    const { server, port } = await startFixtureServer({
        headerBytes: 1024,
        body: '<!doctype html><html><body><script>window.WIZ_global_data = {"SNlM0e":"x"};</script></body></html>',
    });
    try {
        const base = fixtureOrigin(port);
        const client = new Gemini({
            secure_1psid: 'fixture-1psid-value',
            endpoints: {
                GOOGLE: base,
                INIT: `${base}/init`,
            },
        });

        await assert.rejects(
            () => client.init(),
            (e) => e instanceof AuthError && e.message === 'Cookies invalid.',
            'response without build tokens should still classify as AuthError(Cookies invalid.)'
        );
    } finally {
        server.close();
    }
    console.log('  PASS AuthError("Cookies invalid.") classification unchanged');
}

async function main() {
    console.log('Running max-response-headers tests...\n');

    await testFixtureExceedsLlhttpDefault();
    await testInitToleratesLargeResponseHeaders();
    await testBatchExecuteToleratesLargeResponseHeaders();
    await testExplicitDefaultCapStillRejectsOversizedHeaders();
    await testAuthClassificationUnchanged();

    console.log('\nAll tests passed!');
}

main().catch((e) => {
    console.error('TEST FAILED:', e);
    process.exit(1);
});
