export type AimlSize = 'small' | 'medium' | 'large'

export interface AimlItem {
  id: string
  icon: string
  name: string
  prices: Record<AimlSize, number>
  scope: Record<AimlSize, string>
}

export interface AimlEntry {
  itemId: string
  checked: boolean
  size: AimlSize
  baseQty: number
  extraQty: number
}

export interface AimlState {
  project: { name: string; ministry: string }
  entries: Record<string, AimlEntry>
}
