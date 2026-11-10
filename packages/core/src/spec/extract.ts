export interface ExtractedFile {
  filename: string
  content: string
}

// Première ligne d'un bloc : chemin du fichier en commentaire (// docs/x.md, # docs/x.md, <!-- docs/x.md -->).
const PATH_COMMENT = /^\s*(?:\/\/|#|<!--|\/\*)\s*([A-Za-z0-9_./-]+\.[A-Za-z0-9]+)\s*(?:-->|\*\/)?\s*$/
const OPEN_FENCE = /^\s{0,3}(`{3,}|~{3,})(.*)$/

/**
 * Extrait les fichiers d'une réponse d'agent selon les règles CommonMark : une clôture n'est refermée
 * que par une clôture de même caractère et d'au moins la même longueur. Un document qui contient des
 * blocs de code (arborescence, JSON, SQL) doit donc être entouré d'une clôture plus longue (5 backticks).
 * Les blocs sans chemin sont ignorés ; un bloc non refermé est signalé et ignoré.
 */
export function extractDocFiles(content: string): { files: ExtractedFile[]; warnings: string[] } {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  const files: ExtractedFile[] = []
  const warnings: string[] = []

  let i = 0
  while (i < lines.length) {
    const open = OPEN_FENCE.exec(lines[i])
    if (!open) { i++; continue }
    const char = open[1][0]
    const length = open[1].length

    const body: string[] = []
    let j = i + 1
    let closed = false
    for (; j < lines.length; j++) {
      const t = lines[j].trim()
      if (t.length >= length && t === char.repeat(t.length)) { closed = true; break }
      body.push(lines[j])
    }
    if (!closed) {
      warnings.push(`Bloc de code non refermé à partir de la ligne ${i + 1} : ignoré.`)
      break
    }

    const path = PATH_COMMENT.exec(body[0] ?? '')
    if (path) {
      files.push({ filename: path[1], content: `${body.slice(1).join('\n').replace(/^\n+/, '').replace(/\s+$/, '')}\n` })
    }
    i = j + 1
  }
  return { files, warnings }
}
