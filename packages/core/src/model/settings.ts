import { z } from 'zod';
import { hexColorSchema, idSchema } from './common';

export const themeSchema = z.enum(['system', 'light', 'dark']);
export type Theme = z.infer<typeof themeSchema>;

export const localeSchema = z.enum(['system', 'de', 'en']);
export type LocaleSetting = z.infer<typeof localeSchema>;

export const meshPresets = ['dawn', 'atelier', 'nocturne', 'garden', 'fresco'] as const;
export type MeshPreset = (typeof meshPresets)[number];

export const backgroundSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('plain') }),
  z.object({ kind: z.literal('paper') }),
  z.object({ kind: z.literal('mesh'), preset: z.enum(meshPresets) }),
  /** A blurred artwork from the user's own collection. */
  z.object({ kind: z.literal('artwork'), artworkId: idSchema }),
  /** An uploaded image stored as media. */
  z.object({ kind: z.literal('upload'), mediaId: idSchema }),
  /** Changes every day to the artwork of the day. */
  z.object({ kind: z.literal('daily') }),
]);
export type Background = z.infer<typeof backgroundSchema>;

export const settingsSchema = z.object({
  theme: themeSchema.default('system'),
  locale: localeSchema.default('system'),
  /** `auto` derives the accent from the artwork in focus. */
  accent: z.union([z.literal('auto'), hexColorSchema]).default('#a4462f'),
  background: backgroundSchema.default({ kind: 'paper' }),
  /** 0 = subtle, 1 = vivid. Applies to image backgrounds. */
  backgroundIntensity: z.number().min(0).max(1).default(0.35),
  /** API keys for data sources, keyed by the provider's key id (e.g. `europeana`). */
  providerKeys: z.record(z.string(), z.string()).default({}),
  /** Last app version whose release notes the user has seen; drives "What's new". */
  lastSeenVersion: z.string().optional(),
});
export type Settings = z.infer<typeof settingsSchema>;
export type SettingsPatch = Partial<z.input<typeof settingsSchema>>;

export const defaultSettings: Settings = settingsSchema.parse({});
