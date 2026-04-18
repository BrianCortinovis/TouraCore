import type { BikeChannelAdapter, BikeChannelProvider } from './types'
import { bokunAdapter } from './adapters/bokun'

/**
 * Dispatch to provider-specific adapter.
 * M046 Phase 2A: bokun only. M046 Phase 2B+ add rezdy, gyg, octo, etc.
 */
export function getAdapter(provider: BikeChannelProvider): BikeChannelAdapter | null {
  switch (provider) {
    case 'bokun':
      return bokunAdapter
    // M046+ stubs (return null for now, admin UI disables sync)
    case 'rezdy':
    case 'getyourguide':
    case 'viator':
    case 'fareharbor':
    case 'regiondo':
    case 'checkfront':
    case 'octo_ventrata':
    case 'listnride':
    case 'civitatis':
    case 'klook':
    case 'musement':
    case 'tiqets':
    case 'headout':
    case 'bikesbooking':
    case 'komoot':
    case 'bikemap':
      return null
    default:
      return null
  }
}
