// "אשכולות והתמחויות" — נספח ב' של מכרז דיגיטק 07-2023.
// אשכול (cluster) מכיל התמחויות (specializations). ה-cluster_id (1-12)
// מיושר ל-BRIEF_CLUSTERS של מרכז הידע והבריפים.

export interface ExpertiseSpec {
  id: number
  cluster_id: number
  name: string
  description: string
  activities: string[]
  outputs: string[]
  scope: string
  start_date: string
  sort_order: number
}

export interface ExpertiseCluster {
  cluster_id: number
  name: string
  icon: string
  hue: number
  note: string
  sort_order: number
  specs: ExpertiseSpec[]
}

// תוצאת החיפוש החכם (מוחזרת מ-Gemini דרך /api/ai-advisor)
export interface ExpertiseAiHit {
  cluster_id: number
  cluster_name: string
  spec_name: string
  reason: string
}

export interface ExpertiseAiResponse {
  summary: string
  hits: ExpertiseAiHit[]
}
