import type { MnemoStore } from '@mnemo/core';
import { Button, cn, Dialog, DialogContent, Tag } from '@mnemo/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../app/store';
import { type ChangeKind, type Release, releasesSince } from '../../changelog';
import { useFormat } from '../../lib/format';
import { APP_VERSION } from '../../version';

/** Installations from before release notes existed have no `lastSeenVersion`. */
const FIRST_TRACKED_VERSION = '0.1.0';

const KIND_CLASS: Record<ChangeKind, string> = {
  new: 'border-accent/40 text-accent',
  improved: '',
  fixed: 'text-ink-3',
};

export function ReleaseNotes({ releases }: { releases: readonly Release[] }) {
  const { t, i18n } = useTranslation();
  const format = useFormat();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'de';

  return (
    <ol className="space-y-10">
      {releases.map((release) => (
        <li key={release.version}>
          <div className="flex items-baseline gap-3 border-b border-line pb-2">
            <span className="display text-2xl font-[420]">{release.version}</span>
            <span className="caption text-sm text-ink-3">{format.date(release.date)}</span>
          </div>
          <ul className="mt-4 space-y-3">
            {release.entries.map((entry) => (
              <li
                key={entry.en}
                className="grid grid-cols-[6.5rem_1fr] items-baseline gap-3 text-sm leading-relaxed"
              >
                <span>
                  <Tag className={cn(KIND_CLASS[entry.kind])}>
                    {t(`whatsNew.kinds.${entry.kind}`)}
                  </Tag>
                </span>
                <span className="text-ink-2">{entry[lang]}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

const checks = new WeakMap<MnemoStore, Promise<Release[]>>();

/**
 * Release notes the user has not seen yet. The version counts as seen as soon as this runs, so
 * a reload never shows the notes twice. Fresh installations start up to date. Runs once per
 * store, which keeps React's double effects in development from racing each other.
 */
function unseenReleases(store: MnemoStore): Promise<Release[]> {
  let check = checks.get(store);
  if (!check) {
    check = (async () => {
      const { lastSeenVersion } = await store.settings.get();
      if (lastSeenVersion === APP_VERSION) return [];
      let seen = lastSeenVersion;
      if (!seen) {
        const [artworks, places] = await Promise.all([store.artworks.list(), store.places.list()]);
        seen = artworks.length === 0 && places.length === 0 ? APP_VERSION : FIRST_TRACKED_VERSION;
      }
      await store.settings.update({ lastSeenVersion: APP_VERSION });
      return releasesSince(seen);
    })();
    checks.set(store, check);
  }
  return check;
}

/** Shows the release notes once after an update. */
export function WhatsNewOnUpdate() {
  const { t } = useTranslation();
  const store = useStore();
  const [pending, setPending] = useState<Release[]>([]);

  useEffect(() => {
    let active = true;
    void unseenReleases(store).then((releases) => active && setPending(releases));
    return () => {
      active = false;
    };
  }, [store]);

  if (pending.length === 0) return null;

  const close = () => setPending([]);

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent
        eyebrow={t('whatsNew.eyebrow')}
        title={t('whatsNew.title', { version: APP_VERSION })}
        footer={
          <Button variant="accent" onClick={close}>
            {t('whatsNew.done')}
          </Button>
        }
      >
        <ReleaseNotes releases={pending} />
      </DialogContent>
    </Dialog>
  );
}
