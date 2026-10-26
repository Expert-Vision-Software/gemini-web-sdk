import type { EndpointOverrides } from "../constants.js";
import type { IChatSession, NewChatOptions } from "./chat.js";
import type { IGem } from "./gem.js";
import type { IGeneratedImage, IGeneratedMedia, IGeneratedVideo, IWebImage } from "./media.js";
import type { IAvailableModel, ModelDef, ModelInput } from "./model.js";
import type { IModelOutput } from "./output.js";
import type { IDeepResearchResult, IDeepResearchStatus } from "./research.js";

export interface AskOptions {
    model?: ModelInput;
    gem?: IGem | string | null;
    temporary?: boolean;
    files?: string[] | null;
    extended_thinking?: boolean;
}

export interface ResearchOptions {
    wait?: boolean;
    pollInterval?: number;
    timeout?: number;
    onStatus?: ((status: IDeepResearchStatus) => void) | null;
}

export interface AddGemOptions {
    name: string;
    prompt: string;
    description?: string;
}

export interface SetGemOptions {
    gem: IGem | string;
    name: string;
    prompt: string;
    description?: string;
}

export interface GeminiOptions {
    secure_1psid?: string | null;
    proxy?: string | null;
    timeout?: number;
    autoClose?: boolean;
    closeDelay?: number;
    verbose?: boolean;
    watchdogTimeout?: number;
    maxResponseHeaderSize?: number;
    endpoints?: EndpointOverrides;
}

export interface GeminiClientGenerateOptionsBase {
    prompt: string;
    model?: ModelDef;
    gem?: IGem | string | null;
    chat: IChatSession | null;
    temporary?: boolean;
    deep_research: boolean;
    extended_thinking?: boolean;
}
export interface GeminiClientGenerateOptions extends GeminiClientGenerateOptionsBase {
    fileData: (string | any[])[][] | null;
    ss: { last_texts: Record<string, string>; last_thoughts: Record<string, string>} | null;
};
export type GeminiClientStreamGuestOptions = Pick<GeminiClientGenerateOptions, 'prompt' | 'chat' | 'ss'>


export interface GeminiClientGenerateContentOptions extends GeminiClientGenerateOptionsBase {
    files?: string[] | null;
};

export interface GeminiClient {
    cookies: Record<string, string>;
    proxy: string | null;
    accessToken: string | null;
    buildLabel: string | null;
    sessionId: string | null;
    language: string;
    pushId: string;
    timeout: number;
    autoClose: boolean;
    closeDelay: number;
    verbose: boolean;
    watchdogTimeout: number;
    maxResponseHeaderSize: number;
    endpoints: Required<EndpointOverrides>;

    init(): Promise<void>;
    close(delay?: number): Promise<void>;

    newChat(opts?: NewChatOptions): IChatSession;
    ask(prompt: string, opts?: AskOptions): Promise<IModelOutput>;

    models(): Promise<IAvailableModel[]>;

    chats(): Promise<unknown[]>;
    readChat(cid: string, limit?: number): Promise<{ role: string; text: string; rid?: string; rcid?: string; images?: (IWebImage | IGeneratedImage)[]; videos?: IGeneratedVideo[]; media?: IGeneratedMedia[] }[]>;
    continueChat(cid: string): Promise<IChatSession>;
    deleteChat(cid: string): Promise<void>;

    gems(): Promise<{ id: string; name: string; description: string; prompt: string | null; predefined: boolean }[]>;
    addGem(opts: AddGemOptions): Promise<{ id: string; name: string; description: string; prompt: string; predefined: boolean }>;
    setGem(opts: SetGemOptions): Promise<{ id: string; name: string; description: string; prompt: string; predefined: boolean }>;
    delGem(gem: { id: string } | string): Promise<void>;

    research(prompt: string, opts?: ResearchOptions): Promise<IDeepResearchResult>;

    _resolveModel(model: ModelInput): ModelDef | IAvailableModel;
    _getFullSizeImage(cid: string, rid: string, rcid: string, imageId: string): Promise<any|null>;
    _generate(opts: GeminiClientGenerateOptions, retries?: number): AsyncGenerator<IModelOutput, void, unknown>;
    _generateContent(opts: GeminiClientGenerateContentOptions): Promise<IModelOutput>;
    _generateContentStream(opts: GeminiClientGenerateContentOptions): AsyncGenerator<IModelOutput, void, unknown>;
}