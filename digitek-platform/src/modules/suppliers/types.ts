// Row shape returned from public.v_winning_suppliers_flat view
export interface FlatRow {
  qualification_id: string
  supplier_id: string
  supplier_name: string
  manof_number: string | null
  sigma_supplier_no: string | null
  sigma_agreement_no: string | null
  agreement_name: string | null
  valid_from: string | null
  valid_to: string | null
  is_active: boolean
  cluster_id: string
  cluster_name: string
  cluster_slug: string
  cluster_sort_order: number
  specialization_id: string
  specialization_name: string
  catalog_number: string | null
  size: 'גדול' | 'קטן' | null
  source_row: number | null
}

export interface Cluster {
  id: string
  name: string
  slug: string
  sort_order: number
  supplierCount: number
  specCount: number
  qualCount: number
}

export interface Specialty {
  id: string
  name: string
  clusterId: string
  clusterName: string
  catalog_number: string | null
  supplierCount: number
}

export interface SupplierSummary {
  id: string
  name: string
  manof_number: string | null
  sigma_supplier_no: string | null
  sigma_agreement_no: string | null
  agreement_name: string | null
  valid_from: string | null
  valid_to: string | null
  is_active: boolean
  quals: FlatRow[]
  clusters: string[]
  specCount: number
  largeCount: number
  smallCount: number
  undefinedCount: number
}

export type SizeFilter = 'all' | 'גדול' | 'קטן' | 'none'
