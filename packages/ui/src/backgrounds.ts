/**
 * Gradient-mesh backdrops. Each preset is a stack of soft radial gradients that reads like
 * pigment bleeding into paper. Values are plain CSS so they also work outside React.
 */
export const meshGradients = {
  dawn: {
    light:
      'radial-gradient(at 12% 18%, #f2c9a8 0, transparent 48%), radial-gradient(at 88% 8%, #e9d5c0 0, transparent 46%), radial-gradient(at 72% 88%, #d9b7a6 0, transparent 52%), radial-gradient(at 20% 92%, #efe0c8 0, transparent 50%)',
    dark: 'radial-gradient(at 12% 18%, #4a2a1d 0, transparent 50%), radial-gradient(at 88% 8%, #3b2a20 0, transparent 46%), radial-gradient(at 72% 88%, #3a1f1c 0, transparent 52%)',
  },
  atelier: {
    light:
      'radial-gradient(at 0% 0%, #d7cdb8 0, transparent 50%), radial-gradient(at 100% 30%, #c9d3cc 0, transparent 45%), radial-gradient(at 40% 100%, #e3d3b5 0, transparent 55%)',
    dark: 'radial-gradient(at 0% 0%, #2c2a22 0, transparent 50%), radial-gradient(at 100% 30%, #1f2a25 0, transparent 45%), radial-gradient(at 40% 100%, #33291a 0, transparent 55%)',
  },
  nocturne: {
    light:
      'radial-gradient(at 15% 10%, #c4cbe0 0, transparent 50%), radial-gradient(at 85% 40%, #d8cfe4 0, transparent 45%), radial-gradient(at 30% 95%, #c8d8e0 0, transparent 50%)',
    dark: 'radial-gradient(at 15% 10%, #1a2240 0, transparent 50%), radial-gradient(at 85% 40%, #2a1f3d 0, transparent 45%), radial-gradient(at 30% 95%, #10283a 0, transparent 50%)',
  },
  garden: {
    light:
      'radial-gradient(at 10% 80%, #c8d9be 0, transparent 50%), radial-gradient(at 90% 15%, #e6dcb4 0, transparent 45%), radial-gradient(at 60% 60%, #d3e0d6 0, transparent 50%)',
    dark: 'radial-gradient(at 10% 80%, #1e2e1c 0, transparent 50%), radial-gradient(at 90% 15%, #2f2b17 0, transparent 45%), radial-gradient(at 60% 60%, #16261f 0, transparent 50%)',
  },
  fresco: {
    light:
      'radial-gradient(at 20% 20%, #e8c4b0 0, transparent 45%), radial-gradient(at 80% 20%, #bcd3d6 0, transparent 45%), radial-gradient(at 50% 100%, #ecd9a9 0, transparent 55%)',
    dark: 'radial-gradient(at 20% 20%, #3d2219 0, transparent 45%), radial-gradient(at 80% 20%, #15302f 0, transparent 45%), radial-gradient(at 50% 100%, #3a2e12 0, transparent 55%)',
  },
} as const;

/** Fine paper grain as an inline SVG turbulence texture. */
export const paperGrain =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.11 0 0 0 0 0.09 0 0 0 0 0.07 0 0 0 0.09 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Curated accent colours named after pigments. */
export const accentPresets = [
  { id: 'pompeian', color: '#a4462f' },
  { id: 'ultramarine', color: '#2f4fa4' },
  { id: 'viridian', color: '#2f6f5b' },
  { id: 'ochre', color: '#9a6a1c' },
  { id: 'madder', color: '#8f2f52' },
  { id: 'indigo', color: '#3c3a6e' },
  { id: 'graphite', color: '#3d3a36' },
] as const;
