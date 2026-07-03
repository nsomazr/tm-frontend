import { useQuery } from '@tanstack/react-query'

const RATE_URL = 'https://api.exchangerate-api.com/v4/latest/TZS'
const STALE_MS = 60 * 60 * 1000

async function fetchTzsToUsd(): Promise<number> {
  const res = await fetch(RATE_URL)
  if (!res.ok) throw new Error('Exchange rate unavailable')
  const data = (await res.json()) as { rates?: { USD?: number } }
  const rate = data.rates?.USD
  if (typeof rate !== 'number' || rate <= 0) throw new Error('Invalid USD rate')
  return rate
}

export function useTzsUsdRate() {
  return useQuery({
    queryKey: ['tzs-usd-rate'],
    queryFn: fetchTzsToUsd,
    staleTime: STALE_MS,
    gcTime: STALE_MS * 2,
    retry: 2,
    refetchOnWindowFocus: false,
  })
}

export function tzsToUsd(amountTzs: number, rate: number): number {
  return amountTzs * rate
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
