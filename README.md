![Banner](https://napkinsdev.s3.us-east-1.amazonaws.com/next-s3-uploads/2a5843b5-3f5e-4ccd-bd61-f1ba6d6ae267/fb866bbfc5b3.png)

# Gemini-Reverse

An unofficial Node.js client for [Google Gemini](https://gemini.google.com), inspired by [Gemini-API](https://github.com/HanaokaYuzu/Gemini-API) — a Python reverse engineering project by [@HanaokaYuzu](https://github.com/HanaokaYuzu).

## Features

- **Guest Mode** — Works without any Google account or cookies. Supports multi-turn chat sessions in guest mode.
- **Image Generation** — Natively supports generating and editing images with natural language. Supports full-size image fetching.
- **Video Generation** — Generates short videos from text prompts. Automatically polls until the video is ready and returns an authenticated download URL.
- **Audio & Music Generation** — Supports generating audio and music content natively, returning both MP3 and MP4 formats.
- **Deep Research** — Full deep research workflow with plan creation, status polling, and result retrieval.
- **Extended Thinking** — Enables deeper reasoning mode on supported models.
- **System Prompt via Gems** — Supports customizing the model's behavior with [Gemini Gems](https://gemini.google.com/gems/view).
- **Extension Support** — Supports generating content with Gemini extensions such as YouTube and Gmail.
- **Classified Outputs** — Categorizes text, thoughts, images, videos, and audio in the response.
- **Streaming Mode** — Supports stream generation with an incremental stateful frame parser, yielding partial outputs as they are generated.

## Table of Contents

- [Installation](#installation)
- [Authentication](#authentication)
- [Usage](#usage)
  - [Initialization](#initialization)
  - [Guest Mode](#guest-mode)
  - [Generate Content](#generate-content)
  - [One-Shot Prompt](#one-shot-prompt)
  - [Response Object](#response-object)
  - [Generate Content with Files](#generate-content-with-files)
  - [Conversations Across Multiple Turns](#conversations-across-multiple-turns)
  - [Continue Previous Conversations](#continue-previous-conversations)
  - [Read Conversation History](#read-conversation-history)
  - [List Recent Chats](#list-recent-chats)
  - [Delete a Conversation](#delete-a-conversation)
  - [Temporary Mode](#temporary-mode)
  - [Streaming Mode](#streaming-mode)
  - [Extended Thinking](#extended-thinking)
  - [Select Language Model](#select-language-model)
  - [List Available Models](#list-available-models)
  - [Apply System Prompt with Gemini Gems](#apply-system-prompt-with-gemini-gems)
  - [Manage Custom Gems](#manage-custom-gems)
  - [Retrieve Model's Thought Process](#retrieve-models-thought-process)
  - [Images in Response](#images-in-response)
  - [Image Generation](#image-generation)
  - [Video Generation](#video-generation)
  - [Audio & Music Generation](#audio--music-generation)
  - [Generate Content with Gemini Extensions](#generate-content-with-gemini-extensions)
  - [Check and Switch to Other Reply Candidates](#check-and-switch-to-other-reply-candidates)
  - [Deep Research](#deep-research)
- [Error Handling](#error-handling)
- [Project Structure](#project-structure)
- [References](#references)

## Installation

```bash
npm install gemini-web-sdk
```

## Authentication

- Go to [gemini.google.com](https://gemini.google.com) and log in with your Google account
- Press F12 to open DevTools, go to the `Application` tab → `Cookies` → `https://gemini.google.com`
- Copy the value of `__Secure-1PSID`

> If you don't have a Google account or want to test without authentication, see [Guest Mode](#guest-mode).

## Usage

### Initialization

Import the package and initialize a client with your cookies.

```js
const { Gemini } = require('gemini-web-sdk');

const client = new Gemini({
    secure_1psid: 'YOUR_SECURE_1PSID',
    proxy: null,                            // optional, e.g. 'http://host:port'
    timeout: 300000,                        // request timeout in ms, default 300000
    autoClose: false,                       // auto-close client after inactivity
    closeDelay: 300000,                     // inactivity delay before closing in ms
    verbose: false,                         // enable verbose logging
    maxResponseHeaderSize: 65536,           // max response header block size in bytes, default 65536
    endpoints: {},                          // optional endpoint overrides, e.g. { INIT: 'https://...' }
});

await client.init(); // optional — called automatically on first use
```

> `init()` is optional. Every method calls it internally before running. Call it explicitly if you want to catch initialization errors early (e.g. expired cookies) before sending any prompts.

> `autoClose` with a reasonable `closeDelay` is recommended for always-on services (e.g. chatbots) for better resource management.

#### Large response headers (`maxResponseHeaderSize`)

Node.js and Bun parse HTTP responses with **llhttp**, which aborts with `HPE_HEADER_OVERFLOW` (`Parse Error: Header overflow`) when a response's header block exceeds **16384 bytes** (the `--max-http-header-size` default). `gemini.google.com` responses carry a large number of `Set-Cookie` headers, so responses can legitimately cross that limit — especially behind proxies or with large cookie sets. When that happens, every SDK call fails before your code sees a response, and the error is easy to misread as an auth failure.

To prevent this, the SDK raises the per-request response-header limit to **65536 bytes (64KB) by default** via the `maxResponseHeaderSize` option, and applies it to every outbound request (init, google.com pre-flight, batchexecute, generate, upload). Responses whose header block exceeds the configured size raise `HPE_HEADER_OVERFLOW`.

> Environment variables are not a reliable alternative: `NODE_OPTIONS=--max-http-header-size=...` is ignored by Bun, and `BUN_CONFIG_MAX_HTTP_HEADER_SIZE` does not affect Bun's `node:http` layer.

```js
// Lower it back to Node's llhttp default if you want the strict behavior:
const strict = new Gemini({ secure_1psid: 'YOUR_COOKIE', maxResponseHeaderSize: 16384 });
```

The `endpoints` option overrides the hardcoded Google endpoints (mainly useful for testing against a local fixture):

```js
const client = new Gemini({
    secure_1psid: 'YOUR_COOKIE',
    endpoints: {
        GOOGLE: 'http://127.0.0.1:8080',
        INIT: 'http://127.0.0.1:8080/app',
        GENERATE: 'http://127.0.0.1:8080/StreamGenerate',
        UPLOAD: 'http://127.0.0.1:8080/upload',
        BATCH_EXEC: 'http://127.0.0.1:8080/batchexecute',
    },
});
```

### Guest Mode

Guest mode allows you to use Gemini without any Google account or cookies. Multi-turn chat sessions are fully supported in this mode.

```js
const { Gemini } = require('gemini-web-sdk');

const client = new Gemini(); // no credentials needed

const chat = client.newChat();

const r1 = await chat.generateContent({ prompt: 'My name is Rynn.' });
console.log(r1.text);

const r2 = await chat.generateContent({ prompt: 'What is my name?' });
console.log(r2.text); // remembers "Rynn" from the previous turn
```

> Guest mode is limited to the Gemini Flash model. Features like file uploads, deep research, gems, image/video generation, and chat history management require authentication.

### Generate Content

Create a `ChatSession` via `newChat()` and call `generateContent` on it. It returns a `ModelOutput` object.

```js
const { Gemini } = require('gemini-web-sdk');

const client = new Gemini({ secure_1psid: 'YOUR_COOKIE' });
const chat = client.newChat();

const response = await chat.generateContent({ prompt: 'What is the capital of France?' });
console.log(response.text);
```

### One-Shot Prompt

For quick one-shot prompts without creating a `ChatSession`, use `client.ask()`:

```js
const { Gemini, Model } = require('gemini-web-sdk');

const client = new Gemini({ secure_1psid: 'YOUR_COOKIE' });

const response = await client.ask('What is 2 + 2?');
console.log(response.text);

// With options
const response2 = await client.ask('Explain gravity.', {
    model: Model.BASIC_FLASH,
    temporary: true,
});
console.log(response2.text);
```

`ask()` accepts the same options as `newChat()` plus `files` and `extended_thinking`.

### Response Object

Every `generateContent` (and `ask`) call returns a `ModelOutput` object:

```js
{
  // ── Identifiers ────────────────────────
  cid:     'c_abc123',          // conversation ID
  rid:     'r_def456',          // response ID
  rcid:    'rc_xyz789',         // chosen candidate's rcid

  // ── Info ───────────────────────────────
  model:   'gemini-3-flash',    // model used
  gem:     null,                // gem ID if used
  created: 1750123456789,       // timestamp

  // ── Candidates ─────────────────────────
  candidates: [
    {
      index:    0,
      rcid:     'rc_xyz789',
      text:     'Paris is the capital of France.',
      thoughts: null,
      images:   [],
      videos:   [],
      media:    [],
      done:     true,
    },
  ],
}
```

**Convenience getters** (non-enumerable — accessible but hidden from `JSON.stringify`):

| Getter | Shortcut for |
|---|---|
| `.text` | `candidates[chosen].text` |
| `.thoughts` | `candidates[chosen].thoughts` |
| `.images` | `candidates[chosen].images` |
| `.videos` | `candidates[chosen].videos` |
| `.media` | `candidates[chosen].media` |

**Methods:**

| Method | Description |
|---|---|
| `saveAll({ path, verbose })` | Save all images/videos/media from the chosen candidate |
| `toString()` | Returns `candidates[chosen].text` |

All media objects within candidates expose a `.save()` method for downloading files to disk. See the relevant sections below for details.

### Generate Content with Files

Gemini supports file input, including images and documents. Pass an array of file paths alongside your text prompt.

> File upload is not available in guest mode.

```js
const chat = client.newChat();
const response = await chat.generateContent({
    prompt: 'Describe what you see in this image.',
    files: ['./photo.png'],
});
console.log(response.text);
```

Supported file types include images (`jpg`, `png`, `webp`, `gif`), PDFs, and other documents accepted by the Gemini web interface.

### Conversations Across Multiple Turns

Use `newChat()` to create a `ChatSession` object and send messages through it. The conversation history — including `cid`, `rid`, and `rcid` — is handled automatically and updated after each turn.

```js
const { Gemini } = require('gemini-web-sdk');

const client = new Gemini({ secure_1psid: 'YOUR_COOKIE' });
const chat = client.newChat();

const res1 = await chat.generateContent({ prompt: 'My name is Alice.' });
console.log(res1.text);

const res2 = await chat.generateContent({ prompt: 'What is my name?' });
console.log(res2.text); // remembers "Alice"

const res3 = await chat.generateContent({ prompt: 'Tell me a joke.' });
console.log(res3.text);
```

### Continue Previous Conversations

Save the session `metadata` from a `ChatSession` to restore it later — even across process restarts. Useful for persisting conversations in a database or file.

```js
const chat = client.newChat();
await chat.generateContent({ prompt: 'Fine weather today.' });

// Persist the metadata
const savedMetadata = chat.metadata;

// Resume in a new process / session
const previousChat = client.newChat({ metadata: savedMetadata });
const response = await previousChat.generateContent({ prompt: 'What did I say before?' });
console.log(response.text);
```

The `metadata` array contains `[cid, rid, rcid, ...]` which uniquely identifies the conversation turn. Storing and restoring it is enough to resume the exact conversation context.

### Read Conversation History

Fetch the full conversation history of a chat by its `cid`. Returns an array of turn objects with `role` (`'user'` or `'model'`) and `text`.

> Not available in guest mode.

```js
const chat = client.newChat();
await chat.generateContent({ prompt: 'What is the tallest mountain?' });

const history = await client.readChat(chat.cid, 10); // limit to 10 turns
for (const turn of history) {
    console.log(`[${turn.role.toUpperCase()}] ${turn.text}`);
}
```

Each turn also exposes `images`, `videos`, and `media` arrays — useful for reading back previously generated media from history.

### List Recent Chats

Use `chats()` to get a cached list of recent chat sessions fetched at initialization.

> Not available in guest mode (returns an empty array).

```js
const chatList = await client.chats();
for (const info of chatList) {
    console.log(`[${info.cid}] ${info.title} — pinned: ${info.pinned}`);
}
```

### Delete a Conversation

Delete a specific chat from Gemini's server-side history.

> Not available in guest mode.

```js
const chat = client.newChat();
await chat.generateContent({ prompt: 'This is a temporary conversation.' });

await client.deleteChat(chat.cid);
// or: await chat.delete();
```

### Temporary Mode

Pass `temporary: true` when creating a `ChatSession` to prevent the conversation from being saved to Gemini history.

```js
const chat = client.newChat({ temporary: true });

const res1 = await chat.generateContent({ prompt: 'Hello!' });
console.log(res1.text);

const res2 = await chat.generateContent({ prompt: 'What did I say?' });
console.log(res2.text); // still remembers within the same session
```

### Streaming Mode

For longer responses, use `generateContentStream` to receive partial `ModelOutput` chunks as they are generated. Each chunk contains `candidates` with `text_delta` and a `done` flag.

```js
const chat = client.newChat();
for await (const chunk of chat.generateContentStream({ prompt: 'Explain quantum entanglement.' })) {
    process.stdout.write(chunk.text_delta);
    if (chunk.done) console.log('\n[done]');
}
```

Each stream chunk has the same shape as a regular response, but with delta fields:

```js
{
  cid:   'c_abc123',
  rid:   'r_def456',
  model: 'gemini-3-flash',
  done:  false,              // true on last chunk
  candidates: [
    {
      index:          0,
      text_delta:     'Par',
      thoughts_delta: null,
      done:           false,
    },
  ],
}
```

After the stream ends, access the full final output via `chat.lastOutput`.

### Extended Thinking

Pass `extended_thinking: true` to enable deeper reasoning mode. The model spends more time planning before responding. Supported on Pro and Advanced tier models.

```js
const { Gemini, Model } = require('gemini-web-sdk');

const chat = client.newChat({ model: Model.ADVANCED_PRO });
const response = await chat.generateContent({
    prompt: 'Solve step by step: If a train travels at 120 km/h and needs to cover 450 km, how long does it take?',
    extended_thinking: true,
});

if (response.thoughts) {
    console.log('Thinking process:', response.thoughts);
}
console.log('Answer:', response.text);
```

### Select Language Model

Specify which language model to use when creating a `ChatSession`. Available models are discovered dynamically at init time based on your account tier.

```js
const { Gemini, Model } = require('gemini-web-sdk');

// Using a built-in constant
const chat1 = client.newChat({ model: Model.BASIC_FLASH });

// Using a model name string (case-insensitive)
const chat2 = client.newChat({ model: 'gemini-3-pro' });

// Using a custom model header object
const chat3 = client.newChat({
    model: {
        model_name: 'custom',
        model_header: {
            'x-goog-ext-525001261-jspb': '[1,null,null,null,"MODEL_ID",null,null,0,[4,6],null,null,1,null,null,1]',
            'x-goog-ext-73010989-jspb': '[0]',
            'x-goog-ext-73010990-jspb': '[0,0,0]',
        },
    },
});
```

**Built-in model constants:**

| Constant | `model_name` | Tier |
|---|---|---|
| `Model.UNSPECIFIED` | `unspecified` | Any (Gemini chooses) |
| `Model.BASIC_PRO` | `gemini-3-pro` | Free |
| `Model.BASIC_FLASH` | `gemini-3-flash` | Free, fastest |
| `Model.BASIC_LITE` | `gemini-3-lite` | Free, lightweight |
| `Model.PLUS_PRO` | `gemini-3-pro-plus` | Plus |
| `Model.PLUS_FLASH` | `gemini-3-flash-plus` | Plus |
| `Model.PLUS_LITE` | `gemini-3-lite-plus` | Plus |
| `Model.ADVANCED_PRO` | `gemini-3-pro-advanced` | Advanced |
| `Model.ADVANCED_FLASH` | `gemini-3-flash-advanced` | Advanced |
| `Model.ADVANCED_LITE` | `gemini-3-lite-advanced` | Advanced |

### List Available Models

After initialization, the client dynamically discovers which models your account can access. Use `models()` to inspect them.

```js
const modelList = await client.models();
for (const model of modelList) {
    console.log(`${model.model_id} → ${model.model_name} (${model.display_name})`);
    console.log(`  capacity: ${model.capacity}, available: ${model.is_available}`);
}
```

### Apply System Prompt with Gemini Gems

System prompts can be applied via [Gemini Gems](https://gemini.google.com/gems/view). Pass the `gem` argument to `newChat()` — it can be a gem object or a gem ID string.

> Not available in guest mode.

```js
const gemList = await client.gems();
const codingGem = gemList.find(g => g.name === 'Coding partner');

const chat = client.newChat({ gem: codingGem });
const response = await chat.generateContent({ prompt: 'Help me write a binary search in JavaScript.' });
console.log(response.text);
```

### Manage Custom Gems

You can create, update, and delete custom gems programmatically. Predefined system gems cannot be modified.

> Not available in guest mode.

#### Create a Custom Gem

```js
const newGem = await client.addGem({
    name: 'Python Tutor',
    prompt: 'You are a helpful Python programming tutor. Always provide runnable code examples.',
    description: 'A specialized gem for Python programming',
});

console.log(`Created: ${newGem.id}`);
```

#### Update an Existing Gem

> When updating a gem, all parameters (`name`, `prompt`, `description`) must be provided even if only one is changing.

```js
const updatedGem = await client.setGem({
    gem: newGem, // or a gem ID string
    name: 'Advanced Python Tutor',
    prompt: 'You are an expert Python tutor. Focus on performance and best practices.',
    description: 'An advanced Python programming assistant',
});
```

#### Delete a Custom Gem

```js
await client.delGem(newGem); // or pass a gem ID string
```

### Retrieve Model's Thought Process

When using thinking-capable models, the model's internal reasoning is exposed via `response.thoughts`.

```js
const { Gemini, Model } = require('gemini-web-sdk');

const client = new Gemini({ secure_1psid: 'YOUR_COOKIE' });
const chat = client.newChat({ model: Model.BASIC_FLASH });
const response = await chat.generateContent({ prompt: 'What is 17 × 23?' });

if (response.thoughts) {
    console.log('Thoughts:', response.thoughts);
}
console.log('Answer:', response.text);
```

### Images in Response

When Gemini returns web images (e.g. when you ask it to "show me pictures"), they are available in `response.images` as `WebImage` objects.

```js
const chat = client.newChat();
const response = await chat.generateContent({ prompt: 'Show me pictures of cats.' });

for (const image of response.images) {
    console.log(`URL: ${image.url}`);
    console.log(`Alt: ${image.alt}`);
}
```

**`WebImage` properties:**

| Property | Type | Description |
|---|---|---|
| `url` | `string` | Direct image URL |
| `title` | `string` | Title (e.g. `[Image 1]`) |
| `alt` | `string` | Alt text |

### Image Generation

Ask Gemini to generate or edit images using natural language. Generated images are returned as `GeneratedImage` objects with a `.save()` method.

> Image generation availability varies by region and account type. Users under 18 cannot use this feature.

```js
const chat = client.newChat();
const response = await chat.generateContent({
    prompt: 'Generate a photo-realistic image of a cat astronaut floating in space.',
});

for (const image of response.images) {
    const savedPath = await image.save({
        path: './output',
        verbose: true,
    });
    console.log('Saved to:', savedPath);
}
```

**`GeneratedImage` properties:**

| Property | Type | Description |
|---|---|---|
| `url` | `string` | Image URL (may require auth cookies for full size) |
| `alt` | `string` | Alt text / description |
| `cid`, `rid`, `rcid` | `string` | Conversation IDs for full-size fetching |
| `image_id` | `string` | Internal image ID |

**`GeneratedImage.save()` options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `path` | `string` | `'temp'` | Directory to save the image |
| `filename` | `string \| null` | `null` | Custom filename (auto-generated if omitted) |
| `verbose` | `boolean` | `false` | Log download progress |
| `fullSize` | `boolean` | `true` | Attempt to fetch the highest resolution version |

When asking Gemini to "send" images, it returns web images from the web. When asking to "generate" images, it returns AI-generated `GeneratedImage` objects. Both are combined in `response.images`.

> When `alt` text is available, it is used as the default filename (sanitized). Otherwise falls back to `'generated_image'`.

**Save all media at once:**

```js
const saved = await response.saveAll({ path: './output', verbose: true });
// { images: ['./output/...jpg'], videos: [...], media: [...] }
```

**Edit an existing image:**

```js
const res1 = await chat.generateContent({
    prompt: 'Generate an image of a sunset over the ocean.',
});

// Follow up in the same chat session to edit
const res2 = await chat.generateContent({
    prompt: 'Now add a sailboat in the foreground.',
});

for (const image of res2.images) {
    await image.save({ path: './output', verbose: true });
}
```

### Video Generation

Gemini can generate short videos from a text description. Video generation is asynchronous — Gemini returns a task ID and the client automatically polls `READ_CHAT` in the background until the video is ready, then returns a `GeneratedVideo` object with an authenticated download URL.

> Video generation requires a Gemini Advanced subscription. Generation may take several minutes. The client respects your configured `timeout` during polling.

```js
const chat = client.newChat();
const response = await chat.generateContent({
    prompt: 'Generate a short video of a sunset over the ocean with waves.',
});

for (const video of response.videos) {
    console.log('Video URL:', video.url);
    console.log('Thumbnail:', video.thumbnail);

    const result = await video.save({
        savePath: './output',
        verbose: true,
    });

    console.log('Saved video:', result.video);
    console.log('Saved thumbnail:', result.video_thumbnail);
}
```

**`GeneratedVideo` properties:**

| Property | Type | Description |
|---|---|---|
| `url` | `string` | Authenticated download URL (`contribution.usercontent.google.com`) |
| `thumbnail` | `string \| null` | Thumbnail image URL |
| `cid`, `rid`, `rcid` | `string` | Conversation IDs |

**`GeneratedVideo.save()` options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `savePath` | `string` | `'temp'` | Directory to save the video |
| `filename` | `string \| null` | `null` | Custom base filename (auto-generated if omitted) |
| `verbose` | `boolean` | `false` | Log download progress |

**Returns:** `{ video: string, video_thumbnail: string | null }` — absolute paths to the saved files.

> The video download URL requires authentication cookies. The client handles this automatically. If the URL returns HTTP 206, the video is still processing — `save()` will keep retrying every 10 seconds automatically.

### Audio & Music Generation

Gemini can generate audio and music from text prompts. Audio responses are returned as `GeneratedMedia` objects containing both MP3 and MP4 versions.

> Audio generation availability depends on your account and region.

```js
const chat = client.newChat();
const response = await chat.generateContent({
    prompt: 'Compose a short upbeat piano melody, 15 seconds long.',
});

for (const media of response.media) {
    console.log('MP3 URL:', media.mp3_url);
    console.log('MP4 URL:', media.url);

    const result = await media.save({
        savePath: './output',
        verbose: true,
    });

    console.log('MP4 saved:', result.mp4);
    console.log('MP3 saved:', result.mp3);
}
```

**`GeneratedMedia` properties:**

| Property | Type | Description |
|---|---|---|
| `url` | `string` | MP4 video URL |
| `thumbnail` | `string \| null` | MP4 thumbnail URL |
| `mp3_url` | `string` | MP3 audio URL |
| `mp3_thumbnail` | `string \| null` | MP3 thumbnail URL |
| `cid`, `rid`, `rcid` | `string` | Conversation IDs |

**`GeneratedMedia.save()` options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `savePath` | `string` | `'temp'` | Directory to save the files |
| `filename` | `string \| null` | `null` | Custom base filename (auto-generated if omitted) |
| `verbose` | `boolean` | `false` | Log download progress |

**Returns:** `{ mp4: string | null, mp3: string | null, mp4_thumbnail: string | null, mp3_thumbnail: string | null }`.

> Like video, if a media file returns HTTP 206 (still processing), `save()` retries automatically every 10 seconds until the file is available.

### Generate Content with Gemini Extensions

To use Gemini extensions (Gmail, YouTube, etc.), you must first activate them on the [Gemini website](https://gemini.google.com/extensions). Reference them in prompts with the `@` prefix or in natural language.

> You must have Gemini Apps Activity enabled in your account to use extensions.

```js
const chat = client.newChat();

const gmailResponse = await chat.generateContent({
    prompt: "@Gmail What's the latest message in my inbox?",
});
console.log(gmailResponse.text);

const youtubeResponse = await chat.generateContent({
    prompt: "@YouTube What's the latest video from Fireship?",
});
console.log(youtubeResponse.text);
```

### Check and Switch to Other Reply Candidates

A Gemini response may contain multiple reply candidates. Use `chooseCandidate(index)` to switch to a different one before the next turn.

```js
const chat = client.newChat();
const response = await chat.generateContent({ prompt: 'Recommend a sci-fi book.' });

// Access all candidates directly
response.candidates.forEach((c, i) => {
    console.log(`[${i}] ${c.text.slice(0, 80)}...`);
});

// Switch to the second candidate
if (response.candidates.length > 1) {
    chat.chooseCandidate(1);
}

const followup = await chat.generateContent({ prompt: 'Tell me more about it.' });
console.log(followup.text);
```

### Deep Research

Gemini's deep research feature is an autonomous agent that browses the web, analyzes sources, and produces a comprehensive report.

> Deep research requires an active Gemini Advanced subscription.

**Quick one-call method:**

```js
const result = await client.research(
    'Compare the top 3 cloud providers and their AI offerings',
    {
        wait: true,
        pollInterval: 10000,
        timeout: 600000,
        onStatus: (status) => console.log(`Status: ${status.state}`),
    }
);

console.log(result.text);
```

**Step-by-step workflow** for more control:

```js
// Step 1: Create a research plan
const chat = client.newChat();
const plan = await client._createDeepResearchPlan(
    'What are the latest advancements in quantum computing?',
    chat
);

console.log(`Title: ${plan.title}`);
console.log(`ETA: ${plan.eta_text}`);

// Step 2: Start the research
await client._startDeepResearch(plan, chat);

// Step 3: Poll for completion
const result = await client._waitDeepResearch(
    plan,
    10000,   // poll interval in ms
    600000,  // timeout in ms
    (status) => console.log(`[${status.state}] ${status.notes?.[0] || ''}`)
);

console.log(result.text);
```

## Error Handling

```js
const {
    AuthError,
    APIError,
    GeminiError,
    UsageLimitExceeded,
    ModelInvalid,
    TemporarilyBlocked,
} = require('gemini-web-sdk');

try {
    const response = await chat.generateContent({ prompt: 'Hello!' });
    console.log(response.text);
} catch (e) {
    if (e instanceof AuthError) {
        console.error('Cookie expired or invalid. Please refresh your cookies.');
    } else if (e instanceof UsageLimitExceeded) {
        console.error('Usage limit reached. Try again later or switch to a different model.');
    } else if (e instanceof TemporarilyBlocked) {
        console.error('IP temporarily blocked by Google. Try using a proxy or wait a while.');
    } else if (e instanceof ModelInvalid) {
        console.error('Invalid or unavailable model. Try a different model.');
    } else if (e instanceof APIError) {
        console.error('API error:', e.message);
    } else {
        throw e;
    }
}
```

**Error class hierarchy:**

```
Error
├── AuthError
├── APIError
└── GeminiError
    ├── UsageLimitExceeded
    ├── ModelInvalid
    └── TemporarilyBlocked
```

## Project Structure

```
gemini-reverse/
├── index.js                # entry point & exports
├── src/
│   ├── gemini.js           # Gemini client (main class)
│   ├── chat.js             # ChatSession class
│   ├── constants.js        # Endpoint, GRPC, Headers, Model, ErrorCode
│   ├── errors.js           # custom error classes
│   ├── types/
│   │   ├── model.js        # AvailableModel, RPCData
│   │   ├── output.js       # ModelOutput, Candidate
│   │   ├── media.js        # WebImage, GeneratedImage, GeneratedVideo, GeneratedMedia
│   │   ├── gem.js          # Gem, GemJar
│   │   ├── chat.js         # ChatTurn, ChatHistory, ChatInfo
│   │   └── research.js     # DeepResearchPlan, DeepResearchStatus, DeepResearchResult
│   └── utils/
│       ├── auth.js         # cookie handling & access token
│       ├── parser.js       # response parsing + StreamingFrameParser
│       ├── research.js     # deep research payload extractors
│       └── upload.js       # file upload helpers
```

## References

[Google AI Studio](https://ai.google.dev/tutorials/ai-studio_quickstart)

[Gemini-API (Python)](https://github.com/HanaokaYuzu/Gemini-API) by [@HanaokaYuzu](https://github.com/HanaokaYuzu)

[acheong08/Bard](https://github.com/acheong08/Bard)

[enable-guest-mode](https://github.com/luuquangvu/Gemini-API/tree/enable-guest-mode) by [@luuquangvu](https://github.com/luuquangvu) — the Pull Request this project is based on.

---

## Acknowledgments

This package is a community continuation of the original [gemini-reverse](https://github.com/rynn-k/Gemini-Reverse) project by **[@rynn-k](https://github.com/rynn-k)**. We thank the original developer for the foundational work reverse-engineering the Gemini web API — this library would not exist without their effort. We wish them well and hope this fork provides the continued development and responsiveness the community needs.

This project is independently maintained by **Expert Vision Software** and is not affiliated with or endorsed by Google.

---

**Disclaimer:** This is an unofficial package and is not affiliated with or endorsed by Google. Cookie-based authentication may break if Google changes its internal API. Use at your own risk.

**License:** [MIT](LICENSE)
