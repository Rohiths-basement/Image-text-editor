// Utilities to ensure Google fonts are loaded once per family
// Note: Custom uploaded fonts (via FontFace) are not persisted across reloads yet.
// For those, consider persisting ArrayBuffers in IndexedDB in a future enhancement.

const loadedIds = new Set<string>();

export function ensureGoogleFontLoaded(family: string) {
  if (!family) return;
  const id = `gf-${family.replace(/\s+/g, '-')}`;
  if (loadedIds.has(id) || document.getElementById(id)) return;

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  // Load a broad weight range for preview and usage
  const qp = encodeURIComponent(family);
  link.href = `https://fonts.googleapis.com/css2?family=${qp}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
  loadedIds.add(id);
}
