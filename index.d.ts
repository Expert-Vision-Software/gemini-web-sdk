export interface ModelHeader {
    'x-goog-ext-525001261-jspb'?: string;
    'x-goog-ext-73010989-jspb'?: string;
    'x-goog-ext-73010990-jspb'?: string;
    [key: string]: string | undefined;
}

export interface ModelDef {
    model_name: string;
    model_header: ModelHeader;
    advanced_only: boolean;
}

export interface ModelDict {
    model_name: string;
    model_header: ModelHeader;
}

export type ModelInput = string | ModelDef | ModelDict | AvailableModel | null;

export declare function buildModelHeader(modelId: string, capacityTail: string | number, modelNumber?: number): ModelHeader;

export declare const MODEL_HEADER_KEY: string;
export declare const STREAMING_FLAG_INDEX: number;
export declare const GEM_FLAG_INDEX: number;
export declare const TEMPORARY_CHAT_FLAG_INDEX: number;
export declare const CARD_CONTENT_RE: RegExp;
export declare const ARTIFACTS_RE: RegExp;
export declare const DEFAULT_METADATA: (string | null)[];

export declare const Model: {
    readonly UNSPECIFIED: ModelDef;
    readonly BASIC_PRO: ModelDef;
    readonly BASIC_FLASH: ModelDef;
    readonly BASIC_LITE: ModelDef;
    readonly PLUS_PRO: ModelDef;
    readonly PLUS_FLASH: ModelDef;
    readonly PLUS_LITE: ModelDef;
    readonly ADVANCED_PRO: ModelDef;
    readonly ADVANCED_FLASH: ModelDef;
    readonly ADVANCED_LITE: ModelDef;
    fromName(name: string): ModelDef;
    fromDict(d: ModelDict): ModelDef;
    modelId(model: ModelDef): string;
};

export declare const ErrorCode: {
    readonly TEMPORARY_ERROR_1013: 1013;
    readonly USAGE_LIMIT_EXCEEDED: 1037;
    readonly MODEL_INCONSISTENT: 1050;
    readonly MODEL_HEADER_INVALID: 1052;
    readonly IP_TEMPORARILY_BLOCKED: 1060;
    readonly FEATURE_NOT_AVAILABLE: number;
};

export declare const GRPC: Record<string, string>;
export declare const Endpoint: Record<string, string>;
export declare const Headers: Record<string, Record<string, string>>;

export declare class AuthError extends Error { name: 'AuthError'; }
export declare class APIError extends Error { name: 'APIError'; }
export declare class GeminiError extends Error { name: 'GeminiError'; }
export declare class UsageLimitExceeded extends GeminiError { name: 'UsageLimitExceeded'; }
export declare class ModelInvalid extends GeminiError { name: 'ModelInvalid'; }
export declare class TemporarilyBlocked extends GeminiError { name: 'TemporarilyBlocked'; }

export declare class AvailableModel {
    model_id: string;
    model_name: string;
    display_name: string;
    description: string;
    capacity: number;
    capacity_field: number;
    model_number: number;
    is_available: boolean;
    constructor(opts: {
        model_id: string;
        model_name: string;
        display_name: string;
        description: string;
        capacity: number;
        capacity_field?: number;
        model_number?: number;
        is_available?: boolean;
    });
    get model_header(): ModelHeader;
    get advanced_only(): boolean;
    toString(): string;
}

export declare class RPCData {
    rpcid: string;
    payload: string;
    identifier: string;
    constructor(opts: { rpcid: string; payload: string; identifier?: string });
    serialize(): [string, string, null, string];
    toString(): string;
}

export interface SaveImageOptions {
    path?: string;
    filename?: string | null;
    verbose?: boolean;
}

export interface SaveGeneratedImageOptions extends SaveImageOptions {
    fullSize?: boolean;
}

export interface SaveVideoOptions {
    savePath?: string;
    filename?: string | null;
    verbose?: boolean;
}

export interface SaveVideoResult {
    video: string;
    video_thumbnail: string | null;
}

export interface SaveMediaResult {
    mp4: string | null;
    mp3: string | null;
    mp4_thumbnail: string | null;
    mp3_thumbnail: string | null;
}

export interface SaveAllResult {
    images: string[];
    videos: SaveVideoResult[];
    media: SaveMediaResult[];
}

export declare class Image {
    url: string;
    title: string;
    alt: string;
    proxy: string | null;
    client_ref: Gemini | null;
    constructor(opts?: { url?: string; title?: string; alt?: string; proxy?: string | null; client_ref?: Gemini | null });
    save(opts?: SaveImageOptions): Promise<string>;
    toString(): string;
}

export declare class WebImage extends Image {
    constructor(opts?: { url?: string; title?: string; alt?: string; proxy?: string | null; client_ref?: Gemini | null });
}

