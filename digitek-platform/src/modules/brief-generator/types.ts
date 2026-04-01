import type { Cluster, Specialization } from '../../data/clusters'

export type ProjectSize = 'small' | 'large'

export interface Milestone {
  name: string
  date: string
  paymentPercent: number
}

export interface WizardState {
  currentStep: number
  selectedCluster: Cluster | null
  selectedSpecialization: Specialization | null
  projectDetails: {
    name: string
    ministry: string
    estimatedBudget: number
    projectSize: ProjectSize
    preferredVendor: string
  }
  projectDescription: {
    general: string
    currentSituation: string
    goals: string
  }
  selectedActivities: string[]
  timeline: {
    estimatedStartDate: string
    contractDuration: number
    milestones: Milestone[]
  }
  requirements: {
    securityClassification: boolean
    securityLevel: string
    maintenancePeriods: number
    vendorMeeting: 'mandatory' | 'recommended' | 'none'
    performanceBond: boolean
    serviceLocation: 'vendor' | 'client' | 'both'
  }
}

export const INITIAL_STATE: WizardState = {
  currentStep: 1,
  selectedCluster: null,
  selectedSpecialization: null,
  projectDetails: {
    name: '',
    ministry: '',
    estimatedBudget: 0,
    projectSize: 'small',
    preferredVendor: '',
  },
  projectDescription: {
    general: '',
    currentSituation: '',
    goals: '',
  },
  selectedActivities: [],
  timeline: {
    estimatedStartDate: '',
    contractDuration: 12,
    milestones: [],
  },
  requirements: {
    securityClassification: false,
    securityLevel: '',
    maintenancePeriods: 0,
    vendorMeeting: 'none',
    performanceBond: false,
    serviceLocation: 'vendor',
  },
}
