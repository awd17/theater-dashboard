import { health } from './procedures/health'
import { snapshot as industrySnapshot } from './procedures/industry'
import { snapshot as operatorsSnapshot } from './procedures/operators'
import { snapshot as outlookSnapshot } from './procedures/outlook'

export const router = {
  health,
  industry: {
    snapshot: industrySnapshot,
  },
  outlook: {
    snapshot: outlookSnapshot,
  },
  operators: {
    snapshot: operatorsSnapshot,
  },
}
