import type { GeminiClient } from './gemini.js';

import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseProxy } from '../utils/auth.js';
import { headerLimitConfig } from '../utils/request.js';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function sanitizeFilename(str: string, maxLen: number = 50) {
    if (!str) return '';
    return str.replace(/[^a-zA-Z0-9\s_-]/g, '').replace(/\s+/g, '_').slice(0, maxLen).replace(/_+$/, '');
}

interface SaveImageOptions {
    path?: string;
    filename?: string | null;
    verbose?: boolean;
}

export interface IImage {
    url: string;
    title: string;
    alt: string;
    proxy: string | null;
    client_ref: GeminiClient | null;
    save(opts?: SaveImageOptions): Promise<string>;
    toString(): string;
}

export class Image implements IImage {
    url: string;
    title: string;
    alt: string;
    proxy: string | null;
    client_ref: GeminiClient | null;
    constructor(opts: { url: string; title?: string; alt?: string; proxy?: string | null; client_ref?: GeminiClient | null }) {
        const { url, title = '[Image]', alt = '', proxy = null, client_ref = null } = opts;
        this.url = url;
        this.title = title;
        this.alt = alt;
        this.proxy = proxy;
        this.client_ref = client_ref;
    }

    _getUrlForHash() { return this.url; }

    toString() {
        const short = this.url.length <= 20 ? this.url : this.url.slice(0, 8) + '...' + this.url.slice(-12);
        return `Image(title='${this.title}', alt='${this.alt}', url='${short}')`;
    }

    async save(opts: SaveImageOptions = {}): Promise<string> {
        const { path: savePath = 'temp', verbose = false } = opts;
        let { filename = null } = opts;
        if (!filename || !path.extname(filename)) {
            const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
            const urlHash = crypto.createHash('sha256').update(this._getUrlForHash()).digest('hex').slice(0, 10);
            const baseName = filename ? path.parse(filename).name : (sanitizeFilename(this.alt) || 'image');
            filename = `${timestamp}_${urlHash}_${baseName}`;
        }
        fs.mkdirSync(savePath, { recursive: true });
        return await this._performSave(savePath, filename, verbose);
    }

