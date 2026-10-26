const FLICKER_ESC_RE = /\\+[`*_~].*$/;
const LENGTH_MARKER_RE = /^(\d+)\n/;

export function getCleanText(s: string) {
    if (!s) return '';
    if (s.endsWith('\n```')) s = s.slice(0, -4);
    return s.replace(FLICKER_ESC_RE, '');
}

function longestCommonSubsequenceBlocks(a: string, b: string) {
    const blocks: Array<{
        a: number;
        b: number;
        size: number;
    }> = [];
    if (!a.length || !b.length) return blocks;

    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));

    for (let i = m - 1; i >= 0; i--) {
        for (let j = n - 1; j >= 0; j--) {
            if (a[i] === b[j]) {
                dp[i][j] = dp[i + 1][j + 1] + 1;
            }
        }
    }

    let i = 0, j = 0;
    while (i < m && j < n) {
        if (a[i] === b[j]) {
            let size = 0;
            const ai = i, bj = j;
            while (i < m && j < n && a[i] === b[j]) { i++; j++; size++; }
            if (size > 0) blocks.push({ a: ai, b: bj, size });
        } else {
            let bestLen = 0, bestI = i + 1, bestJ = j + 1;
            for (let ni = i; ni < Math.min(i + 50, m); ni++) {
                for (let nj = j; nj < Math.min(j + 50, n); nj++) {
                    if (dp[ni][nj] > bestLen) { bestLen = dp[ni][nj]; bestI = ni; bestJ = nj; }
                }
            }
            i = bestI; j = bestJ;
        }
    }
    return blocks;
}

export function getDeltaByFpLen(newRaw: string, lastSentClean: string, isFinal: boolean) {
    const newC = isFinal ? newRaw : getCleanText(newRaw);

    if (newC.startsWith(lastSentClean)) {
        return [newC.slice(lastSentClean.length), newC];
    }

    const searchLen = Math.min(3000, Math.max(1000, lastSentClean.length));
    const actualLen = Math.min(searchLen, lastSentClean.length, newC.length);

    if (actualLen === 0) return [newC, newC];

    const tailLast = lastSentClean.slice(-actualLen);
    const tailNew = newC.slice(-actualLen);

    const blocks = longestCommonSubsequenceBlocks(tailLast, tailNew);
    if (blocks.length > 0) {
        const lastMatch = blocks[blocks.length - 1];
        const matchEnd = lastMatch.b + lastMatch.size;
        return [tailNew.slice(matchEnd), newC];
    }

    const blocksAll = longestCommonSubsequenceBlocks(lastSentClean, newC);
    if (blocksAll.length > 0) {
        const lastMatch = blocksAll[blocksAll.length - 1];
        const matchEnd = lastMatch.b + lastMatch.size;
        return [newC.slice(matchEnd), newC];
    }

    return [newC, newC];
}

export function getNestedValue<R=any | null>(data: any, path: Array<number|string>, defaultVal: any | null = null): R {
    let cur = data;
    for (const k of path) {
        if (cur == null) return defaultVal;
        if (typeof k === 'number') {
            if (!Array.isArray(cur) || k < -cur.length || k >= cur.length) return defaultVal;
            cur = cur[k < 0 ? cur.length + k : k];
        } else {
            if (typeof cur !== 'object' || !(k in cur)) return defaultVal;
            cur = cur[k];
        }
    }
    return cur != null ? cur : defaultVal;
}

export class StreamingFrameParser {
    buffer: string;
    expectedUnits: number | null;
    payloadStart: number;
    scannedChars: number;
    scannedUnits: number;
    prefixChecked: boolean;
    constructor() {
        this.buffer = '';
        this.expectedUnits = null;
        this.payloadStart = 0;
        this.scannedChars = 0;
        this.scannedUnits = 0;
        this.prefixChecked = false;
    }

    reset() {
        this.buffer = '';
        this._resetFrameState();
        this.prefixChecked = false;
    }

    feed(content: string) {
        if (typeof content !== 'string') throw new TypeError(`Expected string, got ${typeof content}`);
        if (content) this.buffer += content;
        this._stripPrefixOnce();

        const parsed: string[] = [];
        while (true) {
            if (this.expectedUnits === null && !this._readLengthMarker()) break;
            if (this.expectedUnits === null) break;

            this._scanAvailablePayload();
            if (this.scannedUnits < this.expectedUnits) break;

            const endPos = this.payloadStart + this.scannedChars;
            const chunk = this.buffer.slice(this.payloadStart, endPos);
            this.buffer = this.buffer.slice(endPos);
            this._resetFrameState();

            if (!chunk.trim()) continue;

            try {
                const p = JSON.parse(chunk);
                if (Array.isArray(p)) parsed.push(...p);
                else parsed.push(p);
            } catch {}
        }
        return parsed;
    }

    flush() {
        return this.feed('');
    }

    _resetFrameState() {
        this.expectedUnits = null;
        this.payloadStart = 0;
        this.scannedChars = 0;
        this.scannedUnits = 0;
    }

    _stripPrefixOnce() {
        if (this.prefixChecked) return;
        const prefix = ")]}'";
        if (this.buffer.length < prefix.length && prefix.startsWith(this.buffer)) return;
        if (this.buffer.startsWith(prefix)) {
            this.buffer = this.buffer.slice(prefix.length).trimStart();
        }
        this.prefixChecked = true;
    }

    _readLengthMarker() {
        let pos = 0;
        while (pos < this.buffer.length && /\s/.test(this.buffer[pos])) pos++;
        if (pos) {
            this.buffer = this.buffer.slice(pos);
        }
        if (!this.buffer.length) return false;

        const m = LENGTH_MARKER_RE.exec(this.buffer);
        if (!m) return false;

        const lenStr = m[1];
        this.expectedUnits = parseInt(lenStr, 10);
        this.payloadStart = lenStr.length;
        this.scannedChars = 0;
        this.scannedUnits = 0;
        return true;
    }

    _scanAvailablePayload() {
        if (this.expectedUnits === null) return;
        let idx = this.payloadStart + this.scannedChars;
        const limit = this.buffer.length;

        while (this.scannedUnits < this.expectedUnits && idx < limit) {
            const cp = this.buffer.codePointAt(idx);
            const u = cp && cp > 0xFFFF ? 2 : 1;
            if (this.scannedUnits + u > this.expectedUnits) break;
            this.scannedUnits += u;
            this.scannedChars += cp && cp > 0xFFFF ? 2 : 1;
            idx += cp && cp > 0xFFFF ? 2 : 1;
        }
    }
}

function parseResponseByFrame(content: string) {
    const parser = new StreamingFrameParser();
    const frames = parser.feed(content);
    frames.push(...parser.flush());
    return [frames, parser.buffer];
}

export function extractJsonFromResponse(text: string) {
    if (typeof text !== 'string') throw new TypeError(`Expected string, got ${typeof text}`);
    const parser = new StreamingFrameParser();
    const result = parser.feed(text);
    result.push(...parser.flush());
    if (result.length) return result;
    const c = text.startsWith(")]}'") ? text.slice(4).trimStart() : text.trimStart();
    try {
        const p = JSON.parse(c.trim());
        return Array.isArray(p) ? p : [p];
    } catch {}
    const lines = [];
    for (const line of c.trim().split('\n')) {
        try {
            const p = JSON.parse(line.trim());
            if (Array.isArray(p)) lines.push(...p);
            else if (p && typeof p === 'object') lines.push(p);
        } catch {}
    }
    if (lines.length) return lines;
    throw new Error('Could not find valid JSON in response.');
}
