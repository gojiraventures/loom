// ── Original core agents ──────────────────────────────────────────────────────
import { textualScholar } from './textual-scholar';
import { archaeologist } from './archaeologist';
import { earthScientist } from './earth-scientist';
import { comparativeMythologist } from './comparative-mythologist';
import { ethnographer } from './ethnographer';
import { artHistorian } from './art-historian';
import { institutionalHistorian } from './institutional-historian';
import { patternMatcher } from './pattern-matcher';
import { timelineAnalyst } from './timeline-analyst';
import { geographicAnalyst } from './geographic-analyst';
import { advocate } from './advocate';
import { skeptic } from './skeptic';

// ── Indigenous depth specialists ──────────────────────────────────────────────
import { aboriginalAustralianOceanicSpecialist } from './aboriginal-australian-oceanic-specialist';
import { globalIndigenousOralTraditionsCurator } from './global-indigenous-oral-traditions-curator';

// ── Research agents — batch 1 (specialist science) ───────────────────────────
import { forensicAnthropologist } from './forensic-anthropologist';
import { geneticist } from './geneticist';
import { cognitiveScientist } from './cognitive-scientist';
import { pseudoscienceHistorian } from './pseudoscience-historian';
import { indigenousKnowledgeKeeper } from './indigenous-knowledge-keeper';
import { receptionHistorian } from './reception-historian';
import { philologist } from './philologist';
import { patternAnalyst } from './pattern-analyst';
import { archaeoastronomer } from './archaeoastronomer';
import { migrationSpecialist } from './migration-specialist';
import { uapInvestigator } from './uap-investigator';
import { esotericHistorian } from './esoteric-historian';

// ── Research agents — batch 2 (new full list) ─────────────────────────────────
import { biblicalScholar } from './biblical-scholar';
import { codeSkeptic } from './code-skeptic';
import { intertextualAnalyst } from './intertextual-analyst';
import { aiPatternSpecialist } from './ai-pattern-specialist';
import { physicist } from './physicist';
import { dataScientist } from './data-scientist';
import { comparativeReligionScholar } from './comparative-religion-scholar';
import { ritualAnthropologist } from './ritual-anthropologist';
import { semioticAnthropologist } from './semiotic-anthropologist';
import { materialCultureSpecialist } from './material-culture-specialist';
import { visualCultureAnalyst } from './visual-culture-analyst';
import { culturalEcologyAnthropologist } from './cultural-ecology-anthropologist';
import { paranormalResearcher } from './paranormal-researcher';
import { globalHistorian } from './global-historian';

// ── Research agents — lost civilizations & anomalous ─────────────────────────
import { lostCivilizationsScholar } from './lost-civilizations-scholar';
import { catastrophist } from './catastrophist';
import { megalithicExpert } from './megalithic-expert';
import { ancientTechnologyResearcher } from './ancient-technology-researcher';
import { ancientEnergyTheorist } from './ancient-energy-theorist';
import { sacredRelicsHistorian } from './sacred-relics-historian';
import { paleoSetiEvaluator } from './paleo-seti-evaluator';

// ── Public discourse & media intelligence ────────────────────────────────────
import { publicDiscourseAnalyst } from './public-discourse-analyst';

// ── Cartography & historical records ─────────────────────────────────────────
import { cartographyHistorian } from './cartography-historian';
import { antiquarianBooksExpert } from './antiquarian-books-expert';
import { encyclopediaReferenceHistorian } from './encyclopedia-reference-historian';
import { pseudohistoricalMapAnalyst } from './pseudohistorical-map-analyst';

// ── Research agents — investigation methods ───────────────────────────────────
import { debunkingMethodologist } from './debunking-methodologist';
import { parapsychologist } from './parapsychologist';
import { cryptozoologist } from './cryptozoologist';

// ── Convergence agents ────────────────────────────────────────────────────────
import { convergenceSynthesizer } from './convergence-synthesizer';

// ── Governance agents ─────────────────────────────────────────────────────────
import { bioethicist } from './bioethicist';
import { philosopherOfScience } from './philosopher-of-science';
import { principalInvestigator } from './principal-investigator';
import { deputyDirectors } from './deputy-directors';
import { oversightBoard } from './oversight-board';
import { worldviewBalanceOfficer } from './worldview-balance-officer';
import { factChecker } from './fact-checker';
import { explainabilityEngineer } from './explainability-engineer';
import { fringeEthicsSpecialist } from './fringe-ethics-specialist';

// ── Output agents ─────────────────────────────────────────────────────────────
import { scienceCommunicator } from './science-communicator';
import { featureWriter } from './feature-writer';
import { socialMediaWriter } from './social-media-writer';
import { academicPopularizer } from './academic-popularizer';

import type { AgentDefinition } from '../../types';

