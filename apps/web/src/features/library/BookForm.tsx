import {
  type Book,
  type BookDraft,
  type BookFormat,
  type BookOwnership,
  type BookStatus,
  bookFormats,
  collectionHas,
  normalizeIsbn,
  type Reading,
  saveBook,
  setCollectionsOf,
  setReadingStatus,
  todayIsoDate,
} from '@mnemo/core';
import { bookProviders } from '@mnemo/providers';
import {
  Button,
  Chip,
  Dialog,
  DialogContent,
  Field,
  ImageDropzone,
  Input,
  Label,
  Segmented,
  Select,
  Spinner,
  Switch,
  Textarea,
} from '@mnemo/ui';
import { useNavigate } from '@tanstack/react-router';
import { XIcon } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useBook, useCollections, useCreators } from '../../app/data';
import type { DialogProps } from '../../app/dialogs';
import { useStore } from '../../app/store';
import { BookCover } from '../../components/BookCover';
import { useFormat } from '../../lib/format';
import {
  type ProcessedImage,
  processImage,
  saveProcessedImage,
  saveRemoteImage,
} from '../../lib/media';

export function BookFormDialog({ spec, onClose }: DialogProps<'book'>) {
  const existing = useBook(spec.bookId ?? '');
  if (spec.bookId && existing.data === undefined) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <BookForm spec={spec} book={existing.data ?? undefined} onClose={onClose} />
    </Dialog>
  );
}

const LANGUAGES = [
  'de',
  'en',
  'fr',
  'it',
  'es',
  'nl',
  'pt',
  'sv',
  'da',
  'pl',
  'ru',
  'la',
  'el',
  'ja',
  'zh',
];

const numberOrUndefined = (text: string) => {
  const n = Number(text.trim());
  return text.trim() && Number.isInteger(n) && n > 0 ? n : undefined;
};

