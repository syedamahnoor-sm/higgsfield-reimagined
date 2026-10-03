# Ember Studio

Ember Studio reimagines the Higgsfield creative-AI experience. It was built for the 8x Software Engineer take-home.

The central product decision:

> **Start with what the creator wants to make, not which AI model they understand.**

Higgsfield exposes a large catalogue of models and tools. Ember does not reproduce that navigation. It organises creation around the creator's workflow instead:

**Discover → Create → Refine → Organize → Reuse**

There are four destinations: **Create** (Image, Video, Audio), **Explore**, **Projects** and **Library**. Templates, Looks, Elements, Enhance and the Board are capabilities inside those workflows, not separate destinations.

## Features

**Discover**
- **Explore**: a masonry gallery of example work with categories. **Remix** loads any example's prompt and settings into Create.

**Create: Image**
- **Real AI image generation**: aspect ratio, 1/2/4 images, and Advanced settings for quality (output size) and a fixed seed.
- **Prompt Enhance**: an AI text model rewrites a short idea into a richer prompt. The result stays editable and can be reverted.
- **Templates**: starting points that fill in the prompt, direction, look and aspect ratio.
- **Creative Directions** (Cinematic, Editorial, Portrait, Product, Illustration) and **Looks** (Film Grain, Noir, Neon Night…). They are applied as guidance on the server and never rewrite the visible prompt.
- **Reference images**: uploads, Elements, earlier results or favourites, sent to the model as a real conditioning image.
- **Edit with Prompt**: a real AI edit of a result from a written instruction.
- **Regenerate, Variations and versions**: each follow-up becomes a new version in the same generation set. Earlier versions are kept.
- **Elements**: save a result or upload as a named, reusable visual reference (character, product, object).

**Create: Video**
- **Real AI image-to-video** from any image, with camera presets (Push In, Pull Back, Pan, Orbit, Static…) and a choice of duration and resolution.
- **Motion Preview**: a lightweight camera move over the image, rendered in the browser. It is clearly labelled as *not* AI video and is offered when AI video is unavailable.

**Create: Audio**
- **Voice Studio**: script editor, English and Spanish voice models, a searchable voice browser, Advanced output format (MP3 or WAV, and bit rate or sample rate), and real-waveform playback.
  - Regenerate makes new takes.
  - Every take is saved to the Library.
- **Transcription**: upload an audio file to get a transcript with real segment timestamps. Copy it, download it as `.txt`, or save it to a project Board as a note.

**Organize and trace**
- **Projects**: one creative idea or campaign. A project holds references to existing media (never copies). It has Quick Create, a cover, and rename and delete with Undo.
  - Work created from inside a project joins it automatically.
- **Creative Board**: a lightweight visual board of a project's images, videos, voices, Elements and text notes. Reorder by dragging, or from each tile's menu.
- **Creative lineage**: "Created from" and "Derived work" on every asset (e.g. Original → AI edit → Animated → Voiceover), built only from relationships that are actually stored. Every step can be opened.
- **Video → Create voiceover**: opens Voice linked to the clip and its project.

**Reuse**
- **Library**: all your work with filters (All, Images, Videos, Audio, Favorites, Elements) and newest or oldest sorting.
  - Instant local search across prompts, edit instructions, voice scripts, Element names, project names, directions and looks.
- **Command palette**: Ctrl+K / ⌘K, plus a visible button. Jump to any workspace, project or recent asset.
- **Responsive**: the rail and workspaces on desktop; bottom navigation, sheets and touch-friendly menus on mobile.

## AI providers

All provider calls go through server-only API routes. The browser never sees credentials.

| Capability | Provider |
| --- | --- |
| Image generation, reference conditioning, Edit with Prompt | Cloudflare Workers AI (FLUX.2 Klein) |
| Prompt Enhance | Cloudflare Workers AI (Llama 3.1 8B Instruct) |
| Voice (text-to-speech) | Cloudflare Workers AI (Deepgram Aura-2, English and Spanish) |
| Transcription | Cloudflare Workers AI (Whisper Large v3 Turbo) |
| Image-to-video | Eternal AI (Wan 2.2 image-to-video) |
| Motion Preview | None: rendered in the browser, not AI |

## Architecture

- **Next.js App Router** with **TypeScript**, **Tailwind CSS v4** design tokens, **Zustand** state and **Motion (Framer Motion)** animation, respecting reduced-motion preferences.
- **Server-only provider modules** (`src/lib/server/*`, marked `server-only`) behind API routes in `src/app/api/*`.
  - Routes validate input, rate-limit, and return only safe failure categories, never provider responses.
- **A single generation engine seam** (`src/lib/generation`). The UI talks to one interface whether the result comes from AI image, AI video or Motion Preview.
- **Browser-local persistence**:
  - Generated images, videos, audio and uploads are stored as blobs in **IndexedDB** and referenced by stable `local-media:` URLs, because provider URLs expire.
  - Library, Projects, Elements and drafts are kept in persisted Zustand stores (localStorage). The working session is kept in sessionStorage.

Why browser-local: it delivers a complete creator workflow (create, refine, organise, reuse) without authentication or database infrastructure, which is unrelated to the core product problem this take-home explores.

## Running locally

Requires Node.js 20.9+.

```bash
npm install
npm run dev        # http://localhost:3000
```

Create `.env.local` (ignored by Git) with these variable names:

```
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_AI_TOKEN=
ETERNAL_AI_API_KEY=
```

The app still runs without them:
- Image results fall back to a clearly labelled local preview.
- Video offers Motion Preview.
- Enhance and Audio report that they are unavailable.

Other scripts: `npm run lint`, `npm run typecheck`, `npm run build`, `npm start`.

## Product decisions and trade-offs

- **Intent-first, not model-first.** Creators choose a direction, a look and a quality; Ember chooses the model. Model names appear only quietly in asset details.
- **Media first.** Layout priority runs from the creative work, to the primary action, to the prompt, to secondary controls, to navigation.
- **Continuity.** Projects and lineage keep a creative direction together and show where every piece came from.
- **Elements are reusable visual references**, not trained LoRAs or custom models.
- **Honest failures.** Provider failures never pass as successful AI output.
  - Local previews and Motion Preview are always labelled.
  - Edits refuse rather than fake a result.
  - Usage-limit errors keep the creator's work and offer a manual retry.
- **Out of scope by design:** authentication, payments and collaboration. They sit outside the core product problem of the take-home.

## Known limitations

- Projects and the Library are browser-local. They don't sync across devices, and clearing site storage removes generated media.
- Voiceovers are linked to their video and project but not muxed into the MP4.
- The Board is a lightweight ordered board, not a full canvas editor. Drag-to-reorder uses a pointer; on touch, use the tile menu.
- Transcription uploads are limited to 4 MB.

## Development notes

- Development was done with **Claude Code**. The prompt and response logs required by the assessment are captured automatically in [`.agent-logs/`](.agent-logs/). The capture setup is described in `CAPTURE-TEST.md`.
- History is incremental, one commit per stage.
- Voice and Transcription are fully implemented, and their browser tests pass with mocked provider responses. Live verification could not be completed in the final session because the Cloudflare account's daily Workers AI allowance had been used up. The app handles that state gracefully.
