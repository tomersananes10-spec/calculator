import type { Cluster, Specialization } from '../../data/clusters'

export type ProjectSize = 'small' | 'large'
export type ServiceLocation = 'vendor' | 'client' | 'hybrid'
export type VendorMeeting = 'mandatory' | 'recommended' | 'none'

export interface DeliverableRow {
  id: string
  name: string
  selected: boolean
  quantity: number
  notes: string
}

export interface WorkPackageRow {
  id: string
  name: string
  size: 'small' | 'medium' | 'large' | 'fixed'
  description: string
  quantity: number
}

export interface TimelinePhase {
  id: string
  name: string
  startWeek: number
  durationWeeks: number
  keyDeliverable: string
  completionCriteria: string
}

export interface SlaRow {
  type: 'critical' | 'severe' | 'normal'
  description: string
  responseHours: number
  penaltyNIS: number
}

export interface CloudServiceItem {
  id: string
  serviceId: string
  serviceName: string
  provider: 'GCP' | 'AWS'
  unitType: 'per_month' | 'per_hour' | 'per_gb' | 'per_user'
  quantity: number
  months: number
  discountPct: number
  monthlyCost: number
}

export interface WizardState {
  currentStep: number
  identification: {
    projectName: string
    ministry: string
    tenderNumber: string
    writtenDate: string
    selectedCluster: Cluster | null
    selectedSpecialization: Specialization | null
    projectSize: ProjectSize
    estimatedBudget: number
  }
  currentSituation: {
    businessProblem: string
    existingSystems: string
    infrastructure: string
    dataVolumes: string
    mainGaps: string
  }
  existingArchitecture: {
    cloudProvider: string
    techStack: string
    databases: string
    externalInterfaces: string
    notes: string
  }
  projectDescription: {
    general: string
    requestedDeliverables: string
    technicalCharacteristics: string
    expectedBenefits: string
    targetAudience: string
    usersCount: string
  }
  deliverables: DeliverableRow[]
  workPackages: WorkPackageRow[]
  timeline: {
    estimatedStartDate: string
    totalDurationMonths: number
    phases: TimelinePhase[]
    warrantyMonths: number
    maintenanceMonths: number
  }
  management: {
    clientContactName: string
    clientContactRole: string
    serviceLocation: ServiceLocation
    weeklyMeetings: boolean
    steeringCommittee: boolean
    securityClassification: string
    testingRequirements: {
      unitTests: boolean
      acceptanceTests: boolean
      performanceTests: boolean
      penetrationTests: boolean
    }
    sla: SlaRow[]
    maintenancePeriodMonths: number
  }
  cloudServices: CloudServiceItem[]
  goals: {
    kpis: string
    successCriteria: string
    evaluationWeights: {
      vendorQuality: number
      proposalQuality: number
      price: number
    }
    budgetEstimateNIS: number
    paymentMilestones: string
  }
}

export interface BriefRecord {
  id: string
  user_id: string
  title: string
  cluster_id: string | null
  specialization_id: string | null
  status: 'draft' | 'submitted'
  state: WizardState
  created_at: string
  updated_at: string
}

const DEFAULT_SLA: SlaRow[] = [
  { type: 'critical', description: 'משביתת מערכת', responseHours: 0.5, penaltyNIS: 500 },
  { type: 'severe',   description: 'משביתת שירות', responseHours: 1,   penaltyNIS: 300 },
  { type: 'normal',   description: 'תקלה שאינה קריטית', responseHours: 3, penaltyNIS: 200 },
]

const DEFAULT_PHASES: TimelinePhase[] = [
  { id: 'p1', name: 'פגישת התנעה',   startWeek: 1,  durationWeeks: 1,  keyDeliverable: 'פגישות הכרות',      completionCriteria: 'אישור תוכנית עבודה' },
  { id: 'p2', name: 'אפיון טכני',    startWeek: 2,  durationWeeks: 4,  keyDeliverable: 'מסמך אפיון טכני',   completionCriteria: 'אישור המשרד בכתב' },
  { id: 'p3', name: 'פיתוח',         startWeek: 6,  durationWeeks: 12, keyDeliverable: 'תוצרי פיתוח',       completionCriteria: 'סיום בדיקות מסירה' },
  { id: 'p4', name: 'בדיקות קבלה',   startWeek: 18, durationWeeks: 3,  keyDeliverable: 'מסמך סיכום בדיקות', completionCriteria: 'אישור המשרד' },
  { id: 'p5', name: 'עלייה לאוויר',  startWeek: 21, durationWeeks: 1,  keyDeliverable: 'מוצר בייצור',       completionCriteria: 'עלייה לאוויר מוצלחת' },
  { id: 'p6', name: 'ייצוב ואחריות', startWeek: 22, durationWeeks: 52, keyDeliverable: 'שירותי אחריות',     completionCriteria: 'סיום תקופת האחריות' },
]

export const INITIAL_STATE: WizardState = {
  currentStep: 1,
  identification: {
    projectName: '',
    ministry: '',
    tenderNumber: '',
    writtenDate: new Date().toISOString().slice(0, 10),
    selectedCluster: null,
    selectedSpecialization: null,
    projectSize: 'small',
    estimatedBudget: 0,
  },
  currentSituation: {
    businessProblem: '',
    existingSystems: '',
    infrastructure: '',
    dataVolumes: '',
    mainGaps: '',
  },
  existingArchitecture: {
    cloudProvider: '',
    techStack: '',
    databases: '',
    externalInterfaces: '',
    notes: '',
  },
  projectDescription: {
    general: '',
    requestedDeliverables: '',
    technicalCharacteristics: '',
    expectedBenefits: '',
    targetAudience: '',
    usersCount: '',
  },
  deliverables: [],
  workPackages: [],
  cloudServices: [],
  timeline: {
    estimatedStartDate: '',
    totalDurationMonths: 12,
    phases: DEFAULT_PHASES,
    warrantyMonths: 12,
    maintenanceMonths: 24,
  },
  management: {
    clientContactName: '',
    clientContactRole: '',
    serviceLocation: 'hybrid',
    weeklyMeetings: true,
    steeringCommittee: true,
    securityClassification: 'רמה 5',
    testingRequirements: {
      unitTests: true,
      acceptanceTests: true,
      performanceTests: false,
      penetrationTests: false,
    },
    sla: DEFAULT_SLA,
    maintenancePeriodMonths: 24,
  },
  goals: {
    kpis: '',
    successCriteria: '',
    evaluationWeights: { vendorQuality: 20, proposalQuality: 50, price: 30 },
    budgetEstimateNIS: 0,
    paymentMilestones: 'תשלום עבור כל תוצר עם סיומו ואישורו על ידי המשרד.',
  },
}
