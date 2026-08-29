import { health } from './procedures/health'
import { snapshot as industrySnapshot, trend as industryTrend } from './procedures/industry'
import {
  detail as operatorsDetail,
  history as operatorsHistory,
  snapshot as operatorsSnapshot,
} from './procedures/operators'
import { snapshot as outlookSnapshot } from './procedures/outlook'

export const router = {
  health,
  industry: {
    snapshot: industrySnapshot,
    trend: industryTrend,
  },
  outlook: {
    snapshot: outlookSnapshot,
  },
  operators: {
    snapshot: operatorsSnapshot,
    history: operatorsHistory,
    detail: operatorsDetail,
  },
}
