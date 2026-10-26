import type { ModelDef, ModelDict } from "./types/model.js";

export { MODEL_HEADER_KEY } from "./types/model.js";
import { buildModelHeader, MODEL_HEADER_KEY } from "./types/model.js";

export const STREAMING_FLAG_INDEX = 7;
export const GEM_FLAG_INDEX = 19;
export const TEMPORARY_CHAT_FLAG_INDEX = 45;

export const CARD_CONTENT_RE = /^http:\/\/googleusercontent\.com\/card_content\/\d+/;
export const ARTIFACTS_RE = /http:\/\/googleusercontent\.com\/\w+\/\d+\n*/g;
export const DEFAULT_METADATA = ['', '', '', null, null, null, null, null, null, ''];

export const Endpoint = {
    GOOGLE: 'https://www.google.com',
    INIT: 'https://gemini.google.com/app',
    GENERATE: 'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate',
    UPLOAD: 'https://content-push.googleapis.com/upload',
    BATCH_EXEC: 'https://gemini.google.com/_/BardChatUi/data/batchexecute',
};
export type EndpointOverrides = Partial<typeof Endpoint>;

export const GRPC = {
    LIST_CHATS: 'MaZiqc',
    READ_CHAT: 'hNvQHb',
    DELETE_CHAT_1: 'GzXR5e',
    DELETE_CHAT_2: 'qWymEb',

    LIST_GEMS: 'CNgdBe',
    CREATE_GEM: 'oMH3Zd',
    UPDATE_GEM: 'kHv0Vd',
    DELETE_GEM: 'UXcSJb',

    DEEP_RESEARCH_STATUS: 'kwDCne',
    GET_FULL_SIZE_IMAGE: 'c8o8Fe',
};

export const Headers = {
    REFERER: {
        'Origin': 'https://gemini.google.com',
        'Referer': 'https://gemini.google.com/',
    },
    SAME_DOMAIN: {
        'X-Same-Domain': '1',
    },
    GEMINI: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        'Origin': 'https://gemini.google.com',
        'Referer': 'https://gemini.google.com/',
    },
    UPLOAD: { 'X-Tenant-Id': 'bard-storage' },
    BATCH_EXEC: {
        'x-goog-ext-525001261-jspb': '[1,null,null,null,null,null,null,null,[4,5,6,8],null,null,null,null,null,null,null]',
        'x-goog-ext-73010989-jspb': '[0]',
    },
};

const _MODEL_KEYS = [
    'UNSPECIFIED',
    'BASIC_PRO', 'BASIC_FLASH', 'BASIC_LITE', 'BASIC_THINKING',
    'PLUS_PRO', 'PLUS_FLASH', 'PLUS_LITE',
    'ADVANCED_PRO', 'ADVANCED_FLASH', 'ADVANCED_LITE',
] as const;

const listModelDefinitions = [
  { model_name: 'unspecified', model_header: {}, advanced_only: false },
  {
    model_name: 'gemini-3-pro',
    model_header: buildModelHeader('9d8ca3786ebdfbea', 1, 3),
    advanced_only: false,
  },
  {
    model_name: 'gemini-3-flash',
    model_header: buildModelHeader('fbb127bbb056c959', 1, 1),
    advanced_only: false,
  },
  {
    model_name: 'gemini-3-lite',
    model_header: buildModelHeader('cf41b0e0dd7d53e5', 1, 6),
    advanced_only: false,
  },
  {
    model_name: 'gemini-3-thinking',
    model_header: buildModelHeader('5bf011840784117a', 1, 15),
    advanced_only: false,
  },
  {
    model_name: 'gemini-3-pro-plus',
    model_header: buildModelHeader('e6fa609c3fa255c0', 4, 3),
    advanced_only: true,
  },
  {
    model_name: 'gemini-3-flash-plus',
    model_header: buildModelHeader('56fdd199312815e2', 4, 1),
    advanced_only: true,
  },
  {
    model_name: 'gemini-3-lite-plus',
    model_header: buildModelHeader('8c46e95b1a07cecc', 4, 6),
    advanced_only: true,
  },
  {
    model_name: 'gemini-3-pro-advanced',
    model_header: buildModelHeader('e6fa609c3fa255c0', 2, 3),
    advanced_only: true,
  },
  {
    model_name: 'gemini-3-flash-advanced',
    model_header: buildModelHeader('56fdd199312815e2', 2, 1),
    advanced_only: true,
  },
  {
    model_name: 'gemini-3-lite-advanced',
    model_header: buildModelHeader('8c46e95b1a07cecc', 2, 6),
    advanced_only: true,
  },
] as const satisfies ReadonlyArray<ModelDef>;

export type ModelIdentifier = typeof listModelDefinitions[number]['model_name'];

const modelDefinitions = listModelDefinitions.reduce((acc, current) => {
  acc[current.model_name] = current;
  return acc;
}, {} as Record<ModelIdentifier, ModelDef>);

export const Model = {
    UNSPECIFIED: modelDefinitions['unspecified'],
    BASIC_PRO: modelDefinitions['gemini-3-pro'],
    BASIC_FLASH: modelDefinitions['gemini-3-flash'],
    BASIC_LITE: modelDefinitions['gemini-3-lite'],
    BASIC_THINKING: modelDefinitions['gemini-3-thinking'],
    PLUS_PRO: modelDefinitions['gemini-3-pro-plus'],
    PLUS_FLASH: modelDefinitions['gemini-3-flash-plus'],
    PLUS_LITE: modelDefinitions['gemini-3-lite-plus'],
    ADVANCED_PRO: modelDefinitions['gemini-3-pro-advanced'],
    ADVANCED_FLASH: modelDefinitions['gemini-3-flash-advanced'],
    ADVANCED_LITE: modelDefinitions['gemini-3-lite-advanced'],
    fromName(name: ModelIdentifier): ModelDef {
        return modelDefinitions[name];
    },
    fromDict(d: ModelDict) {
        if (!d.model_name || !d.model_header || typeof d.model_header !== 'object') {
            throw new Error("model_name and model_header (object) required");
        }
        return { model_name: d.model_name, model_header: d.model_header, advanced_only: false };
    },
    modelId(model: Pick<ModelDef, 'model_header'>) {
        const headerValue = model && model.model_header && model.model_header[MODEL_HEADER_KEY];
        if (!headerValue) return '';
        try {
            const parsed = JSON.parse(headerValue);
            return (parsed && parsed[4]) || '';
        } catch {
            return '';
        }
    },
};
export const ErrorCode = {
    TEMPORARY_ERROR_1013: 1013,
    USAGE_LIMIT_EXCEEDED: 1037,
    MODEL_INCONSISTENT: 1050,
    MODEL_HEADER_INVALID: 1052,
    IP_TEMPORARILY_BLOCKED: 1060,
    FEATURE_NOT_AVAILABLE: 1097,
};
