import type { Collection } from '@mnemo/core';
import { Button, Dialog, DialogContent, Field, Input, Textarea } from '@mnemo/ui';
import { useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCollections } from '../../app/data';
import type { DialogProps } from '../../app/dialogs';
import { useStore } from '../../app/store';
import { Confirm } from '../../components/bits';

export function CollectionFormDialog({ spec, onClose }: DialogProps<'collection'>) {
  const collections = useCollections();
  if (spec.collectionId && !collections) return null;
  const existing = collections?.find((c) => c.id === spec.collectionId);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <CollectionForm spec={spec} collection={existing} onClose={onClose} />
    </Dialog>
  );
}

function CollectionForm({
  spec,
  collection,
  onClose,
}: DialogProps<'collection'> & { collection: Collection | undefined }) {
  const { t } = useTranslation();
  const store = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState(collection?.name ?? '');
  const [description, setDescription] = useState(collection?.description ?? '');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (collection) {
      await store.collections.update(collection.id, { name: name.trim(), description });
    } else {
      const created = await store.collections.create({
        name: name.trim(),
        description,
        items: spec.addItem ? [spec.addItem] : [],
      });
      if (!spec.addItem) void navigate({ to: '/collection', search: { collection: created.id } });
    }
    toast.success(t('collection.saved'));
    onClose();
  };

  return (
    <DialogContent
      size="sm"
      eyebrow={t('collection.eyebrow')}
      title={collection ? collection.name : t('collection.new')}
      footer={
        <>
          {collection && (
            <Confirm
              title={t('collection.deleteTitle')}
              description={t('collection.deleteText')}
              confirmLabel={t('common.delete')}
              onConfirm={async () => {
                await store.collections.delete(collection.id);
                onClose();
                void navigate({ to: '/collection', search: {} });
              }}
              trigger={(open) => (
                <Button variant="ghost" className="mr-auto text-danger" onClick={open}>
                  {t('common.delete')}
                </Button>
              )}
            />
          )}
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="collection-form" disabled={!name.trim()}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="collection-form" onSubmit={submit} className="space-y-5">
        <Field label={t('collection.name')}>
          {(id) => (
            <Input
              id={id}
              autoFocus
              value={name}
              placeholder={t('collection.namePlaceholder')}
              onChange={(e) => setName(e.target.value)}
              className="font-display text-lg italic"
            />
          )}
        </Field>
        <Field label={t('collection.description')}>
          {(id) => (
            <Textarea
              id={id}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          )}
        </Field>
      </form>
    </DialogContent>
  );
}
