/**
 * Ne garde que les fichiers destinés à `docs/` : chemin relatif, sans `..`, sans lecteur Windows.
 * Les séparateurs sont normalisés en `/`. Protège contre un LLM qui écrirait hors du dossier de specs.
 */
export function filterDocFiles<T extends { filename: string }>(files: T[]): T[] {
  const kept: T[] = []
  for (const f of files) {
    const name = f.filename.trim().replace(/\\/g, '/').replace(/^\.\//, '')
    if (name.startsWith('/') || /^[A-Za-z]:/.test(name)) continue
    if (name.split('/').includes('..')) continue
    if (!name.startsWith('docs/')) continue
    kept.push({ ...f, filename: name })
  }
  return kept
}
