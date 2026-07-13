import { useQuery } from '@tanstack/react-query'
import { adsApi } from '../api'
import { useAuth } from '../auth/AuthContext'
import type { AdPlacement, PublicAd } from '../types'

export function usePlacementAds(placement: AdPlacement, countryCode = 'TZ') {
  const { user, hasPaidAccess } = useAuth()
  const audienceKey = user ? `${user.id}:${hasPaidAccess ? 'paid' : 'free'}` : 'anon'
  return useQuery({
    queryKey: ['ads', placement, countryCode, audienceKey],
    queryFn: () => adsApi.serve(placement, countryCode).then((r) => r.data),
    staleTime: 60_000,
  })
}

export function pickPrimaryAd(ads: PublicAd[] | undefined): PublicAd | null {
  if (!ads?.length) return null
  return ads[0]
}
