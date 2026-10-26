export interface IGem {
    id: string;
    name: string;
    description: string | null;
    prompt: string | null;
    predefined: boolean;
    toString(): string;
}

export class Gem implements IGem {
    id: string;
    name: string;
    description: string | null;
    prompt: string | null;
    predefined: boolean;
    constructor(opts: { id: string, name: string, description?: string | null, prompt?: string | null, predefined: boolean }) {
        const { id, name, description = null, prompt = null, predefined } = opts;
        this.id = id;
        this.name = name;
        this.description = description;
        this.prompt = prompt;
        this.predefined = predefined;
    }

    toString() {
        return `Gem(id='${this.id}', name='${this.name}', predefined=${this.predefined})`;
    }
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

export class GemJar {
    private _store: Record<string, Gem>;
    constructor(entries: [string, Gem][] = []) {
        this._store = {};
        for (const [id, gem] of entries) this._store[id] = gem;
    }

    set(id: string, gem: Gem) { this._store[id] = gem; }

    get(opts: GemGetOptions = {}) {
        const { id = null, name = null, defaultVal = null } = opts;
        if (id == null && name == null) throw new Error('At least one of gem id or name must be provided.');
        if (id != null) {
            const gem = this._store[id];
            if (!gem) return defaultVal;
            if (name != null) return gem.name === name ? gem : defaultVal;
            return gem;
        }
        for (const gem of Object.values(this._store)) {
            if (gem.name === name) return gem;
        }
        return defaultVal;
    }

    filter(opts: GemFilterOptions = {}) {
        const { predefined = null, name = null } = opts
        const result = new GemJar();
        for (const [id, gem] of Object.entries(this._store)) {
            if (predefined != null && gem.predefined !== predefined) continue;
            if (name != null && gem.name !== name) continue;
            result.set(id, gem);
        }
        return result;
    }

    values() { return Object.values(this._store); }
    keys() { return Object.keys(this._store); }
    entries() { return Object.entries(this._store); }

    [Symbol.iterator]() { return this.values()[Symbol.iterator](); }

    toObject() { return { ...this._store }; }
}
