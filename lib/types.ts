// Shared domain types — mirror persona_agent_prompt.md output schema + source layer.
// All immutable; engine functions return new objects, never mutate.

export type RelationToTarget = "by_target" | "about_target" | "third_party" | "unrelated";
export type Basis = "stated" | "inferred";
export type OutputLang = "en" | "ko";

// A retrieved public source. `snippet` holds fetched text for quote substring-verify.
export interface SourceHit {
  id: string;
  url: string;
  title: string;
  date: string; // "" when unknown
  snippet: string; // fetched text used for quote verification
  host: string;
  type: string; // web | linkedin | youtube | podcast | x | github | news | article
  relation_to_target: RelationToTarget;
  author_handle: string; // parsed byline / handle, "" when unknown
  og_image?: string; // side-channel for the photo resolver
  used_for?: string;
}

// ---- Identity resolution ([a]: sonnet, no web_search) ----
export interface IdentityCandidate {
  name: string;
  title: string;
  company: string;
  distinguishing_detail: string;
}

export interface ResolvedIdentity {
  name: string;
  title: string;
  company: string;
  location: string;
  resolved_handle: string; // canonical LinkedIn handle — load-bearing for Gate #4
  linkedin_url: string;
  confidence: number;
  distinguishing_signal: string;
}

export interface IdentityResult {
  status: "ok" | "needs_disambiguation";
  resolved: ResolvedIdentity | null;
  candidates: IdentityCandidate[];
}

// ---- Persona (synthesis output, [c]) ----
export interface EvidenceItem {
  point: string;
  evidence: string; // <=15-word observed datum
  source_id: string;
  basis: Basis;
}

export interface TopMove {
  trait: string;
  importance_score: number;
  fact: string;
  source_id: string;
  inference: string;
  move: string;
}

export interface PersonaSourceRef {
  id: string;
  url: string;
  title: string;
  date: string;
  relation_to_target: RelationToTarget;
  author_handle: string;
  used_for: string;
}

export interface Persona {
  status: "ok" | "needs_disambiguation" | "limited_data";
  output_lang: OutputLang;
  candidates: IdentityCandidate[];
  the_one_thing: string;
  identity: {
    name: string;
    title: string;
    company: string;
    location: string;
    confidence: number;
    resolved_handle: string;
    photo_url: string;
    photo_source_url: string;
    photo_provenance: string; // linkedin | article | none
  };
  snapshot: string;
  whats_new: string;
  recent_activity: { what: string; date: string; source_id: string }[];
  top_moves: TopMove[];
  non_obvious: { insight: string; source_id: string };
  career_arc: { period: string; org: string; role: string; what_they_built: string; source_id: string }[];
  skills_expertise: { point: string; source_id: string; basis: Basis }[];
  notable_quotes: { quote: string; source_id: string; date: string; why_it_matters: string; original_lang?: string }[];
  sales_playbook: {
    best_hook: EvidenceItem;
    what_they_care_about: EvidenceItem[];
    likely_objections: { objection: string; counter: string; source_id: string }[];
    approach_do: EvidenceItem[];
    approach_avoid: EvidenceItem[];
    shared_hooks: EvidenceItem[];
  };
  honest_gaps: string[];
  behavioral_read: {
    note: string;
    method_note: string;
    big_five: { trait: string; signal: string; source_id: string; confidence: number; basis: string }[];
    communication_adaptation: string;
    predicted_mbti: {
      type: string; // "" when omitted
      label: string;
      basis_per_letter: { letter: string; signal: string; source_id: string }[];
    };
    likely_likes: { point: string; evidence: string }[];
    likely_dislikes: { point: string; evidence: string }[];
  };
  sources: PersonaSourceRef[];
  coverage_confidence: number;
}

// ---- Chemistry (separate no-search opus call over [me, target]) ----
export interface Chemistry {
  overall_read: string;
  chemistry_confidence: number;
  chemistry_score: number; // 10-pt, 1 decimal · DEFAULT ON · heuristic/directional
  mbti_compat: { me_type: string; them_type: string; read: string; label: string };
  shared_interests: { point: string; me_evidence: string; me_source_id: string; them_evidence: string; them_source_id: string }[];
  similar_traits: { trait: string; me_signal: string; them_signal: string; framework: string; basis: string }[];
  complementary_traits: { trait: string; me_signal: string; them_signal: string; why_it_helps: string }[];
  potential_friction: { point: string; me_signal: string; them_signal: string; how_to_navigate: string }[];
  interaction_simulation: { opening_30s: string; likely_arc: string; where_it_could_stall: string; how_to_adapt: string };
  honest_gaps: string[];
  me_name?: string;
}

// A cached report bundles the persona + (optional) chemistry + meta.
export interface CachedReport {
  persona: Persona;
  chemistry?: Chemistry | null;
  slug: string;
  created_at?: string;
  durationMs?: number;
  nSources?: number;
}

// ---- Gate report (surfaced to research-log stream) ----
export interface GateReport {
  sourcesDropped_misattributed: string[];
  claimsDemoted_about: string[];
  quotesDropped: string[];
  unsourcedLabeled: string[];
  notes: string[];
}
