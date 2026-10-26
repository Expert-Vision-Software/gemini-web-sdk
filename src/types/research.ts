import type { IModelOutput } from "./output.js";

export interface IDeepResearchPlan {
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
}

export class DeepResearchPlan implements IDeepResearchPlan {
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
    constructor(opts: Partial<IDeepResearchPlan> = {}) {
        const {
            research_id = null,
            title = null,
            query = null,
            steps = [],
            eta_text = null,
            confirm_prompt = null,
            modify_prompt = null,
            confirmation_url = null,
            metadata = [],
            cid = null,
            response_text = null,
            raw_state = null,
        } = opts;
        this.research_id = research_id;
        this.title = title;
        this.query = query;
        this.steps = steps;
        this.eta_text = eta_text;
        this.confirm_prompt = confirm_prompt;
        this.modify_prompt = modify_prompt;
        this.confirmation_url = confirmation_url;
        this.metadata = metadata;
        this.cid = cid;
        this.response_text = response_text;
        this.raw_state = raw_state;
    }
}

export interface IDeepResearchStatus {
    research_id: string;
    state: string;
    title: string | null;
    query: string | null;
    cid: string | null;
    notes: string[];
    done: boolean;
    raw_state: number | null;
    raw: unknown;
}

export type DeepResearchStatusConstructorOptions = { research_id: string} & Partial<Omit<IDeepResearchStatus, 'research_id'>>;

export class DeepResearchStatus implements IDeepResearchStatus {
    research_id: string;
    state: string;
    title: string | null;
    query: string | null;
    cid: string | null;
    notes: string[];
    done: boolean;
    raw_state: number | null;
    raw: unknown;
    constructor(opts: DeepResearchStatusConstructorOptions) {
        const {
            research_id,
            state = 'running',
            title = null,
            query = null,
            cid = null,
            notes = [],
            done = false,
            raw_state = null,
            raw = null,
        } = opts;
        this.research_id = research_id;
        this.state = state;
        this.title = title;
        this.query = query;
        this.cid = cid;
        this.notes = notes;
        this.done = done;
        this.raw_state = raw_state;
        this.raw = raw;
    }
}

export interface IDeepResearchResult {
    plan: IDeepResearchPlan;
    start_output: IModelOutput | null;
    final_output: IModelOutput | null;
    statuses: IDeepResearchStatus[];
    done: boolean;
    get text(): string;
}
export class DeepResearchResult {
    plan: IDeepResearchPlan;
    start_output: IModelOutput | null;
    final_output: IModelOutput | null;
    statuses: IDeepResearchStatus[];
    done: boolean;
    constructor(opts: {
        plan: IDeepResearchPlan;
        start_output?: IModelOutput | null;
        final_output?: IModelOutput | null;
        statuses?: IDeepResearchStatus[];
        done?: boolean;
    }) {
        const { plan, start_output = null, final_output = null, statuses = [], done = false } = opts;
        this.plan = plan;
        this.start_output = start_output;
        this.final_output = final_output;
        this.statuses = statuses;
        this.done = done;
    }

    get text() {
        return this.final_output ? this.final_output.text : '';
    }
}
