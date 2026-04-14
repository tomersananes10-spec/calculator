export interface Roved5Service {
  id: string
  cloud: 'GCP' | 'AWS'
  provider: string
  manufacturer: string
  name: string
  description: string
  type: 'SaaS' | 'non-SaaS'
  discount: string | number
  priceLink: string
  contact: string
  approvalDate: string
  notes: string
  psServices: string
}

export interface AISearchResult {
  id: string
  score: number
  reason: string
}