    async _performSave(savePath: string, filename: string, verbose: boolean) {
        const imgUrl = this.url;
        const proxyConfig = parseProxy(this.proxy);
        const clientRef = this.client_ref || null;
        const cookies = clientRef ? clientRef.cookies : null;

        const res = await axios.get(imgUrl, {
            responseType: 'arraybuffer',
            headers: {
                'Origin': 'https://gemini.google.com',
                'Referer': 'https://gemini.google.com/',
                ...(cookies ? { 'Cookie': Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
            },
            maxRedirects: 5,
            ...(clientRef ? headerLimitConfig(clientRef.maxResponseHeaderSize, { maxRedirects: 5 }) : {}),
            ...(proxyConfig ? { proxy: proxyConfig } : {}),
        });

        if (verbose) console.debug(`HTTP Request: GET ${imgUrl} [${res.status}]`);
        if (res.status !== 200) throw new Error(`Error downloading image: ${res.status}`);

        const contentType = (res.headers['content-type'] as string || '').split(';')[0].trim().toLowerCase();
        let ext = path.extname(filename);
        if (!ext) {
            if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = '.jpg';
            else if (contentType.includes('png')) ext = '.png';
            else if (contentType.includes('webp')) ext = '.webp';
            else if (contentType.includes('gif')) ext = '.gif';
            else ext = '.png';
            filename = filename + ext;
        }

        const dest = path.join(savePath, filename);
        fs.writeFileSync(dest, Buffer.from(res.data));
        if (verbose) console.info(`Image saved as ${path.resolve(dest)}`);
        return path.resolve(dest);
    }
}

export interface IWebImage extends IImage {}

export class WebImage extends Image implements IWebImage {
    constructor(opts: { url: string; title?: string; alt?: string; proxy?: string | null; client_ref?: GeminiClient | null }) {
        const { url, title = '[Image]', alt = '', proxy = null, client_ref = null } = opts;
        super({ url, title, alt, proxy, client_ref });
    }
}

interface SaveGeneratedImageOptions extends SaveImageOptions {
    fullSize?: boolean;
}

export interface IGeneratedImage extends IImage {
    cid: string;
    rid: string;
    rcid: string;
    image_id: string;
    save(opts?: SaveGeneratedImageOptions): Promise<string>;
}

export class GeneratedImage extends Image implements IGeneratedImage {
    cid: string;
    rid: string;
    rcid: string;
    image_id: string;
    constructor(opts: {
        url: string; title?: string; alt?: string; proxy?: string | null; client_ref?: GeminiClient | null;
        cid?: string; rid?: string; rcid?: string; image_id?: string;
    }) {
        const { url, title = '[Image]', alt = '', proxy = null, client_ref = null, cid = '', rid = '', rcid = '', image_id = '' } = opts;
        super({ url, title, alt, proxy });
        this.client_ref = client_ref;
        this.cid = cid;
        this.rid = rid;
        this.rcid = rcid;
        this.image_id = image_id;
    }

    async _performSave(savePath: string, filename: string, verbose: boolean, fullSize: boolean = true) {
        if (fullSize) {
            if (this.client_ref && this.cid && this.rid && this.rcid && this.image_id) {
                try {
                    const originalUrl = await this.client_ref._getFullSizeImage(
                        this.cid, this.rid, this.rcid, this.image_id,
                    );
                    if (originalUrl) {
                        this.url = originalUrl;
                        return await super._performSave(savePath, filename, verbose);
                    }
                } catch (e: any) {
                    if (verbose) console.debug(`Failed to fetch full size image via RPC: ${e.message}, falling back.`);
                }
            }
            if (this.url.includes('=s1024-rj')) {
                this.url = this.url.replace('=s1024-rj', '=s2048-rj');
            } else if (!this.url.includes('=s2048-rj')) {
                this.url += '=s2048-rj';
            }
        } else {
            if (this.url.includes('=s2048-rj')) {
                this.url = this.url.replace('=s2048-rj', '=s1024-rj');
            } else if (!this.url.includes('=s1024-rj')) {
                this.url += '=s1024-rj';
            }
        }
        return await super._performSave(savePath, filename, verbose);
    }

    async save(opts: SaveGeneratedImageOptions = {}) {
        const { path: savePath = 'temp', verbose = false, fullSize = true } = opts;
        let { filename = null } = opts;
        if (!filename || !path.extname(filename)) {
            const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
            const urlHash = crypto.createHash('sha256').update(this._getUrlForHash()).digest('hex').slice(0, 10);
            const baseName = filename ? path.parse(filename).name : (sanitizeFilename(this.alt) || 'generated_image');
            filename = `${timestamp}_${urlHash}_${baseName}`;
        }
        fs.mkdirSync(savePath, { recursive: true });
        return await this._performSave(savePath, filename, verbose, fullSize);
    }
}


export interface SaveVideoResult {
    video: string;
    video_thumbnail: string | null;
}

export interface SaveMediaResult {
    mp4: [string, string] | null;
    mp4_thumbnail: [string, string | null] | null;
    mp3: [string, string] | null;
    mp3_thumbnail: [string, string | null] | null;
}

export interface SaveVideoOptions {
    path?: string;
    filename?: string | null;
    verbose?: boolean;
}

export interface IVideo {
    url: string;
    title: string;
    proxy: string | null;
    client_ref: GeminiClient | null;
    toString(): string;
}

export class Video implements IVideo {
    url: string;
    title: string;
    proxy: string | null;
    client_ref: GeminiClient | null;
    protected _defaultFilenameSuffix: string;
    constructor(opts: { url: string; title?: string; proxy?: string | null; client_ref?: GeminiClient | null }) {
        const { url, title = '[Video]', proxy = null, client_ref = null } = opts;
        this.url = url;
        this.title = title;
        this.proxy = proxy;
        this.client_ref = client_ref;
        this._defaultFilenameSuffix = 'video';
    }

    _getUrlForHash() { return this.url; }

    toString() { return `Video(title=${this.title}, url=${this.url})`; }

    protected async save(opts: SaveVideoOptions = {}): Promise<SaveVideoResult | SaveMediaResult> {
        const { path: savePath = 'temp', verbose = false } = opts;
        let { filename = null } = opts;
        if (!filename || !path.extname(filename)) {
            const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
            const urlHash = crypto.createHash('sha256').update(this._getUrlForHash()).digest('hex').slice(0, 10);
            const baseName = filename ? path.parse(filename).name : this._defaultFilenameSuffix;
            filename = `${timestamp}_${urlHash}_${baseName}`;
        }
        if (!fs.existsSync(savePath)) fs.mkdirSync(savePath, { recursive: true });
        return await this._performSave(savePath, filename, verbose);
    }

    protected async _performSave(savePath: string, filename: string, verbose: boolean): Promise<SaveVideoResult | SaveMediaResult> {
        const filePath = await this._downloadFile(this.url, savePath, filename, '.mp4', verbose);
        return { video: filePath, video_thumbnail: null };
    }

    async _downloadFile(url: string, savePath: string, filename: string, defaultExt = '.mp4', verbose = false) {
        const proxyConfig = this.proxy ? parseProxy(this.proxy) : undefined;
        const cookies = this.client_ref?.cookies;
        const cookieStr = cookies ? Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ') : '';
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'Origin': 'https://gemini.google.com',
                'Referer': 'https://gemini.google.com/',
                ...(cookieStr && { Cookie: cookieStr }),
            },
            ...(proxyConfig && { proxy: proxyConfig }),
            ...(this.client_ref ? headerLimitConfig(this.client_ref.maxResponseHeaderSize) : {}),
            validateStatus: null,
        });

