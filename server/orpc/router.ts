import { health } from './procedures/health'
import {
  deleteFilingFacts,
  finishRun,
  startRun,
  upsertDaily,
  upsertFacts,
  upsertMarket,
  upsertUpcoming,
} from './procedures/ingest'
import { snapshot as industrySnapshot, trend as industryTrend } from './procedures/industry'
import {
  detail as operatorsDetail,
  history as operatorsHistory,
  snapshot as operatorsSnapshot,
} from './procedures/operators'
import { snapshot as outlookSnapshot } from './procedures/outlook'

export const router = {
  health,
  ingest: {
    startRun,
    finishRun,
    upsertDaily,
    upsertMarket,
    upsertUpcoming,
    upsertFacts,
    deleteFilingFacts,
  },
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
