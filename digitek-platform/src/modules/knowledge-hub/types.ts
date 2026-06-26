export type ModuleKey = 'brief' | 'takam' | 'aiml' | 'tenders' | 'roved5' | 'suppliers'
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

// Response shape from /api/journey-advisor
export interface AdvisorResponse {
  summary: string
  tags: string[]
  steps: AdvisorStep[]
}

export interface AdvisorStep {
  module_key: ModuleKey
  title: string
  description: string
  prefill_params: Record<string, string | number | boolean>
}
