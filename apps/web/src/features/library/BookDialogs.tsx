import { type Book, lendBook, saveQuote, todayIsoDate } from '@mnemo/core';
import { Button, Dialog, DialogContent, Field, Input, Textarea } from '@mnemo/ui';
import { type FormEvent, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useBook } from '../../app/data';
import type { DialogProps } from '../../app/dialogs';
import { useStore } from '../../app/store';

/** Renders `children` once the book is loaded; closes silently if it no longer exists. */
function WithBook({
  bookId,
  onClose,
  children,
}: {
  bookId: string;
  onClose: () => void;
  children: (book: Book) => ReactNode;
}) {
  const query = useBook(bookId);
  if (!query.data) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {children(query.data)}
    </Dialog>
  );
}

export function QuoteDialog({ spec, onClose }: DialogProps<'quote'>) {
  return (
    <WithBook bookId={spec.bookId} onClose={onClose}>
      {(book) => <QuoteForm book={book} quoteId={spec.quoteId} onClose={onClose} />}
    </WithBook>
  );
}

function QuoteForm({
  book,
  quoteId,
  onClose,
}: {
  book: Book;
  quoteId: string | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const store = useStore();
  const existing = book.quotes.find((q) => q.id === quoteId);
  const [text, setText] = useState(existing?.text ?? '');
  const [page, setPage] = useState(
    String(existing?.page ?? (book.status === 'reading' ? (book.currentPage ?? '') : '')),
  );
  const [note, setNote] = useState(existing?.note ?? '');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const pageNumber = Number(page);
    await saveQuote(
      store,
      book.id,
      {
        text: text.trim(),
        page: page && pageNumber > 0 ? pageNumber : undefined,
        note: note.trim() || undefined,
      },
      existing?.id,
    );
    toast.success(t('book.quoteSaved'));
    onClose();
  };

  return (
    <DialogContent
      size="md"
      eyebrow={book.title}
      title={existing ? t('book.editQuote') : t('book.addQuote')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="quote-form" disabled={!text.trim()}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="quote-form" onSubmit={submit} className="space-y-5">
        <Field label={t('book.quote')}>
          {(id) => (
            <Textarea
              id={id}
              autoFocus
              required
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="font-display text-lg leading-relaxed italic"
            />
          )}
        </Field>
        <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
          <Field label={t('book.quotePage')}>
            {(id) => (
              <Input
                id={id}
                inputMode="numeric"
                value={page}
                onChange={(e) => setPage(e.target.value.replace(/\D/g, ''))}
              />
            )}
          </Field>
          <Field label={t('book.quoteNote')}>
            {(id) => <Input id={id} value={note} onChange={(e) => setNote(e.target.value)} />}
          </Field>
        </div>
      </form>
    </DialogContent>
  );
}

export function LoanDialog({ spec, onClose }: DialogProps<'loan'>) {
  return (
    <WithBook bookId={spec.bookId} onClose={onClose}>
      {(book) => <LoanForm book={book} onClose={onClose} />}
    </WithBook>
  );
}

function LoanForm({ book, onClose }: { book: Book; onClose: () => void }) {
  const { t } = useTranslation();
  const store = useStore();
  const [name, setName] = useState('');
  const [since, setSince] = useState(todayIsoDate());
  const [due, setDue] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !since) return;
    try {
      await lendBook(store, book.id, { name: name.trim(), since, due: due || undefined });
      toast.success(t('book.lentToast', { name: name.trim() }));
      onClose();
    } catch (error) {
      toast.error(t('common.saveFailed'), { description: (error as Error).message });
    }
  };

  return (
    <DialogContent
      size="sm"
      eyebrow={t('book.lend')}
      title={t('book.lendTitle', { title: book.title })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="loan-form" disabled={!name.trim() || !since}>
            {t('book.lend')}
          </Button>
        </>
      }
    >
      <form id="loan-form" onSubmit={submit} className="space-y-5">
        <Field label={t('book.lendName')}>
          {(id) => (
            <Input
              id={id}
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('book.lendSince')}>
            {(id) => (
              <Input id={id} type="date" value={since} onChange={(e) => setSince(e.target.value)} />
            )}
          </Field>
          <Field label={t('book.lendDue')}>
            {(id) => (
              <Input
                id={id}
                type="date"
                value={due}
                min={since}
                onChange={(e) => setDue(e.target.value)}
              />
            )}
          </Field>
        </div>
      </form>
    </DialogContent>
  );
}
