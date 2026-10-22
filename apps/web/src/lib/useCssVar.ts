import { useEffect, useState } from 'react';

/** Current value of a CSS custom property on <html>, updated when theme or accent change. */
export function useCssVar(name: string, fallback: string): string {
  const [value, setValue] = useState(() => readVar(name, fallback));
  useEffect(() => {
    const update = () => setValue(readVar(name, fallback));
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'data-theme'],
    });
    update();
    return () => observer.disconnect();
  }, [name, fallback]);
  return value;
}

function readVar(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
