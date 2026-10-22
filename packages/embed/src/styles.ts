/**
 * Widget styles. Every visual decision is a `--mnemo-*` custom property, so host pages can
 * restyle the gallery from outside the shadow root: `mnemo-gallery { --mnemo-accent: teal }`.
 */
export const styles = /* css */ `
:host {
  --mnemo-bg: #f3eee5;
  --mnemo-surface: #faf7f1;
  --mnemo-ink: #1c1915;
  --mnemo-ink-2: #4b443c;
  --mnemo-ink-3: #6f675d;
  --mnemo-line: rgb(28 25 21 / 0.13);
  --mnemo-accent: #a4462f;
  --mnemo-font-display: 'Fraunces Variable', 'Fraunces', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;
  --mnemo-font-sans: 'Instrument Sans Variable', 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
  --mnemo-columns: 3;
  --mnemo-gap: 28px;
  --mnemo-radius: 3px;
  --mnemo-shadow: 0 1px 2px rgb(28 25 21 / 0.05), 0 12px 32px -12px rgb(28 25 21 / 0.25);

  display: block;
  container-type: inline-size;
  background: var(--mnemo-bg);
  color: var(--mnemo-ink);
  font-family: var(--mnemo-font-sans);
  padding: clamp(20px, 4cqi, 48px);
  border-radius: var(--mnemo-radius);
}

:host([theme='dark']) {
  --mnemo-bg: #12110f;
  --mnemo-surface: #1b1917;
  --mnemo-ink: #ede7dd;
  --mnemo-ink-2: #c2b9ad;
  --mnemo-ink-3: #8f877c;
  --mnemo-line: rgb(237 231 221 / 0.13);
  --mnemo-accent: #e1906a;
  --mnemo-shadow: 0 16px 40px -12px rgb(0 0 0 / 0.6);
}

@media (prefers-color-scheme: dark) {
  :host([theme='auto']) {
    --mnemo-bg: #12110f;
    --mnemo-surface: #1b1917;
    --mnemo-ink: #ede7dd;
    --mnemo-ink-2: #c2b9ad;
    --mnemo-ink-3: #8f877c;
    --mnemo-line: rgb(237 231 221 / 0.13);
    --mnemo-accent: #e1906a;
    --mnemo-shadow: 0 16px 40px -12px rgb(0 0 0 / 0.6);
  }
}

* { box-sizing: border-box; }

header { margin-bottom: 32px; padding-bottom: 20px; border-bottom: 1px solid var(--mnemo-line); }
.eyebrow {
  margin: 0 0 10px;
  color: var(--mnemo-accent);
  font-size: 11px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase;
}
h2 {
  margin: 0;
  font-family: var(--mnemo-font-display);
  font-weight: 380; font-size: clamp(32px, 7cqi, 64px); line-height: 0.95; letter-spacing: -0.02em;
}
.lede { margin: 12px 0 0; font-family: var(--mnemo-font-display); font-style: italic; color: var(--mnemo-ink-2); font-size: 18px; }

.grid { columns: var(--mnemo-columns); column-gap: var(--mnemo-gap); }
@container (max-width: 640px) { .grid { columns: 2; } }
@container (max-width: 380px) { .grid { columns: 1; } }

figure { break-inside: avoid; margin: 0 0 36px; }
button.item {
  all: unset; display: block; width: 100%; cursor: zoom-in;
}
button.item:focus-visible { outline: 2px solid var(--mnemo-accent); outline-offset: 4px; }
.frame {
  position: relative; overflow: hidden; background: var(--mnemo-surface);
  box-shadow: var(--mnemo-shadow); border-radius: 1px;
}
.frame img {
  display: block; width: 100%; height: auto;
  transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease;
}
button.item:hover .frame img { transform: scale(1.025); }
.placeholder {
  aspect-ratio: 4 / 5; display: flex; align-items: flex-end; padding: 18px;
  font-family: var(--mnemo-font-display); font-style: italic; font-size: 24px; color: var(--mnemo-ink-3);
}
.heart {
  position: absolute; top: 10px; right: 10px; width: 26px; height: 26px; border-radius: 50%;
  display: grid; place-items: center; background: color-mix(in oklab, var(--mnemo-surface) 90%, transparent);
  color: var(--mnemo-accent); font-size: 13px;
}
figcaption { margin-top: 14px; }
.title { margin: 0; font-family: var(--mnemo-font-display); font-style: italic; font-size: 17px; line-height: 1.3; }
.meta { margin: 4px 0 0; font-size: 12px; color: var(--mnemo-ink-2); }
.where { margin: 6px 0 0; font-size: 10px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--mnemo-ink-3); }

.state { padding: 48px 0; text-align: center; font-family: var(--mnemo-font-display); font-style: italic; color: var(--mnemo-ink-3); font-size: 20px; }

footer { margin-top: 8px; font-size: 11px; color: var(--mnemo-ink-3); text-align: right; }
footer a { color: inherit; }

dialog {
  width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; padding: 0; border: 0;
  background: #0b0a09; color: #f3eee5;
}
dialog::backdrop { background: #0b0a09; }
dialog[open] { display: grid; grid-template-rows: 1fr auto; animation: fade 0.35s ease; }
.stage {
  display: flex; align-items: center; justify-content: center;
  min-height: 0; overflow: hidden; padding: 48px 72px 16px;
}
.stage img { max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 30px 80px -20px rgb(0 0 0 / 0.7); }
.details { padding: 8px 32px 32px; text-align: center; }
.details .title { font-size: 26px; color: #f3eee5; }
.details .meta { color: rgb(243 238 229 / 0.7); font-size: 13px; }
.details .notes { max-width: 640px; margin: 14px auto 0; font-family: var(--mnemo-font-display); color: rgb(243 238 229 / 0.8); line-height: 1.6; }
.nav {
  all: unset; position: absolute; top: 45%; cursor: pointer;
  width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center;
  background: rgb(255 255 255 / 0.1); color: #fff; font-size: 22px;
}
.nav:hover { background: rgb(255 255 255 / 0.2); }
.nav:focus-visible, .close:focus-visible { outline: 2px solid var(--mnemo-accent); }
.prev { left: 16px; } .next { right: 16px; }
.close { all: unset; position: absolute; top: 16px; right: 16px; cursor: pointer; width: 44px; height: 44px; display: grid; place-items: center; border-radius: 50%; background: rgb(255 255 255 / 0.1); color: #fff; font-size: 20px; }

@keyframes fade { from { opacity: 0; } }
@keyframes rise { from { opacity: 0; transform: translateY(12px); } }
figure { animation: rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;
