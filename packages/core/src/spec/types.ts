/** Phases couvertes par le paquet de specs. */
export type SpecPhase = 'K' | 'U' | 'A'

/** Contenu brut des documents du paquet (undefined = fichier absent). */
export interface SpecFiles {
  constitution?: string
  specs?: string
  backlog?: string
  architecture?: string
  dataModel?: string
  /** Clé = chemin relatif (ex. `docs/contracts/auth.md`). */
  contracts: Record<string, string>
  clarifications?: string
}

export interface Story {
  id: string
  title: string
}

export interface Criterion {
  id: string
  storyId: string
  text: string
}

export interface Requirement {
  id: string
  kind: 'FR' | 'NFR'
  text: string
}

export interface SpecTask {
  id: string
  title: string
  parallel: boolean
  covers: string[]
  depends: string[]
  files: string[]
  doneWhen: string
  /** Bloc Markdown complet de la tâche (titre inclus). */
  block: string
}

export interface SpecModel {
  stories: Story[]
  criteria: Criterion[]
  requirements: Requirement[]
  tasks: SpecTask[]
  archSections: string[]
  flags: { hasData: boolean; hasApi: boolean }
}
