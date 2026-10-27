/**
 * AI Video Creation Hub media-director layer.
 *
 * Original implementation inspired by the workflow concepts in
 * Hao0321/ai-media-generator (MIT). This file is newly written for this app;
 * see docs/THIRD_PARTY_NOTICES.md and LICENSES/ai-media-generator-MIT.txt.
 */

export const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:5", "2.39:1"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const TARGET_PLATFORMS = [
  "auto",
  "google-veo",
  "kling",
  "runway",
  "seedance",
  "flux",
  "midjourney",
  "stable-diffusion",
] as const;
export type TargetPlatform = (typeof TARGET_PLATFORMS)[number];

export const CREATIVE_PRESETS = [
  "auto",
  "cinematic",
  "commercial",
  "anime",
  "documentary",
  "product-hero",
  "music-video",
  "social-reel",
] as const;
export type CreativePreset = (typeof CREATIVE_PRESETS)[number];

const PRESET_GUIDANCE: Record<CreativePreset, string> = {
  auto: "Choose a visual language that best serves the brief; avoid generic filler adjectives.",
  cinematic: "Use intentional shot size, lens and camera movement, motivated light, coherent color grade, atmospheric depth, and a clear visual focal point.",
  commercial: "Use a clear product or message hierarchy, deliberate negative space, controlled reflections, polished lighting, readable composition, and brand-safe details.",
  anime: "Use coherent anime art direction, expressive silhouettes, layered painted environments, intentional color design, and consistent character traits.",
  documentary: "Favor naturalistic available light, credible locations, observational framing, restrained grading, and believable human movement.",
  "product-hero": "Keep product geometry, materials, logos and proportions consistent; use controlled studio reflections, macro detail, and a clean hero composition.",
  "music-video": "Design shots around rhythm, movement, visual motifs, transitions, color progression, and a distinct performance or narrative hook.",
  "social-reel": "Establish the subject immediately, use strong mobile-first framing, clear action, a visual change every few seconds, and a memorable final frame.",
};

const PLATFORM_GUIDANCE: Record<TargetPlatform, string> = {
  auto: "Select a target-model-neutral prompt; avoid platform-specific syntax unless the target is explicitly chosen.",
  "google-veo": "Prioritize clear temporal action, grounded scene physics, camera direction, and separate dialogue, sound effects, and soundtrack instructions when audio is needed.",
  kling: "Keep the main subject and action unambiguous, use one primary camera movement, and limit competing subjects and simultaneous actions.",
  runway: "Prefer concise, concrete descriptions with one dominant action and a clear camera instruction.",
  seedance: "Use concrete visual nouns, a clear action per shot, explicit continuity anchors, and a concise constraints tail for unwanted motion or deformation.",
  flux: "Use natural-language photography descriptions with subject, environment, lighting, composition, material detail, and color; avoid unsupported flag syntax.",
  midjourney: "Describe subject, composition, lighting, palette, material and style clearly; platform parameters should be added only by a future provider adapter.",
  "stable-diffusion": "Describe subject, setting, composition, lighting and style explicitly; keep negative constraints separate from the positive prompt.",
};

export function normalizeCreativeOptions(input: {
  aspectRatio?: unknown;
  targetPlatform?: unknown;
  creativePreset?: unknown;
}) {
  const aspectRatio = typeof input.aspectRatio === "string" && ASPECT_RATIOS.includes(input.aspectRatio as AspectRatio)
    ? input.aspectRatio as AspectRatio : "16:9";
  const targetPlatform = typeof input.targetPlatform === "string" && TARGET_PLATFORMS.includes(input.targetPlatform as TargetPlatform)
    ? input.targetPlatform as TargetPlatform : "auto";
  const creativePreset = typeof input.creativePreset === "string" && CREATIVE_PRESETS.includes(input.creativePreset as CreativePreset)
    ? input.creativePreset as CreativePreset : "cinematic";
  return { aspectRatio, targetPlatform, creativePreset };
}

export function recommendPlatform(brief: string, preset: CreativePreset): TargetPlatform {
  const text = brief.toLowerCase();
  if (preset === "music-video" || /music video|mv|video klip|lagu|soundtrack|musik/.test(text)) return "kling";
  if (preset === "anime" || /anime|animasi|kartun/.test(text)) return "kling";
  if (preset === "product-hero" || /produk|product|packaging|kemasan|iklan produk/.test(text)) return "flux";
  if (/dialogue|dialog|percakapan|berbicara|sound effects|efek suara/.test(text)) return "google-veo";
  if (preset === "social-reel") return "seedance";
  return "auto";
}

export function buildDirectorInstructions(options: {
  brief: string;
  visualStyle: string;
  aspectRatio: AspectRatio;
  targetPlatform: TargetPlatform;
  creativePreset: CreativePreset;
}) {
  const selectedPlatform = options.targetPlatform === "auto"
    ? recommendPlatform(options.brief, options.creativePreset)
    : options.targetPlatform;
  return {
    selectedPlatform,
    instructions: [
      `Creative direction preset: ${options.creativePreset}.`,
      PRESET_GUIDANCE[options.creativePreset],
      `Target aspect ratio: ${options.aspectRatio}; preserve this framing intent across every scene.`,
      `Target model guidance (${selectedPlatform}): ${PLATFORM_GUIDANCE[selectedPlatform]}.`,
      `User visual direction: ${options.visualStyle || "choose a coherent visual style from the brief"}.`,
      "Prompt craft checklist: specify the main subject, a single readable action, scene/location, shot size and angle, one primary camera movement, motivated lighting, palette/materials, and continuity anchors where useful.",
      "Use concrete high-signal details instead of generic filler such as 'beautiful', 'masterpiece', or 'high quality'. Do not add model-specific flags unless they are explicitly requested and supported.",
      "For consecutive scenes, maintain subject identity, wardrobe, props, location, time of day, palette, and screen direction unless the story explicitly changes them.",
      "End each visual prompt with only the constraints relevant to this shot (for example stable anatomy, consistent product shape, stable horizon, no flicker or unwanted text).",
    ].join("\n"),
  };
}
