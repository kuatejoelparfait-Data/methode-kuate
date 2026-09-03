export { loadMethodology } from './loader.js'

import type { AgentDefinition, MethodologyDefinition, DomainId } from '../types.js'

export function filterAgentsForMethodology(
  agents: AgentDefinition[],
  methodology: MethodologyDefinition,
  domains: DomainId[]
): AgentDefinition[] {
  // La méthodologie dicte les workflows et le vocabulaire, PAS les agents.
  // Les agents sont déterminés uniquement par les domaines choisis par l'utilisateur.
  // methodology.agentIds reste disponible pour des suggestions futures (ex: agents recommandés).
  return agents.filter((agent) => domains.includes(agent.domain))
}