function BookForm({ spec, book, onClose }: DialogProps<'book'> & { book: Book | undefined }) {
  const { t } = useTranslation();
  const store = useStore();
  const navigate = useNavigate();
  const format = useFormat();
  const collections = useCollections();
  const creators = useCreators();
  const prefill = spec.prefill;

  const [title, setTitle] = useState(book?.title ?? prefill?.title ?? '');
  const [subtitle, setSubtitle] = useState(book?.subtitle ?? prefill?.subtitle ?? '');
  const [authors, setAuthors] = useState<string[]>(book?.authors ?? prefill?.authors ?? []);
  const [authorDraft, setAuthorDraft] = useState('');
  const [isbn, setIsbn] = useState(book?.isbn ?? prefill?.isbn ?? '');
  const [publisher, setPublisher] = useState(book?.publisher ?? prefill?.publisher ?? '');
  const [year, setYear] = useState(book?.year ?? prefill?.year ?? '');
  const [pages, setPages] = useState(String(book?.pageCount ?? prefill?.pageCount ?? ''));
  const [language, setLanguage] = useState(book?.language ?? prefill?.language ?? '');
  const [bookFormat, setBookFormat] = useState<BookFormat | ''>(book?.format ?? '');
  const [description, setDescription] = useState(book?.description ?? prefill?.description ?? '');
  const [status, setStatus] = useState<BookStatus>(book?.status ?? spec.status ?? 'unread');
  const [finishedOn, setFinishedOn] = useState('');
  const [ownership, setOwnership] = useState<BookOwnership>(
    book?.ownership ?? spec.ownership ?? 'owned',
  );
  const [notes, setNotes] = useState(book?.notes ?? '');
  const [tags, setTags] = useState<string[]>(book?.tags ?? []);
  const [tagDraft, setTagDraft] = useState('');
  const [favorite, setFavorite] = useState(book?.favorite ?? false);
  const [collectionIds, setCollectionIds] = useState<Set<string>>(
    () =>
      new Set(
        (collections ?? [])
          .filter((c) => book && collectionHas(c, { kind: 'book', id: book.id }))
          .map((c) => c.id),
      ),
  );
  const [coverId, setCoverId] = useState(book?.mediaIds[0]);
  const [remoteCover, setRemoteCover] = useState(prefill?.coverUrl);
  const [upload, setUpload] = useState<{
    previewUrl: string;
    job: Promise<ProcessedImage | null>;
  }>();
  const [saving, setSaving] = useState(false);
  const previewUrls = useRef<string[]>([]);
  useEffect(
    () => () => {
      for (const url of previewUrls.current) URL.revokeObjectURL(url);
    },
    [],
  );

  const isbnValid = !isbn.trim() || normalizeIsbn(isbn) !== undefined;
  const provider = bookProviders.find((p) => p.id === prefill?.provider);

  const addCover = ([file]: File[]) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    previewUrls.current.push(previewUrl);
    setUpload({ previewUrl, job: processImage(file).catch(() => null) });
    setRemoteCover(undefined);
  };

  const addFrom = (
    draft: string,
    list: string[],
    set: (next: string[]) => void,
    clear: () => void,
  ) => {
    const value = draft.trim().replace(/^#/, '');
    if (value && !list.includes(value)) set([...list, value]);
    clear();
  };

  /** Readings for a new book: started today, or finished on an optional date. */
  const initialReadings = (): Reading[] => {
    if (status === 'reading') return [{ startedOn: todayIsoDate() }];
    if (status === 'read' && finishedOn) return [{ finishedOn }];
    return [];
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !isbnValid) return;
    setSaving(true);
    try {
      const pendingAuthor = authorDraft.trim();
      const allAuthors =
        pendingAuthor && !authors.includes(pendingAuthor) ? [...authors, pendingAuthor] : authors;

      let mediaIds = coverId ? [coverId] : [];
      const processed = upload ? await upload.job : null;
      if (processed) {
        mediaIds = [(await saveProcessedImage(store, processed, { alt: title.trim() })).id];
      } else if (!coverId && remoteCover) {
        mediaIds = [(await saveRemoteImage(store, remoteCover, title.trim())).id];
      }
      const cover = mediaIds[0] ? await store.media.get(mediaIds[0]) : undefined;

      const draft: BookDraft = {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        authors: allAuthors,
        isbn: isbn.trim() || undefined,
        publisher: publisher.trim() || undefined,
        year: year.trim() || undefined,
        pageCount: numberOrUndefined(pages),
        language: language || undefined,
        format: bookFormat || undefined,
        description: description.trim() || undefined,
        ownership,
        notes,
        tags,
        favorite,
        mediaIds,
        palette: cover?.palette ?? [],
        ...(book
          ? {}
          : {
              status,
              readings: initialReadings(),
              source:
                prefill?.provider && prefill.externalId
                  ? { provider: prefill.provider, externalId: prefill.externalId, url: prefill.url }
                  : undefined,
            }),
      };
      let saved = await saveBook(store, draft, book?.id);
      if (book && status !== book.status) saved = await setReadingStatus(store, book.id, status);
      if (saved.loan && ownership !== 'owned') {
        saved = await store.books.update(saved.id, { loan: undefined });
      }

      const replaced = book?.mediaIds.filter((id) => !mediaIds.includes(id)) ?? [];
      for (const id of replaced) await store.media.delete(id);
      await setCollectionsOf(store, { kind: 'book', id: saved.id }, collectionIds);

      onClose();
      toast.success(book ? t('book.updated') : t('book.created', { title: saved.title }), {
        description: cover && !cover.hasBlob ? t('discover.remoteOnly') : undefined,
        action: book
          ? undefined
          : {
              label: t('common.view'),
              onClick: () => void navigate({ to: '/book/$bookId', params: { bookId: saved.id } }),
            },
      });
    } catch (error) {
      toast.error(t('common.saveFailed'), { description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const languages =
    language && !LANGUAGES.includes(language) ? [language, ...LANGUAGES] : LANGUAGES;
  const preview = {
    id: book?.id ?? 'new',
    title: title || '…',
    authors,
    mediaIds: coverId ? [coverId] : [],
  };

  return (
    <DialogContent
      size="xl"
      eyebrow={
        book
          ? t('book.form.editEyebrow')
          : provider
            ? t('book.form.fromCatalogue', { name: provider.name })
            : t('book.form.newEyebrow')
      }
      title={book ? book.title : t('book.form.title')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="book-form" disabled={saving || !title.trim() || !isbnValid}>
            {saving ? <Spinner className="size-4 border-paper/40 border-t-paper" /> : null}
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form
        id="book-form"
        onSubmit={submit}
        className="grid gap-8 md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]"
      >
        <section className="space-y-4">
          <div className="group relative mx-auto w-40 md:w-full">
            {upload ? (
              <img
                src={upload.previewUrl}
                alt=""
                className="aspect-[2/3] w-full rounded-[2px_4px_4px_2px] object-cover shadow-frame"
              />
            ) : (
              <BookCover book={preview} src={remoteCover} className="shadow-frame" />
            )}
            {(upload || coverId || remoteCover) && (
              <button
                type="button"
                onClick={() => {
                  setUpload(undefined);
                  setCoverId(undefined);
                  setRemoteCover(undefined);
                }}
                aria-label={t('common.remove')}
                className="absolute top-2 right-2 grid size-7 cursor-pointer place-items-center rounded-full bg-surface/90 text-ink opacity-0 shadow-soft transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>
          <ImageDropzone
            onFiles={addCover}
            label={t('book.form.coverDrop')}
            hint={t('book.form.coverHint')}
            className="py-6"
          />
        </section>

        <section className="min-w-0 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Segmented
              aria-label={t('book.fields.status')}
              value={status}
              onChange={setStatus}
              options={(['unread', 'reading', 'read'] as const).map((s) => ({
                value: s,
                label: t(`book.status.${s}`),
              }))}
            />
            <Segmented
              aria-label={t('book.fields.ownership')}
              value={ownership}
              onChange={setOwnership}
              options={(['owned', 'wishlist', 'borrowed'] as const).map((o) => ({
                value: o,
                label: t(`book.ownership.${o}`),
              }))}
            />
          </div>
          {!book && status === 'read' && (
            <Field label={t('book.form.finishedOn')} className="max-w-48">
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  value={finishedOn}
                  max={todayIsoDate()}
                  onChange={(e) => setFinishedOn(e.target.value)}
                />
              )}
            </Field>
          )}

          <Field label={t('book.fields.title')}>
            {(id) => (
              <Input
                id={id}
                required
                autoFocus={!prefill}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-12 font-display text-lg italic"
              />
            )}
          </Field>
          <Field label={t('book.fields.subtitle')}>
            {(id) => (
              <Input id={id} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
            )}
          </Field>

          <div className="space-y-2">
            <Label htmlFor="book-author">{t('book.fields.authors')}</Label>
            <div className="flex flex-wrap items-center gap-2">
              {authors.map((a) => (
                <Chip key={a} active onClick={() => setAuthors(authors.filter((x) => x !== a))}>
                  {a} <XIcon className="size-3" />
                </Chip>
              ))}
              <Input
                id="book-author"
                list="book-creator-names"
                value={authorDraft}
                placeholder={t('book.form.authorPlaceholder')}
                onChange={(e) => setAuthorDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addFrom(authorDraft, authors, setAuthors, () => setAuthorDraft(''));
                  }
                }}
                onBlur={() => addFrom(authorDraft, authors, setAuthors, () => setAuthorDraft(''))}
                className="h-9 w-56 max-w-full"
              />
              <datalist id="book-creator-names">
                {creators?.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('book.fields.isbn')}
              hint={t('book.form.isbnHint')}
              error={isbnValid ? undefined : t('book.form.isbnInvalid')}
            >
              {(id) => (
                <Input
                  id={id}
                  inputMode="numeric"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  className="font-mono tracking-wide"
                />
              )}
            </Field>
            <Field label={t('book.fields.publisher')}>
              {(id) => (
                <Input id={id} value={publisher} onChange={(e) => setPublisher(e.target.value)} />
              )}
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label={t('book.fields.year')}>
              {(id) => (
                <Input
                  id={id}
                  value={year}
                  placeholder={t('book.form.yearHint')}
                  onChange={(e) => setYear(e.target.value)}
                />
              )}
            </Field>
            <Field label={t('book.fields.pages')}>
              {(id) => (
                <Input
                  id={id}
                  inputMode="numeric"
                  value={pages}
                  onChange={(e) => setPages(e.target.value.replace(/\D/g, ''))}
                />
              )}
            </Field>
            <Field label={t('book.fields.language')}>
              {(id) => (
                <Select id={id} value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="">—</option>
                  {languages.map((code) => (
                    <option key={code} value={code}>
                      {format.language(code)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t('book.fields.format')}>
              {(id) => (
                <Select
                  id={id}
                  value={bookFormat}
                  onChange={(e) => setBookFormat(e.target.value as BookFormat | '')}
                >
                  <option value="">—</option>
                  {bookFormats.map((f) => (
                    <option key={f} value={f}>
                      {t(`book.formats.${f}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          {(description || prefill) && (
            <Field label={t('book.fields.description')}>
              {(id) => (
                <Textarea
                  id={id}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-sm"
                />
              )}
            </Field>
          )}
          <Field label={t('book.fields.notes')}>
            {(id) => (
              <Textarea
                id={id}
                value={notes}
                placeholder={t('book.form.notesPlaceholder')}
                onChange={(e) => setNotes(e.target.value)}
                className="font-display text-base"
              />
            )}
          </Field>

          <div className="space-y-2">
            <Label htmlFor="book-tag">{t('book.fields.tags')}</Label>
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <Chip key={tag} active onClick={() => setTags(tags.filter((x) => x !== tag))}>
                  #{tag} <XIcon className="size-3" />
                </Chip>
              ))}
              <Input
                id="book-tag"
                value={tagDraft}
                placeholder={t('book.form.tagPlaceholder')}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addFrom(tagDraft, tags, setTags, () => setTagDraft(''));
                  }
                }}
                onBlur={() => addFrom(tagDraft, tags, setTags, () => setTagDraft(''))}
                className="h-8 w-40 rounded-full text-xs"
              />
            </div>
          </div>

          {(collections?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <Label>{t('book.fields.collections')}</Label>
              <div className="flex flex-wrap gap-2">
                {collections?.map((c) => (
                  <Chip
                    key={c.id}
                    active={collectionIds.has(c.id)}
                    onClick={() =>
                      setCollectionIds((set) => {
                        const next = new Set(set);
                        if (next.has(c.id)) next.delete(c.id);
                        else next.add(c.id);
                        return next;
                      })
                    }
                  >
                    {c.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <label
            htmlFor="book-favorite"
            className="flex cursor-pointer items-center justify-between gap-4 border-t border-line pt-5"
          >
            <span>
              <span className="block text-sm font-medium">{t('book.favorite')}</span>
              <span className="block text-xs text-ink-3">{t('book.form.favoriteHint')}</span>
            </span>
            <Switch id="book-favorite" checked={favorite} onCheckedChange={setFavorite} />
          </label>
        </section>
      </form>
    </DialogContent>
  );
}
