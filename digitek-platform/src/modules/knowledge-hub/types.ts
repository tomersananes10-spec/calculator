export type ModuleKey = 'brief' | 'takam' | 'aiml' | 'tenders' | 'roved5' | 'suppliers' | 'expertise'
export type JourneyStatus = 'active' | 'completed' | 'archived'
export type JourneyStepStatus = 'locked' | 'active' | 'done' | 'skipped'

export interface Journey {
  id: string
  user_id: string
  wish_text: string
  ai_summary: string | null
  ai_tags: string[]
  status: JourneyStatus
  created_at: string
  updated_at: string
}

export interface JourneyStep {
  id: string
  journey_id: string
  order_index: number
  module_key: ModuleKey
  title: string
  description: string | null
  prefill_params: Record<string, string | number | boolean>
  status: JourneyStepStatus
  linked_entity_table: string | null
  linked_entity_id: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface JourneyWithSteps extends Journey {
  steps: JourneyStep[]
}

// Response shape from /api/ai-advisor.
// The advisor classifies each request as either a multi-step "journey"
// or a direct "answer" (info reply + optional downloadable resources).
export type AdvisorKind = 'journey' | 'answer'

export interface AdvisorResponse {
  kind: AdvisorKind
  summary: string
  tags: string[]
  answer?: string
  resources?: AdvisorResource[]
  steps: AdvisorStep[]
}

export interface AdvisorStep {
  module_key: ModuleKey
  title: string
  description: string
  prefill_params: Record<string, string | number | boolean>
}

// A downloadable asset or quick module link attached to an "answer".
export type PriceTableResourceKey = 'takam_price_table' | 'aiml_price_table'

export interface AdvisorResource {
  type: 'download' | 'link'
  label: string
  resource_key?: PriceTableResourceKey
  module_key?: ModuleKey
  prefill_params?: Record<string, string | number | boolean>
}