export declare class GeneratedImage extends Image {
    cid: string;
    rid: string;
    rcid: string;
    image_id: string;
    constructor(opts?: {
        url?: string; title?: string; alt?: string; proxy?: string | null; client_ref?: Gemini | null;
        cid?: string; rid?: string; rcid?: string; image_id?: string;
    });
    save(opts?: SaveGeneratedImageOptions): Promise<string>;
}

export declare class Video {
    url: string;
    title: string;
    proxy: string | null;
    client_ref: Gemini | null;
    constructor(opts?: { url?: string; title?: string; proxy?: string | null; client_ref?: Gemini | null });
    save(opts?: SaveVideoOptions): Promise<SaveVideoResult>;
    toString(): string;
}

export declare class GeneratedVideo extends Video {
    thumbnail: string | null;
    cid: string;
    rid: string;
    rcid: string;
    constructor(opts?: {
        url?: string; thumbnail?: string | null; cid?: string; rid?: string; rcid?: string;
        client_ref?: Gemini | null; proxy?: string | null;
    });
    save(opts?: SaveVideoOptions): Promise<SaveVideoResult>;
}

export declare class GeneratedMedia extends Video {
    thumbnail: string | null;
    mp3_url: string;
    mp3_thumbnail: string | null;
    cid: string;
    rid: string;
    rcid: string;
    constructor(opts?: {
        url?: string; thumbnail?: string | null; mp3_url?: string; mp3_thumbnail?: string | null;
        cid?: string; rid?: string; rcid?: string; client_ref?: Gemini | null; proxy?: string | null;
    });
    save(opts?: SaveVideoOptions): Promise<SaveMediaResult>;
    toString(): string;
}

export declare class DeepResearchPlan {
    research_id: string | null;
    title: string | null;
    query: string | null;
    steps: string[];
    eta_text: string | null;
    confirm_prompt: string | null;
    modify_prompt: string | null;
    confirmation_url: string | null;
    metadata: (string | null)[];
    cid: string | null;
    response_text: string | null;
    raw_state: number | null;
    constructor(opts?: Partial<DeepResearchPlan>);
}

export declare class DeepResearchStatus {
    research_id: string;
    state: string;
    title: string | null;
    query: string | null;
    cid: string | null;
    notes: string[];
    done: boolean;
    raw_state: number | null;
    raw: unknown;
    constructor(opts: {
        research_id: string;
        state?: string;
        title?: string | null;
        query?: string | null;
        cid?: string | null;
        notes?: string[];
        done?: boolean;
        raw_state?: number | null;
        raw?: unknown;
    });
}

export declare class DeepResearchResult {
    plan: DeepResearchPlan;
    final_output: ModelOutput | null;
    statuses: DeepResearchStatus[];
    done: boolean;
    constructor(opts: {
        plan: DeepResearchPlan;
        final_output?: ModelOutput | null;
        statuses?: DeepResearchStatus[];
        done?: boolean;
    });
    get text(): string;
}

export declare class Candidate {
    index: number;
    rcid: string;
    text: string;
    text_delta: string | null;
    thoughts: string | null;
    thoughts_delta: string | null;
    web_images: WebImage[];
    generated_images: GeneratedImage[];
    generated_videos: GeneratedVideo[];
    generated_media: GeneratedMedia[];
    deep_research_plan: DeepResearchPlan | null;
    done: boolean;
    constructor(opts: {
        rcid: string;
        index?: number;
        text: string;
        text_delta?: string | null;
        thoughts?: string | null;
        thoughts_delta?: string | null;
        web_images?: WebImage[];
        generated_images?: GeneratedImage[];
        generated_videos?: GeneratedVideo[];
        generated_media?: GeneratedMedia[];
        deep_research_plan?: DeepResearchPlan | null;
        done?: boolean;
    });
    get images(): (WebImage | GeneratedImage)[];
    get videos(): GeneratedVideo[];
    get media(): GeneratedMedia[];
    toString(): string;
}

export declare class ModelOutput {
    cid: string;
    rid: string;
    model: string;
    gem: string | null;
    created: number;
    candidates: Candidate[];
    chosen: number;

    constructor(
        metadata: (string | null)[],
        candidates: Candidate[],
        opts?: { chosen?: number; model?: string; gem?: string | null },
    );

    get rcid(): string;
    get done(): boolean;
    get text(): string;
    get text_delta(): string;
    get thoughts(): string | null;
    get thoughts_delta(): string;
    get images(): (WebImage | GeneratedImage)[];
    get videos(): GeneratedVideo[];
    get media(): GeneratedMedia[];
    get deep_research_plan(): DeepResearchPlan | null;
    get metadata(): (string | null)[];
    set metadata(v: (string | null)[]);

