'use strict';

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseProxy } = require('../utils/auth');
const { headerLimitConfig } = require('../utils/request');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function sanitizeFilename(str, maxLen = 50) {
    if (!str) return '';
    return str.replace(/[^a-zA-Z0-9\s_-]/g, '').replace(/\s+/g, '_').slice(0, maxLen).replace(/_+$/, '');
}

class Image {
    constructor({ url, title = '[Image]', alt = '', proxy = null, client_ref = null } = {}) {
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

    async save({ path: savePath = 'temp', filename = null, verbose = false } = {}) {
        if (!filename || !path.extname(filename)) {
            const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
            const urlHash = crypto.createHash('sha256').update(this._getUrlForHash()).digest('hex').slice(0, 10);
            const baseName = filename ? path.parse(filename).name : (sanitizeFilename(this.alt) || 'image');
            filename = `${timestamp}_${urlHash}_${baseName}`;
        }
        fs.mkdirSync(savePath, { recursive: true });
        return await this._performSave(savePath, filename, verbose);
    }

    async _performSave(savePath, filename, verbose) {
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

        const contentType = (res.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
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

class WebImage extends Image {
    constructor({ url, title = '[Image]', alt = '', proxy = null, client_ref = null } = {}) {
        super({ url, title, alt, proxy, client_ref });
    }
}

class GeneratedImage extends Image {
    constructor({ url, title = '[Image]', alt = '', proxy = null, client_ref = null, cid = '', rid = '', rcid = '', image_id = '' } = {}) {
        super({ url, title, alt, proxy });
        this.client_ref = client_ref;
        this.cid = cid;
        this.rid = rid;
        this.rcid = rcid;
        this.image_id = image_id;
    }

    async _performSave(savePath, filename, verbose, fullSize = true) {
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
                } catch (e) {
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

    async save({ path: savePath = 'temp', filename = null, verbose = false, fullSize = true } = {}) {
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

class Video {
    constructor({ url, title = '[Video]', proxy = null, client_ref = null } = {}) {
        this.url = url;
        this.title = title;
        this.proxy = proxy;
        this.client_ref = client_ref;
        this._defaultFilenameSuffix = 'video';
    }

    _getUrlForHash() { return this.url; }

    toString() { return `Video(title=${this.title}, url=${this.url})`; }

    async save({ savePath = 'temp', filename = null, verbose = false } = {}) {
        if (!filename || !path.extname(filename)) {
            const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
            const urlHash = crypto.createHash('sha256').update(this._getUrlForHash()).digest('hex').slice(0, 10);
            const baseName = filename ? path.parse(filename).name : this._defaultFilenameSuffix;
            filename = `${timestamp}_${urlHash}_${baseName}`;
        }
        if (!fs.existsSync(savePath)) fs.mkdirSync(savePath, { recursive: true });
        return await this._performSave(savePath, filename, verbose);
    }

    async _performSave(savePath, filename, verbose) {
        const filePath = await this._downloadFile(this.url, savePath, filename, '.mp4', verbose);
        return { video: filePath, video_thumbnail: null };
    }

    async _downloadFile(url, savePath, filename, defaultExt = '.mp4', verbose = false) {
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
            const contentType = (res.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
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

class GeneratedVideo extends Video {
    constructor({ url, thumbnail = null, cid = '', rid = '', rcid = '', client_ref = null, proxy = null } = {}) {
        super({ url, title: '[Generated Video]', proxy, client_ref });
        this.thumbnail = thumbnail;
        this.cid = cid;
        this.rid = rid;
        this.rcid = rcid;
        this._defaultFilenameSuffix = 'generated_video';
    }

    async _performSave(savePath, filename, verbose) {
        const videoPath = await this._pollDownload(this.url, savePath, filename, '.mp4', verbose, 'video');
        let thumbPath = null;
        if (this.thumbnail) {
            thumbPath = await this._downloadThumbnail(this.thumbnail, savePath, filename + '_thumb', verbose, 'thumbnail');
        }
        return { video: videoPath, video_thumbnail: thumbPath };
    }

    async _pollDownload(url, savePath, filename, ext, verbose, key) {
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

    async _downloadThumbnail(url, savePath, filename, verbose, key) {
        try {
            const filePath = await this._downloadFile(url, savePath, filename, '.jpg', verbose);
            return filePath === '206' ? null : filePath;
        } catch (e) {
            if (verbose) console.warn(`Failed to save thumbnail (${key}): ${e.message}`);
            return null;
        }
    }
}

class GeneratedMedia extends Video {
    constructor({ url = '', thumbnail = null, mp3_url = '', mp3_thumbnail = null, cid = '', rid = '', rcid = '', client_ref = null, proxy = null } = {}) {
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

    async _performSave(savePath, filename, verbose) {
        const tasks = [];
        if (this.url) tasks.push(this._pollDownload(this.url, savePath, filename, '.mp4', verbose, 'mp4'));
        if (this.mp3_url) tasks.push(this._pollDownload(this.mp3_url, savePath, filename, '.mp3', verbose, 'mp3'));

        const results = await Promise.all(tasks);
        const out = { mp4: null, mp3: null, mp4_thumbnail: null, mp3_thumbnail: null };
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

    async _pollDownload(url, savePath, filename, ext, verbose, key) {
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

    async _downloadThumbnail(url, savePath, filename, verbose, key) {
        try {
            const filePath = await this._downloadFile(url, savePath, filename, '.jpg', verbose);
            return [key, filePath === '206' ? null : filePath];
        } catch (e) {
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

module.exports = { Image, WebImage, GeneratedImage, Video, GeneratedVideo, GeneratedMedia };
