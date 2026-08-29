import { health } from './procedures/health'
import { snapshot } from './procedures/industry'

export const router = {
  health,
  industry: {
    snapshot,
  },
}