    saveAll(opts?: { path?: string; verbose?: boolean }): Promise<SaveAllResult>;
    toString(): string;
}

export declare class ChatTurn {
    role: 'user' | 'model';
    text: string;
    model_output: ModelOutput | null;
    constructor(opts: { role: 'user' | 'model'; text: string; model_output?: ModelOutput | null });
    toString(): string;
}

export declare class ChatHistory {
    cid: string;
    turns: ChatTurn[];
    constructor(opts: { cid: string; turns?: ChatTurn[] });
    toString(): string;
}

export declare class ChatInfo {
    cid: string;
    title: string;
    is_pinned: boolean;
    timestamp: number;
    constructor(opts: { cid: string; title: string; is_pinned?: boolean; timestamp: number });
    toString(): string;
}

export declare class Gem {
    id: string;
    name: string;
    description: string | null;
    prompt: string | null;
    predefined: boolean;
    constructor(opts: { id: string; name: string; description?: string | null; prompt?: string | null; predefined: boolean });
    toString(): string;
}

export interface GemGetOptions {
    id?: string | null;
    name?: string | null;
    defaultVal?: Gem | null;
}

export interface GemFilterOptions {
    predefined?: boolean | null;
    name?: string | null;
}

export declare class GemJar {
    constructor(entries?: [string, Gem][]);
    set(id: string, gem: Gem): void;
    get(opts: GemGetOptions): Gem | null;
    filter(opts?: GemFilterOptions): GemJar;
    values(): Gem[];
    keys(): string[];
    entries(): [string, Gem][];
    [Symbol.iterator](): Iterator<Gem>;
    toObject(): Record<string, Gem>;
}

export interface EndpointOverrides {
    GOOGLE?: string;
    INIT?: string;
    GENERATE?: string;
    UPLOAD?: string;
    BATCH_EXEC?: string;
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

export interface NewChatOptions {
    model?: ModelInput;
    temporary?: boolean;
    gem?: Gem | string | null;
    metadata?: (string | null)[] | null;
}

export interface GenerateContentOptions {
    prompt: string;
    files?: string[] | null;
    deep_research?: boolean;
    extended_thinking?: boolean;
}

export interface AskOptions {
    model?: ModelInput;
    gem?: Gem | string | null;
    temporary?: boolean;
    files?: string[] | null;
    extended_thinking?: boolean;
}

export interface ResearchOptions {
    wait?: boolean;
    pollInterval?: number;
    timeout?: number;
    onStatus?: ((status: DeepResearchStatus) => void) | null;
}

export interface AddGemOptions {
    name: string;
    prompt: string;
    description?: string;
}

export interface SetGemOptions {
    gem: Gem | string;
    name: string;
    prompt: string;
    description?: string;
}

export declare class Gemini {
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

    constructor(opts?: GeminiOptions);

    init(): Promise<void>;
    close(delay?: number): Promise<void>;

    newChat(opts?: NewChatOptions): ChatSession;
    ask(prompt: string, opts?: AskOptions): Promise<ModelOutput>;

    models(): Promise<AvailableModel[]>;

    chats(): Promise<unknown[]>;
    readChat(cid: string, limit?: number): Promise<{ role: string; text: string; rid?: string; rcid?: string; images?: (WebImage | GeneratedImage)[]; videos?: GeneratedVideo[]; media?: GeneratedMedia[] }[]>;
    continueChat(cid: string): Promise<ChatSession>;
    deleteChat(cid: string): Promise<void>;

    gems(): Promise<{ id: string; name: string; description: string; prompt: string | null; predefined: boolean }[]>;
    addGem(opts: AddGemOptions): Promise<{ id: string; name: string; description: string; prompt: string; predefined: boolean }>;
    setGem(opts: SetGemOptions): Promise<{ id: string; name: string; description: string; prompt: string; predefined: boolean }>;
    delGem(gem: { id: string } | string): Promise<void>;

    research(prompt: string, opts?: ResearchOptions): Promise<DeepResearchResult>;
}

export declare class ChatSession {
    client: Gemini;
    model: ModelDef | AvailableModel;
    gem: Gem | string | null;
    temporary: boolean;
    lastOutput: ModelOutput | null;

    constructor(client: Gemini, opts?: NewChatOptions);

    get metadata(): (string | null)[];
    set metadata(v: (string | null)[]);
    get cid(): string;
    set cid(v: string);
    get rid(): string;
    set rid(v: string);
    get rcid(): string;
    set rcid(v: string);

    generateContent(opts: GenerateContentOptions): Promise<ModelOutput>;
    generateContentStream(opts: GenerateContentOptions): AsyncGenerator<ModelOutput>;

    chooseCandidate(index: number): void;
    delete(): Promise<void>;
}