// ── Layer 1: Research agents ──────────────────────────────────────────────────
export const RESEARCH_AGENTS: AgentDefinition[] = [
  // Original core
  textualScholar, archaeologist, earthScientist, comparativeMythologist,
  ethnographer, artHistorian, institutionalHistorian,
  // Indigenous depth specialists
  aboriginalAustralianOceanicSpecialist, globalIndigenousOralTraditionsCurator,
  // Specialist science
  forensicAnthropologist, geneticist, cognitiveScientist, pseudoscienceHistorian,
  indigenousKnowledgeKeeper, receptionHistorian, philologist, patternAnalyst,
  archaeoastronomer, migrationSpecialist, uapInvestigator, esotericHistorian,
  // Textual & pattern
  biblicalScholar, codeSkeptic, intertextualAnalyst, aiPatternSpecialist,
  // Empirical science
  physicist, dataScientist,
  // Cultural & behavioral
  comparativeReligionScholar, ritualAnthropologist, semioticAnthropologist,
  materialCultureSpecialist, visualCultureAnalyst, culturalEcologyAnthropologist,
  // Anomalous & esoteric
  paranormalResearcher, globalHistorian,
  // Lost civilizations
  lostCivilizationsScholar, catastrophist, megalithicExpert,
  ancientTechnologyResearcher, ancientEnergyTheorist, sacredRelicsHistorian,
  paleoSetiEvaluator,
  // Cartography & historical records
  cartographyHistorian, antiquarianBooksExpert,
  encyclopediaReferenceHistorian, pseudohistoricalMapAnalyst,
  // Public discourse & media intelligence
  publicDiscourseAnalyst,
  // Investigation methods
  debunkingMethodologist, parapsychologist, cryptozoologist,
];

// ── Layer 2: Convergence agents ───────────────────────────────────────────────
export const CONVERGENCE_AGENTS: AgentDefinition[] = [
  patternMatcher,
  timelineAnalyst,
  geographicAnalyst,
  convergenceSynthesizer,
];

// ── Layer 3: Adversarial agents ───────────────────────────────────────────────
export const ADVERSARIAL_AGENTS: AgentDefinition[] = [advocate, skeptic];

// ── Governance agents ─────────────────────────────────────────────────────────
export const GOVERNANCE_AGENTS: AgentDefinition[] = [
  principalInvestigator,
  deputyDirectors,
  oversightBoard,
  philosopherOfScience,
  bioethicist,
  worldviewBalanceOfficer,
  factChecker,
  explainabilityEngineer,
  fringeEthicsSpecialist,
];

// ── Output agents ─────────────────────────────────────────────────────────────
export const OUTPUT_AGENTS: AgentDefinition[] = [
  scienceCommunicator,
  featureWriter,
  socialMediaWriter,
  academicPopularizer,
];

// ── Full registry — 70 agents ─────────────────────────────────────────────────
const ALL_AGENTS: AgentDefinition[] = [
  ...RESEARCH_AGENTS,
  ...CONVERGENCE_AGENTS,
  ...ADVERSARIAL_AGENTS,
  ...GOVERNANCE_AGENTS,
  ...OUTPUT_AGENTS,
];

export const AGENT_REGISTRY: Record<string, AgentDefinition> = Object.fromEntries(
  ALL_AGENTS.map((a) => [a.id, a]),
);

export function getAgent(id: string): AgentDefinition {
  const agent = AGENT_REGISTRY[id];
  if (!agent) throw new Error(`Unknown agent: ${id}`);
  return agent;
}

export function getAgentsByLayer(layer: AgentDefinition['layer']): AgentDefinition[] {
  return ALL_AGENTS.filter((a) => a.layer === layer);
}

export function getAllAgents(): AgentDefinition[] {
  return ALL_AGENTS;
}

// ── Named exports ─────────────────────────────────────────────────────────────
export {
  // Original
  textualScholar, archaeologist, earthScientist, comparativeMythologist,
  ethnographer, artHistorian, institutionalHistorian,
  patternMatcher, timelineAnalyst, geographicAnalyst,
  advocate, skeptic,
  // Indigenous depth specialists
  aboriginalAustralianOceanicSpecialist, globalIndigenousOralTraditionsCurator,
  // Specialist science
  forensicAnthropologist, geneticist, cognitiveScientist, pseudoscienceHistorian,
  indigenousKnowledgeKeeper, receptionHistorian, philologist, patternAnalyst,
  archaeoastronomer, migrationSpecialist, uapInvestigator, esotericHistorian,
  // Textual & pattern
  biblicalScholar, codeSkeptic, intertextualAnalyst, aiPatternSpecialist,
  // Empirical
  physicist, dataScientist,
  // Cultural
  comparativeReligionScholar, ritualAnthropologist, semioticAnthropologist,
  materialCultureSpecialist, visualCultureAnalyst, culturalEcologyAnthropologist,
  // Anomalous
  paranormalResearcher, globalHistorian,
  // Lost civilizations
  lostCivilizationsScholar, catastrophist, megalithicExpert,
  ancientTechnologyResearcher, ancientEnergyTheorist, sacredRelicsHistorian,
  paleoSetiEvaluator,
  // Cartography & historical records
  cartographyHistorian, antiquarianBooksExpert,
  encyclopediaReferenceHistorian, pseudohistoricalMapAnalyst,
  // Public discourse & media intelligence
  publicDiscourseAnalyst,
  // Investigation methods
  debunkingMethodologist, parapsychologist, cryptozoologist,
  // Convergence
  convergenceSynthesizer,
  // Governance
  principalInvestigator, deputyDirectors, oversightBoard, philosopherOfScience,
  bioethicist, worldviewBalanceOfficer, factChecker, explainabilityEngineer,
  fringeEthicsSpecialist,
  // Output
  scienceCommunicator, featureWriter, socialMediaWriter, academicPopularizer,
};
