import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { paymentsApi, reportsApi, subscriptionsApi } from '../api'
import { useAuth } from '../auth/AuthContext'
import PhoneCheckoutModal, { handleCheckoutResponse } from '../components/payments/PhoneCheckoutModal'
import ReportPreviewContent from '../components/reports/ReportPreviewContent'
import { ReportQuotaBanner } from '../components/reports/ReportQuotaBanner'
import { useTranslation } from '../i18n/LocaleContext'

export default function ReportPreviewPage() {
  const { slug } = useParams<{ slug: string }>()
  const { user, hasPaidAccess } = useAuth()
  const { m } = useTranslation()
  const r = m.reports
  const p = m.pricing
  const queryClient = useQueryClient()
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [downloadError, setDownloadError] = useState('')

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['report', slug],
    queryFn: () => reportsApi.get(slug!).then((res) => res.data),
    enabled: !!slug,
  })

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionsApi.me().then((res) => res.data).catch(() => null),
    enabled: !!user && hasPaidAccess,
  })

  const purchase = useMutation({
    mutationFn: (payload: {
      paymentMethod: 'mobile_money' | 'card'
      msisdn?: string
      cardBrand?: 'visa' | 'mastercard'
      cardholderName?: string
      billingEmail?: string
    }) =>
      paymentsApi.checkout({
        order_type: 'download',
        report_id: report!.id,
        payment_method: payload.paymentMethod,
        msisdn: payload.msisdn,
        card_brand: payload.cardBrand,
        cardholder_name: payload.cardholderName,
        billing_email: payload.billingEmail,
      }),
    onSuccess: ({ data: checkoutData }) => {
      setCheckoutOpen(false)
      setCheckoutError('')
      handleCheckoutResponse(checkoutData)
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined
      setCheckoutError(typeof msg === 'string' ? msg : 'Payment could not be started. Try again.')
    },
  })

  const download = async () => {
    if (!slug) return
    setDownloadError('')
    try {
      const { data: blob } = await reportsApi.download(slug)
      const url = window.URL.createObjectURL(new Blob([blob]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${slug}.pdf`
      a.click()
      await queryClient.invalidateQueries({ queryKey: ['report', slug] })
      await queryClient.invalidateQueries({ queryKey: ['reports'] })
      await queryClient.invalidateQueries({ queryKey: ['subscription'] })
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined
      setDownloadError(typeof detail === 'string' ? detail : r.downloadFailed)
    }
  }

  const quota = subscription?.download_quota

  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <Link to="/downloads" className="text-sm text-terra-600 hover:text-terra-700 font-medium">
        ← {r.backToCatalog}
      </Link>

      {quota && !quota.unlimited && (
        <div className="mt-6">
          <ReportQuotaBanner quota={quota} />
        </div>
      )}

      {isLoading ? (
        <p className="mt-8 text-sm text-slate-500">{r.loading}</p>
      ) : isError || !report ? (
        <div className="mt-8 card text-center text-slate-500">{r.notFound}</div>
      ) : (
        <div className="mt-6">
          <ReportPreviewContent
            report={report}
            user={user}
            onPurchase={() => setCheckoutOpen(true)}
            onDownload={download}
            purchasePending={purchase.isPending}
            downloadError={downloadError}
          />
        </div>
      )}

      {report && (
        <PhoneCheckoutModal
          open={checkoutOpen}
          defaultPhone={user?.phone || ''}
          defaultEmail={user?.email || ''}
          title={r.checkoutTitle}
          description={r.checkoutDesc}
          productHint={
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
              <p className="font-medium text-slate-900">{report.title}</p>
              <p className="text-terra-700 font-semibold mt-0.5">
                {Number(report.price).toLocaleString()} {report.currency}
              </p>
            </div>
          }
          confirmLabel={r.payNow}
          labels={{
            back: p.back,
            cancel: r.cancel,
            mobileMoney: p.mobileMoney,
            card: p.card,
            mobileMoneyHint: p.mobileMoneyHint,
            mobileMoneyNumber: p.mobileMoneyNumber,
            mobileMoneyPlaceholder: p.mobileMoneyPlaceholder,
            cardDetailsSubtitle: p.cardDetailsSubtitle,
            continueToSecurePayment: p.continueToSecurePayment,
            nameOnCard: p.nameOnCard,
            billingEmail: p.billingEmail,
            visa: p.visa,
            mastercard: p.mastercard,
            continue: p.continueToPayment,
          }}
          loading={purchase.isPending}
          error={checkoutError}
          onCancel={() => {
            setCheckoutOpen(false)
            setCheckoutError('')
          }}
          onConfirm={(payload) => {
            setCheckoutError('')
            purchase.mutate(payload)
          }}
        />
      )}
    </div>
  )
}
