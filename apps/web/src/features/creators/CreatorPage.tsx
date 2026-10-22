import { type CollectibleKind, collectibleKinds, removeCreator } from '@mnemo/core';
import { Button, EmptyState, SectionTitle } from '@mnemo/ui';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { ArrowUpRightIcon, LinkIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { type AnyCollectible, resolveItems } from '../../app/collectibles';
import { useCollectibles, useCreators } from '../../app/data';
import { useDialogs } from '../../app/dialogs';
import { useStore } from '../../app/store';
import { Confirm } from '../../components/bits';
import { CollectibleCard } from '../../components/CollectibleCard';
import { RemoteImage } from '../../components/MediaImage';
import { WikiSummary } from '../../components/WikiSummary';
import { useFormat } from '../../lib/format';

const routeApi = getRouteApi('/creator/$creatorId');

export function CreatorPage() {
  const { t } = useTranslation();
  const { creatorId } = routeApi.useParams();
  const store = useStore();
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const format = useFormat();
  const creators = useCreators();
  const collectibles = useCollectibles();

  if (!creators) return null;
  const creator = creators.find((c) => c.id === creatorId);
  if (!creator) return <EmptyState title={t('creator.notFound')} />;

  // Their works of every kind, one section per kind.
  const sections = collectibleKinds.flatMap((kind) => {
    const refs = (collectibles?.[kind] ?? [])
      .filter((item) => item.creatorIds.includes(creatorId))
      .map((item) => ({ kind, id: item.id }));
    return refs.length > 0 && collectibles
      ? [{ kind, works: resolveItems(refs, collectibles) }]
      : [];
  });
  // "Author" for someone known only from books, "Person" for someone known from several kinds.
  const role = sections.length === 1 ? t(`kinds.${sections[0]!.kind}.role`) : t('creator.eyebrow');
  const life = format.lifespan(creator);

  return (
    <article>
      <header className="grid animate-rise gap-10 border-b border-line pb-10 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <p className="eyebrow mb-4 text-accent">{role}</p>
          <h1 className="display text-[clamp(2.75rem,7vw,5.5rem)] font-[360]">{creator.name}</h1>
          {life && <p className="caption mt-4 text-2xl text-ink-2">{life}</p>}
          {creator.description && (
            <p className="mt-3 max-w-xl text-sm text-ink-3">{creator.description}</p>
          )}
          {creator.notes && (
            <p className="caption mt-6 max-w-xl text-lg whitespace-pre-line text-ink-2">
              {creator.notes}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-2">
            {!creator.wikidataId && (
              <Button onClick={() => dialogs.open({ type: 'creator', creatorId, link: true })}>
                <LinkIcon /> {t('creator.link')}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('creator.edit')}
              onClick={() => dialogs.open({ type: 'creator', creatorId })}
            >
              <PencilIcon />
            </Button>
            <Confirm
              title={t('creator.deleteTitle', { name: creator.name })}
              description={t('creator.deleteText')}
              confirmLabel={t('common.delete')}
              onConfirm={async () => {
                await removeCreator(store, creator.id);
                toast.success(t('creator.deleted'));
                void navigate({ to: '/collection' });
              }}
              trigger={(open) => (
                <Button variant="ghost" size="icon" aria-label={t('common.delete')} onClick={open}>
                  <Trash2Icon />
                </Button>
              )}
            />
            {creator.wikidataId && (
              <a
                href={`https://www.wikidata.org/wiki/${creator.wikidataId}`}
                target="_blank"
                rel="noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-sm text-ink-3 underline decoration-line-strong underline-offset-4 hover:decoration-accent"
              >
                {t('creator.wikidata')} <ArrowUpRightIcon className="size-3" />
              </a>
            )}
          </div>
        </div>
        {creator.imageUrl && (
          <RemoteImage
            src={creator.imageUrl}
            alt={creator.name}
            className="aspect-[3/4] w-40 rounded-frame shadow-frame md:w-52"
          />
        )}
      </header>

      <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <div className="space-y-16">
          {sections.map(({ kind, works }) => (
            <WorksSection key={kind} kind={kind} works={works} />
          ))}
          {collectibles && sections.length === 0 && (
            <p className="caption text-lg text-ink-3">{t('creator.noWorks')}</p>
          )}
        </div>
        {creator.wikipedia && (
          <div>
            <WikiSummary tag={creator.wikipedia} showImage={!creator.imageUrl} />
          </div>
        )}
      </div>
    </article>
  );
}

function WorksSection({ kind, works }: { kind: CollectibleKind; works: AnyCollectible[] }) {
  const { t } = useTranslation();
  return (
    <section>
      <SectionTitle>{t(`kinds.${kind}.inArchive`, { count: works.length })}</SectionTitle>
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3">
        {works.map((entry) => (
          <CollectibleCard key={entry.item.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}
