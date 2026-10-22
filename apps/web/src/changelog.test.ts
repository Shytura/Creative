import { describe, expect, it } from 'vitest';
import pkg from '../package.json';
import { compareVersions, releases, releasesSince } from './changelog';

describe('changelog', () => {
  it('starts with the current package version', () => {
    expect(releases[0]?.version).toBe(pkg.version);
  });

  it('is ordered newest first with unique versions and valid dates', () => {
    for (let i = 1; i < releases.length; i++) {
      expect(compareVersions(releases[i - 1]!.version, releases[i]!.version)).toBeGreaterThan(0);
    }
    for (const r of releases) expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('compares versions numerically', () => {
    expect(compareVersions('0.10.0', '0.9.3')).toBeGreaterThan(0);
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('0.1.0', '0.2.0')).toBeLessThan(0);
  });

  it('lists releases since a version', () => {
    expect(releasesSince('0.1.0').map((r) => r.version)).not.toContain('0.1.0');
    expect(releasesSince(pkg.version)).toEqual([]);
  });
});