        if (verbose) console.debug(`HTTP Request: GET ${url} [${res.status}]`);

        if (res.status === 200) {
            let ext = defaultExt;
            const contentType = (res.headers['content-type'] as string || '').split(';')[0].trim().toLowerCase();
            if (contentType.includes('mp4')) ext = '.mp4';
            else if (contentType.includes('mp3') || contentType.includes('mpeg')) ext = '.mp3';
            else if (contentType.includes('jpeg')) ext = '.jpg';
            else if (contentType.includes('png')) ext = '.png';
            else if (contentType.includes('webm')) ext = '.webm';

            if (!path.extname(filename)) filename = filename + ext;
            const dest = path.join(savePath, filename);
            fs.writeFileSync(dest, Buffer.from(res.data));
            if (verbose) console.info(`File saved as ${path.resolve(dest)}`);
            return path.resolve(dest);
        } else if (res.status === 206) {
            return '206';
        } else {
            throw new Error(`Error downloading file: ${res.status}`);
        }
    }
}

export interface IGeneratedVideo extends IVideo {
    thumbnail: string | null;
    cid: string;
    rid: string;
    rcid: string;
    save(opts?: SaveVideoOptions): Promise<SaveVideoResult>;
}

export class GeneratedVideo extends Video implements IGeneratedVideo {
    thumbnail: string | null;
    cid: string;
    rid: string;
    rcid: string;
    constructor(opts: {
        url: string; thumbnail?: string | null; cid?: string; rid?: string; rcid?: string;
        client_ref?: GeminiClient | null; proxy?: string | null;
    }) {
        const { url, thumbnail = null, cid = '', rid = '', rcid = '', client_ref = null, proxy = null } = opts;
        super({ url, title: '[Generated Video]', proxy, client_ref });
        this.thumbnail = thumbnail;
        this.cid = cid;
        this.rid = rid;
        this.rcid = rcid;
        this._defaultFilenameSuffix = 'generated_video';
    }

    public override async save(opts: SaveVideoOptions = {}): Promise<SaveVideoResult> {
        const { path: savePath = 'temp', filename = null, verbose = false } = opts;
        return (await super.save({path: savePath, filename, verbose})) as SaveVideoResult;
    }

    protected async _performSave(savePath: string, filename: string, verbose: boolean): Promise<SaveVideoResult> {
        const videoPath = await this._pollDownload(this.url, savePath, filename, '.mp4', verbose, 'video');
        let thumbPath: string | null = null;
        if (this.thumbnail) {
            thumbPath = await this._downloadThumbnail(this.thumbnail, savePath, filename + '_thumb', verbose, 'thumbnail');
        }
        return { video: videoPath, video_thumbnail: thumbPath };
    }

    async _pollDownload(url: string, savePath: string, filename: string, ext: string, verbose: boolean, key: string) {
        while (true) {
            const filePath = await this._downloadFile(url, savePath, filename, ext, verbose);
            if (filePath === '206') {
                if (verbose) console.info(`Media (${key}) still generating (206), retrying in 10s...`);
                await sleep(10000);
            } else {
                return filePath;
            }
        }
    }

    async _downloadThumbnail(url: string, savePath: string, filename: string, verbose: boolean, key: string) {
        try {
            const filePath = await this._downloadFile(url, savePath, filename, '.jpg', verbose);
            return filePath === '206' ? null : filePath;
        } catch (e: any) {
            if (verbose) console.warn(`Failed to save thumbnail (${key}): ${e.message}`);
            return null;
        }
    }
}

