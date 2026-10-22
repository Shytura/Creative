// In production a host page would load the built file instead:
// <script type="module" src="https://…/mnemo-embed.js"></script>
import '@mnemo/embed';

document.querySelector('mnemo-gallery')?.addEventListener('mnemo-select', (event) => {
  const { title } = (event as CustomEvent<{ title: string }>).detail;
  const log = document.querySelector('#log');
  if (log) log.textContent = `mnemo-select → ${title}`;
});
