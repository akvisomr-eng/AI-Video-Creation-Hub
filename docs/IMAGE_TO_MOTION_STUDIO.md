# Image-to-Motion Studio

The `/video-studio` route adds a local-first image animation workflow.

## Current capabilities
- Upload a browser-supported image up to 25 MB.
- Preview slow push-in, reveal/zoom-out, horizontal pan, and cinematic drift.
- Select landscape (16:9), portrait (9:16), or square (1:1) output.
- Export a real WebM clip using Canvas capture and MediaRecorder where supported.
- The source image is processed in the browser and is not uploaded by this feature.

## Explicit limitations
This is a deterministic camera-motion effect, not generative image-to-video. It does not synthesize new subject movement, interpolate AI frames, create audio, or export MP4. Browser codec support varies. AI image-to-video requires a provider adapter, secure server-side credentials, asynchronous job handling, private output storage, usage/cost limits, and end-to-end validation before being marked operational.

## Next planned increments
1. Add multi-clip timeline and trim/split controls.
2. Add generated clip ingestion and audio/subtitle tracks.
3. Introduce provider adapters for true image-to-video generation behind a provider-neutral job interface.
4. Add render queue, cancellation, retry policy, and transparent cost/credit estimates.
