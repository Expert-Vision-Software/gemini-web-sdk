export class AuthError extends Error {
    constructor(m: string) { super(m); this.name = 'AuthError'; }
}

export class APIError extends Error {
    constructor(m: string) { super(m); this.name = 'APIError'; }
}

export class GeminiError extends Error {
    constructor(m: string) { super(m); this.name = 'GeminiError'; }
}

export class UsageLimitExceeded extends GeminiError {
    constructor(m: string) { super(m); this.name = 'UsageLimitExceeded'; }
}

export class ModelInvalid extends GeminiError {
    constructor(m: string) { super(m); this.name = 'ModelInvalid'; }
}

export class TemporarilyBlocked extends GeminiError {
    constructor(m: string) { super(m); this.name = 'TemporarilyBlocked'; }
}