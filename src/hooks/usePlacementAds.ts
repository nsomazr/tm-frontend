import { useQuery } from '@tanstack/react-query'
import { adsApi } from '../api'
import type { AdPlacement, PublicAd } from '../types'

export function usePlacementAds(placement: AdPlacement, countryCode = 'TZ') {
  return useQuery({
    queryKey: ['ads', placement, countryCode],
    queryFn: () => adsApi.serve(placement, countryCode).then((r) => r.data),
    staleTime: 60_000,
  })
}

export function pickPrimaryAd(ads: PublicAd[] | undefined): PublicAd | null {
  if (!ads?.length) return null
  return ads[0]
}
