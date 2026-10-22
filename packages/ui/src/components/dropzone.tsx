import { ImagePlusIcon } from 'lucide-react';
import { type DragEvent, type ReactNode, useId, useState } from 'react';
import { cn } from '../cn';

interface ImageDropzoneProps {
  onFiles: (files: File[]) => void;
  label: ReactNode;
  hint?: ReactNode;
  multiple?: boolean;
  className?: string;
}

export function ImageDropzone({
  onFiles,
  label,
  hint,
  multiple = true,
  className,
}: ImageDropzoneProps) {
  const id = useId();
  const [over, setOver] = useState(false);

  const accept = (list: FileList | null) => {
    const files = [...(list ?? [])].filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    accept(e.dataTransfer.files);
  };

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        'group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-frame border border-dashed px-6 py-10 text-center transition-colors duration-300',
        over
          ? 'border-accent bg-accent-soft'
          : 'border-line-strong hover:border-ink-3 hover:bg-ink/3',
        className,
      )}
    >
      <ImagePlusIcon
        strokeWidth={1.25}
        className={cn(
          'size-8 transition-colors',
          over ? 'text-accent' : 'text-ink-3 group-hover:text-ink-2',
        )}
      />
      <span className="caption text-lg text-ink-2">{label}</span>
      {hint && <span className="text-xs text-ink-3">{hint}</span>}
      <input
        id={id}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          accept(e.target.files);
          e.target.value = '';
        }}
      />
    </label>
  );
}
