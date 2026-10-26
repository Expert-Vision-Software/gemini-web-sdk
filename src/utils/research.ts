import type { DeepResearchStatusConstructorOptions } from '../types/research.js';
import { getNestedValue } from './parser.js';

const _RESEARCH_ID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
const _CHAT_ID_RE = /\bc_[A-Za-z0-9_]+\b/;
const _URL_RE = /^https?:\/\//;

export function* iterNested(data: any[] | unknown): any {
    yield data;
    if (Array.isArray(data)) {
        for (const item of data) yield* iterNested(item);
    } else if (data && typeof data === 'object') {
        for (const item of Object.values(data)) yield* iterNested(item);
    }
}

export function findFirstMatch(data: any | any[], pattern: RegExp) {
    for (const item of iterNested(data)) {
        if (typeof item === 'string') {
            const match = pattern.exec(item);
            if (match) return match[0];
        }
    }
    return null;
}

export function findFirstString(data: any[], exclude: Set<string> = new Set<string>()) {
    for (const item of iterNested(data)) {
        if (typeof item === 'string' && item && !exclude.has(item)) return item;
    }
    return null;
}

export function extractResearchId(data: any | any[]) {
    return findFirstMatch(data, _RESEARCH_ID_RE);
}

export function extractChatId(data: any | any[]) {
    return findFirstMatch(data, _CHAT_ID_RE);
}

export function collectResearchNotes(data: any, exclude: Set<string> = new Set<string>()) {
    const notes = [];
    const seen = new Set();
    for (const item of iterNested(data)) {
        if (typeof item !== 'string') continue;
        const text = item.trim();
        if (!text || exclude.has(text) || seen.has(text) || _URL_RE.test(text) || text.length < 12) continue;
        seen.add(text);
        notes.push(text);
        if (notes.length >= 12) break;
    }
    return notes;
}

export function findFirstDictKey(data: any, key: string) {
    for (const item of iterNested(data)) {
        if (item && typeof item === 'object' && !Array.isArray(item) && key in item) return item;
    }
    return null;
}

export function extractDeepResearchPlan(candidateData: any, fallbackText: string = '') {
    let metaDict = null;
    let payload = null;

    for (const key of ['56', '57']) {
        metaDict = findFirstDictKey(candidateData, key);
        if (metaDict && Array.isArray(metaDict[key])) {
            payload = metaDict[key];
            break;
        }
    }

    if (!metaDict || !payload) return null;

    const researchId = extractResearchId(candidateData);
    const title = getNestedValue(payload, [0]);
    const stepsPayload = getNestedValue(payload, [1], []);
    const steps = [];
    if (Array.isArray(stepsPayload)) {
        for (const step of stepsPayload) {
            if (Array.isArray(step)) {
                const label = step.length > 1 && typeof step[1] === 'string' ? step[1] : null;
                const body = step.length > 2 && typeof step[2] === 'string' ? step[2] : null;
                if (label && body) steps.push(`${label}: ${body}`);
                else if (body) steps.push(body);
                else if (label) steps.push(label);
            }
        }
    }

    const modifyPayload = getNestedValue(payload, [5]);
    let modifyPrompt = null;
    if (Array.isArray(modifyPayload)) modifyPrompt = findFirstString(modifyPayload);

    const queryVal = getNestedValue(payload, [1, 0, 2]);
    const query = typeof queryVal === 'string' ? queryVal : null;
    const etaVal = getNestedValue(payload, [2]);
    const eta_text = typeof etaVal === 'string' ? etaVal : null;
    const confirmVal = getNestedValue(payload, [3, 0]);
    const confirm_prompt = typeof confirmVal === 'string' ? confirmVal : null;
    const confirmUrlVal = getNestedValue(payload, [4, 0]);
    const confirmation_url = typeof confirmUrlVal === 'string' ? confirmUrlVal : null;
    const rawState70 = metaDict['70'];
    const raw_state = typeof rawState70 === 'number' ? rawState70 : null;

    if (!title && !query && !steps.length && !eta_text && !confirm_prompt && !confirmation_url && !modifyPrompt) {
        return null;
    }

    return {
        research_id: researchId,
        title: typeof title === 'string' ? title : null,
        query,
        steps,
        eta_text,
        confirm_prompt,
        confirmation_url,
        modify_prompt: modifyPrompt,
        raw_state,
        response_text: fallbackText || null,
    };
}

export function extractDeepResearchStatusPayload(payload: any|any[]): DeepResearchStatusConstructorOptions | null {
    const data = Array.isArray(payload) && payload.length > 0 && Array.isArray(payload[0]) ? payload[0] : payload;
    const researchId = extractResearchId(data);
    if (!researchId) return null;

    const title = getNestedValue(data, [1, 4, 0]);
    const query = getNestedValue(data, [1, 4, 1]);
    const cid = getNestedValue(data, [1, 3, 0]) || extractChatId(data);

    let raw_state = null;
    const metaDict = findFirstDictKey(data, '70');
    if (metaDict && typeof metaDict['70'] === 'number') raw_state = metaDict['70'];

    const markerStrings = [];
    for (const item of iterNested(data)) {
        if (typeof item === 'string' && item) markerStrings.push(item);
    }

    const done = markerStrings.some(s => s.includes('immersive_entry_chip'));
    const awaitingConfirmation = markerStrings.some(s => s.includes('deep_research_confirmation_content'));
    const state = done ? 'completed' : awaitingConfirmation ? 'awaiting_confirmation' : 'running';

    const exclude = new Set([title, query, researchId, cid].filter(s => typeof s === 'string'));
    const notes = collectResearchNotes(data, exclude);

    return {
        research_id: researchId,
        state,
        title: typeof title === 'string' ? title : null,
        query: typeof query === 'string' ? query : null,
        cid: typeof cid === 'string' ? cid : null,
        notes,
        done,
        raw_state,
        raw: payload,
    };
}
