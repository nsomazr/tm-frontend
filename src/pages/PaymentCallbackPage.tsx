import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { paymentsApi } from '../api'

export default function PaymentCallbackPage() {
  const [params] = useSearchParams()
  const refParam = params.get('ref') || ''
  const ref = /^[a-f0-9]{32}$/i.test(refParam) ? refParam : ''
  const [attempts, setAttempts] = useState(0)

  const { data: order, refetch } = useQuery({
    queryKey: ['payment-status', ref],
    queryFn: () => paymentsApi.orderStatus(ref).then((r) => r.data),
    enabled: !!ref,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'completed' || status === 'failed' || attempts >= 24) return false
      return 5000
    },
  })

  useEffect(() => {
    if (!ref) return
    const timer = setInterval(() => {
      setAttempts((n) => n + 1)
      refetch()
    }, 5000)
    return () => clearInterval(timer)
  }, [ref, refetch])

  const status = order?.status || 'pending'
  const isDone = status === 'completed'
  const isFailed = status === 'failed'

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="card">
        <h1 className="text-2xl font-bold mb-4">
          {isDone ? 'Payment confirmed' : isFailed ? 'Payment failed' : 'Payment processing'}
        </h1>
        <p className="text-gray-600 mb-2">
          {isDone
            ? 'Your payment was successful. Your access is now active.'
            : isFailed
              ? 'The payment could not be completed. You can try again from subscriptions or downloads.'
              : 'Approve the mobile money prompt on your phone. This page will update automatically.'}
        </p>
        {ref && (
          <p className="text-xs text-slate-400 font-mono mb-6 break-all">Ref: {ref}</p>
        )}
        {!isDone && !isFailed && (
          <div className="mb-6 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-terra-600 border-t-transparent" />
          </div>
        )}
        <Link to={isDone ? '/dashboard' : '/subscriptions'} className="btn-primary">
          {isDone ? 'Go to Dashboard' : 'Back to subscriptions'}
        </Link>
      </div>
    </div>
  )
}
