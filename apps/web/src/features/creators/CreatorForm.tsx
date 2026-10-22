import type { Creator } from '@mnemo/core';
import { type PersonResult, wikidataPeopleProvider } from '@mnemo/providers';
import { Button, Dialog, DialogContent, Field, Input, Spinner, Textarea } from '@mnemo/ui';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRightIcon, CheckIcon, SearchIcon, UnlinkIcon } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCreators, useProviderContext } from '../../app/data';
import type { DialogProps } from '../../app/dialogs';
import { useStore } from '../../app/store';
import { RemoteImage } from '../../components/MediaImage';
import { useFormat } from '../../lib/format';
import { useDebounced } from '../../lib/hooks';

export function CreatorFormDialog({ spec, onClose }: DialogProps<'creator'>) {
  const creators = useCreators();
  const creator = creators?.find((c) => c.id === spec.creatorId);
  if (!creator) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <EditCreator creator={creator} searchOnOpen={spec.link ?? false} onClose={onClose} />
    </Dialog>
  );
}

/** Fields taken over from Wikidata; cleared together when the link is removed. */
type Linked = Pick<Creator, 'wikidataId' | 'description' | 'imageUrl' | 'wikipedia'>;

const yearText = (year: number | undefined) => (year === undefined ? '' : String(year));
const parseYear = (text: string) => {
  const year = Number(text.trim());
  return text.trim() && Number.isInteger(year) ? year : undefined;
};

function EditCreator({
  creator,
  searchOnOpen,
  onClose,
}: {
  creator: Creator;
  searchOnOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const store = useStore();
  const [name, setName] = useState(creator.name);
  const [birthYear, setBirthYear] = useState(yearText(creator.birthYear));
  const [deathYear, setDeathYear] = useState(yearText(creator.deathYear));
  const [notes, setNotes] = useState(creator.notes);
  const [linked, setLinked] = useState<Linked>({
    wikidataId: creator.wikidataId,
    description: creator.description,
    imageUrl: creator.imageUrl,
    wikipedia: creator.wikipedia,
  });

  const apply = (person: PersonResult) => {
    setName(person.name);
    setBirthYear(yearText(person.birthYear));
    setDeathYear(yearText(person.deathYear));
    setLinked({
      wikidataId: person.wikidataId,
      description: person.description,
      imageUrl: person.imageUrl,
      wikipedia: person.wikipedia,
    });
    toast.success(t('creator.applied'));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await store.creators.update(creator.id, {
      name: name.trim(),
      birthYear: parseYear(birthYear),
      deathYear: parseYear(deathYear),
      notes,
      ...linked,
    });
    toast.success(t('creator.saved'));
    onClose();
  };

  return (
    <DialogContent
      size="lg"
      eyebrow={t('creator.edit')}
      title={creator.name}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="creator-form" disabled={!name.trim()}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="creator-form" onSubmit={submit} className="space-y-5">
        <Field label={t('creator.name')}>
          {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t('creator.birthYear')} hint={t('creator.yearHint')}>
            {(id) => (
              <Input
                id={id}
                inputMode="numeric"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
              />
            )}
          </Field>
          <Field label={t('creator.deathYear')}>
            {(id) => (
              <Input
                id={id}
                inputMode="numeric"
                value={deathYear}
                onChange={(e) => setDeathYear(e.target.value)}
              />
            )}
          </Field>
        </div>
        <Field label={t('creator.notes')}>
          {(id) => <Textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} />}
        </Field>
      </form>

      <section className="mt-8 border-t border-line pt-6">
        <h3 className="display text-2xl font-[420]">{t('creator.wikidata')}</h3>
        {linked.wikidataId ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <CheckIcon className="size-4 text-accent" />
            <span>{t('creator.linked')}</span>
            <a
              href={`https://www.wikidata.org/wiki/${linked.wikidataId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-ink-3 hover:text-accent"
            >
              {linked.wikidataId} <ArrowUpRightIcon className="size-3" />
            </a>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() =>
                setLinked({
                  wikidataId: undefined,
                  description: undefined,
                  imageUrl: undefined,
                  wikipedia: undefined,
                })
              }
            >
              <UnlinkIcon /> {t('creator.unlink')}
            </Button>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-3">{t('creator.wikidataText')}</p>
            <PersonSearch initial={searchOnOpen ? creator.name : ''} onApply={apply} />
          </>
        )}
      </section>
    </DialogContent>
  );
}

function PersonSearch({
  initial,
  onApply,
}: {
  initial: string;
  onApply: (person: PersonResult) => void;
}) {
  const { t } = useTranslation();
  const ctx = useProviderContext();
  const format = useFormat();
  const [text, setText] = useState(initial);
  const q = useDebounced(text.trim(), 400);
  const results = useQuery({
    queryKey: ['people', 'wikidata', ctx.locale, q],
    queryFn: ({ signal }) => wikidataPeopleProvider.search(q, { ...ctx, signal }),
    enabled: q.length >= 2,
    staleTime: 24 * 60 * 60_000,
    retry: false,
  });

  return (
    <div className="mt-4 space-y-4">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('creator.searchPlaceholder')}
          aria-label={t('creator.search')}
          className="pl-9"
          autoFocus={Boolean(initial)}
        />
      </div>
      {results.isFetching && <Spinner />}
      {results.isError && <p className="text-sm text-danger">{t('creator.searchFailed')}</p>}
      {results.data?.length === 0 && <p className="caption text-ink-3">{t('creator.noResults')}</p>}
      {results.data && results.data.length > 0 && (
        <ul className="divide-y divide-line">
          {results.data.map((person) => (
            <li key={person.wikidataId} className="flex items-center gap-4 py-3">
              <RemoteImage
                src={person.imageUrl}
                alt=""
                className="size-12 shrink-0 rounded-frame"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {person.name}{' '}
                  <span className="text-sm font-normal text-ink-3">{format.lifespan(person)}</span>
                </p>
                {person.description && (
                  <p className="truncate text-xs text-ink-3">{person.description}</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => onApply(person)}>
                {t('creator.apply')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
