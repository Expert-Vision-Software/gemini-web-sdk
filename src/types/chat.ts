import type { IGem } from "./gem.js";
import type { GeminiClient } from "./gemini.js";
import type { IAvailableModel, ModelDef, ModelInput } from "./model.js";
import type { IModelOutput } from "./output.js";

export class ChatTurn {
    role?: string;
    text?: string;
    model_output: IModelOutput | null;
    constructor(opts: { role?: string, text?: string, model_output?: IModelOutput | null } = {}) {
        const { role, text, model_output = null } = opts;
        this.role = role;
        this.text = text;
        this.model_output = model_output;
    }

    toString() {
        const preview = this.text && this.text.length > 100 ? this.text.slice(0, 100) + '...' : (this.text || '');
        return `${this.role?.toUpperCase()}: ${preview}`;
    }
}

export class ChatHistory {
    cid?: string;
    turns?: ChatTurn[];
    constructor(opts: { cid?: string, turns?: ChatTurn[] } = {}) {
        const { cid, turns } = opts;
        this.cid = cid;
        this.turns = turns || [];
    }

    toString() {
        return `ChatHistory(cid=${this.cid})`;
    }
}

export class ChatInfo {
    cid?: unknown;
    title?: string;
    is_pinned: boolean;
    timestamp: number;
    constructor(opts: { cid?: unknown, title?: string, is_pinned?: boolean, timestamp?: number } = {}) {
        const { cid, title, is_pinned = false, timestamp } = opts;
        this.cid = cid;
        this.title = title;
        this.is_pinned = is_pinned;
        this.timestamp = timestamp as number;
    }

    toString() {
        const pin = this.is_pinned ? '[Pinned] ' : '';
        const title = this.title || `Chat(${this.cid})`;
        const dt = new Date(this.timestamp * 1000).toISOString().replace('T', ' ').slice(0, 19);
        return `${pin}${title} (${dt})`;
    }
}

export interface GenerateContentOptions {
    prompt: string;
    files?: string[] | null;
    deep_research?: boolean;
    extended_thinking?: boolean;
}

export interface NewChatOptions {
    model?: ModelInput;
    temporary?: boolean;
    gem?: IGem | string | null;
    metadata?: (string | null)[] | null;
}

export interface IChatSession {
    client: GeminiClient;
    model: ModelDef | IAvailableModel;
    gem: IGem | string | null;
    temporary: boolean;
    lastOutput: IModelOutput | ChatHistory | null;
    get metadata(): (string | null)[];
    set metadata(v: (string | null)[]);
    get cid(): string;
    set cid(v: string);
    get rid(): string;
    set rid(v: string);
    get rcid(): string;
    set rcid(v: string);

    generateContent(opts: GenerateContentOptions): Promise<IModelOutput>;
    generateContentStream(opts: GenerateContentOptions): AsyncGenerator<IModelOutput>;

    chooseCandidate(index: number): void;
    delete(): Promise<void>;
}
