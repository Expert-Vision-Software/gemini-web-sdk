import type { GenerateContentOptions, IChatSession, NewChatOptions } from './types/chat.js';
import type { IGem } from './types/gem.js';
import type { GeminiClient } from './types/gemini.js';
import type { IAvailableModel, ModelDef } from './types/model.js';
import type { IModelOutput } from './types/output.js';

import { DEFAULT_METADATA } from './constants.js';
import { Model } from './constants.js';

export class ChatSession implements IChatSession {
    client: GeminiClient;
    model: ModelDef | IAvailableModel;
    gem: IGem | string | null;
    temporary: boolean;
    lastOutput: IModelOutput | null;
    private readonly _meta: (string | null)[];

    constructor(client: GeminiClient, opts: NewChatOptions = {}) {
        const { model = Model.UNSPECIFIED, temporary = false, gem = null, metadata = null } = opts;
        this.client = client;
        this._meta = [...DEFAULT_METADATA];
        this.gem = gem;
        this.temporary = temporary;
        this.lastOutput = null;
        this.model = client._resolveModel(model);
        if (metadata) {
            for (let i = 0; i < metadata.length && i < 10; i++) {
                if (metadata[i] != null) this._meta[i] = metadata[i];
            }
        }
    }

    get cid() { return this._meta[0] as string; }
    set cid(v: string) { this._meta[0] = v; }
    get rid() { return this._meta[1] as string; }
    set rid(v: string) { this._meta[1] = v; }
    get rcid() { return this._meta[2] as string; }
    set rcid(v: string) { this._meta[2] = v; }
    get metadata() { return this._meta; }
    set metadata(v: (string | null)[]) {
        if (!Array.isArray(v)) return;
        for (let i = 0; i < v.length && i < 10; i++) {
            if (v[i] != null) this._meta[i] = v[i];
        }
    }

    async generateContent(opts: GenerateContentOptions) {
        const { prompt, files = null, deep_research = false, extended_thinking = false } = opts;
        if (!prompt) throw new Error('Prompt cannot be empty.');
        const output = await this.client._generateContent({
            prompt, files, model: this.model, gem: this.gem,
            chat: this, temporary: this.temporary,
            deep_research, extended_thinking,
        });
        this.lastOutput = output;
        return output;
    }

    async *generateContentStream(opts: GenerateContentOptions)  {
        const { prompt, files = null, deep_research = false, extended_thinking = false } = opts;
        if (!prompt) throw new Error('Prompt cannot be empty.');
        let lastOutput;
        for await (const out of this.client._generateContentStream({
            prompt, files, model: this.model, gem: this.gem,
            chat: this, temporary: this.temporary,
            deep_research, extended_thinking,
        })) {
            lastOutput = out;
            yield out;
        }
        if (lastOutput) {
            this.lastOutput = lastOutput;
        }
    }

    chooseCandidate(index: number) {
        if (!this.lastOutput) throw new Error('No response yet.');
        if (index < 0 || index >= this.lastOutput.candidates.length) throw new Error('Invalid candidate index.');
        this.rcid = this.lastOutput.candidates[index].rcid;
        this.lastOutput.chosen = index;
    }

    async delete() {
        if (this.cid) await this.client.deleteChat(this.cid);
    }
}