export interface IGeneratedMedia extends Omit<IVideo, 'save'> {
    thumbnail: string | null;
    mp3_url: string;
    mp3_thumbnail: string | null;
    cid: string;
    rid: string;
    rcid: string;
    save(opts?: SaveVideoOptions): Promise<SaveMediaResult>;
    toString(): string;
}

export class GeneratedMedia extends Video implements IGeneratedMedia {
    thumbnail: string | null;
    mp3_url: string;
    mp3_thumbnail: string | null;
    cid: string;
    rid: string;
    rcid: string;
    constructor(opts: {
        url?: string; thumbnail?: string | null; mp3_url?: string; mp3_thumbnail?: string | null;
        cid?: string; rid?: string; rcid?: string; client_ref?: GeminiClient | null; proxy?: string | null;
    } = {}) {
        const { url = '', thumbnail = null, mp3_url = '', mp3_thumbnail = null, cid = '', rid = '', rcid = '', client_ref = null, proxy = null } = opts;
        super({ url, title: '[Generated Media]', proxy });
        this.thumbnail = thumbnail;
        this.mp3_url = mp3_url;
        this.mp3_thumbnail = mp3_thumbnail;
        this.cid = cid;
        this.rid = rid;
        this.rcid = rcid;
        this.client_ref = client_ref;
        this._defaultFilenameSuffix = 'generated_media';
    }

    public override async save(opts: SaveVideoOptions = {}): Promise<SaveMediaResult> {
        const { path: savePath = 'temp', filename = null, verbose = false } = opts;
        return (await super.save({path: savePath, filename, verbose})) as SaveMediaResult;
    }

    protected override async _performSave(savePath: string, filename: string, verbose: boolean): Promise<SaveMediaResult> {
        const tasks = [];
        if (this.url) tasks.push(this._pollDownload(this.url, savePath, filename, '.mp4', verbose, 'mp4'));
        if (this.mp3_url) tasks.push(this._pollDownload(this.mp3_url, savePath, filename, '.mp3', verbose, 'mp3'));

        const results = await Promise.all(tasks);
        const out: { mp4: [string, string] | null, mp3: [string, string] | null, mp4_thumbnail: [string, string | null] | null, mp3_thumbnail: [string, string | null] | null } = { mp4: null, mp3: null, mp4_thumbnail: null, mp3_thumbnail: null };
        let idx = 0;
        if (this.url) out.mp4 = results[idx++];
        if (this.mp3_url) out.mp3 = results[idx++];

        const thumbTasks = [];
        if (this.thumbnail) thumbTasks.push(this._downloadThumbnail(this.thumbnail, savePath, filename + '_mp4_thumb', verbose, 'mp4_thumb'));
        if (this.mp3_thumbnail) thumbTasks.push(this._downloadThumbnail(this.mp3_thumbnail, savePath, filename + '_mp3_thumb', verbose, 'mp3_thumb'));
        const thumbResults = await Promise.all(thumbTasks);
        let ti = 0;
        if (this.thumbnail) out.mp4_thumbnail = thumbResults[ti++];
        if (this.mp3_thumbnail) out.mp3_thumbnail = thumbResults[ti++];

        return out;
    }

    async _pollDownload(url: string, savePath: string, filename: string, ext: string, verbose: boolean, key: string): Promise<[string,string]> {
        while (true) {
            const filePath = await this._downloadFile(url, savePath, filename, ext, verbose);
            if (filePath === '206') {
                if (verbose) console.info(`Media (${key}) still generating (206), retrying in 10s...`);
                await sleep(10000);
            } else {
                return [key, filePath];
            }
        }
    }

    async _downloadThumbnail(url: string, savePath: string, filename: string, verbose: boolean, key: string): Promise<[string,string|null]> {
        try {
            const filePath = await this._downloadFile(url, savePath, filename, '.jpg', verbose);
            return [key, filePath === '206' ? null : filePath];
        } catch (e: any) {
            if (verbose) console.warn(`Failed to save thumbnail (${key}): ${e.message}`);
            return [key, null];
        }
    }

    toString() {
        const urls = [];
        if (this.url) urls.push(`mp4=${this.url}`);
        if (this.mp3_url) urls.push(`mp3=${this.mp3_url}`);
        return `GeneratedMedia(title=${this.title}, urls=${urls.join(', ')})`;
    }
}
