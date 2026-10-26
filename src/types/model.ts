export const MODEL_HEADER_KEY = 'x-goog-ext-525001261-jspb';

export interface ModelHeader {
    'x-goog-ext-525001261-jspb'?: string;
    'x-goog-ext-73010989-jspb'?: string;
    'x-goog-ext-73010990-jspb'?: string;
    [key: string]: string | undefined;
}
export function buildModelHeader(modelId: string, capacityTail: string | number, modelNumber: number = 1): ModelHeader {
    return {
        [MODEL_HEADER_KEY]: `[1,null,null,null,"${modelId}",null,null,0,[4,5,6,8],null,null,${capacityTail},null,null,${modelNumber}]`,
        'x-goog-ext-73010989-jspb': '[0]',
        'x-goog-ext-73010990-jspb': '[0,0,0]',
    };
}
export interface ModelDef {
    model_name: string;
    model_header: ModelHeader;
    advanced_only: boolean;
}
export type ModelDict = Pick<ModelDef, 'model_name' | 'model_header'>

export type ModelInput = string | ModelDef | ModelDict | IAvailableModel | null;

export class RPCData {
    rpcid: string | undefined;
    payload: any;
    identifier: string;
    constructor(opts: { rpcid?: string, payload?: any, identifier?: string } = {}) {
        const { rpcid, payload, identifier = 'generic' } = opts;
        this.rpcid = rpcid;
        this.payload = payload;
        this.identifier = identifier;
    }

    serialize() {
        return [this.rpcid, this.payload, null, this.identifier];
    }

    toString() {
        return `RPCData(rpcid='${this.rpcid}', payload='${this.payload}', identifier='${this.identifier}')`;
    }
}

export interface IAvailableModel {
    model_id: string;
    model_name: string;
    display_name: string;
    description: string;
    capacity: number;
    capacity_field: number;
    model_number: number;
    is_available: boolean;
    get model_header(): ModelHeader;
    get advanced_only(): boolean;
    toString(): string;
}

type AvailableModelOptions = {
    model_id: string;
    model_name: string;
    display_name: string;
    description: string;
    capacity: number;
    capacity_field?: number;
    model_number?: number;
    is_available?: boolean;
};

export class AvailableModel implements IAvailableModel {
    model_id: string;
    model_name: string;
    display_name: string;
    description: string;
    capacity: number;
    capacity_field: number;
    model_number: number;
    is_available: boolean;
    constructor(opts: AvailableModelOptions) {
        const { model_id, model_name, display_name, description, capacity, capacity_field = 12, model_number = 1, is_available = true } = opts;
        this.model_id = model_id;
        this.model_name = model_name;
        this.display_name = display_name;
        this.description = description;
        this.capacity = capacity;
        this.capacity_field = capacity_field;
        this.model_number = model_number;
        this.is_available = is_available;
    }

    get model_header() {
        let tail;
        if (this.capacity_field === 13) {
            tail = `null,${this.capacity}`;
        } else {
            tail = String(this.capacity);
        }
        return buildModelHeader(this.model_id, tail, this.model_number);
    }

    get advanced_only() {
        return !(this.capacity === 1 && this.capacity_field === 12);
    }

    toString() {
        return this.model_name || this.display_name;
    }

}
