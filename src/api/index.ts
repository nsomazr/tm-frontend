import api from './client'
import type {
  AdminRevenueSummary,
  AssistantChatResponse,
  AssistantMessage,
  AuditLog,
  AreaInsight,
  Invoice,
  LicenseAgreement,
  MapFeature,
  MapLayer,
  LayerUpload,
  LayerVersion,
  Mineral,
  MineralManagerAssignment,
  MineralSearchInsight,
  PaginatedResponse,
  PaymentOrder,
  Region,
  Report,
  SubscriptionPlan,
  User,
  UserSubscription,
  MyReport,
} from '../types'

export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login/', { username, password }),
  register: (data: Record<string, string>) => api.post('/auth/register/', data),
  sendOtp: (email: string, purpose: 'register' | 'login') =>
    api.post('/auth/otp/send/', { email, purpose }),
  verifyOtp: (email: string, code: string, purpose: 'register' | 'login') =>
    api.post('/auth/otp/verify/', { email, code, purpose }),
  signupPassword: (email: string, password: string) =>
    api.post('/auth/signup/password/', { email, password }),
  completeProfile: (data: Record<string, string>) =>
    api.patch('/auth/complete-profile/', data),
  me: () => api.get<User>('/auth/me/'),
}

export const mineralsApi = {
  list: () => api.get<PaginatedResponse<Mineral>>('/minerals/'),
  get: (slug: string) => api.get<Mineral>(`/minerals/${slug}/`),
  layers: (slug: string) => api.get<MapLayer[]>(`/minerals/${slug}/layers/`),
  create: (data: Partial<Mineral>) => api.post('/minerals/', data),
  update: (slug: string, data: Partial<Mineral>) => api.patch(`/minerals/${slug}/`, data),
}

export const mapsApi = {
  layers: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<MapLayer>>('/maps/layers/', { params }),
  layer: (slug: string) => api.get<MapLayer>(`/maps/layers/${slug}/`),
  geojson: (slug: string) => api.get(`/maps/layers/${slug}/geojson/`),
  reorder: (layerIds: number[]) => api.patch('/maps/layers/reorder/', { layer_ids: layerIds }),
  features: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<MapFeature>>('/maps/features/', { params }),
  createFeature: (data: Partial<MapFeature>) => api.post('/maps/features/', data),
  updateFeature: (id: number, data: Partial<MapFeature>) => api.patch(`/maps/features/${id}/`, data),
  deleteFeature: (id: number) => api.delete(`/maps/features/${id}/`),
  bulkImport: (slug: string, file: File, fileType?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (fileType) form.append('file_type', fileType)
    return api.post(`/maps/layers/${slug}/bulk_import/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  sampleShapefile: (slug: string) =>
    api.get(`/maps/layers/${slug}/sample_shapefile/`, { responseType: 'blob' }),
  createLayer: (data: Partial<MapLayer>) => api.post('/maps/layers/', data),
  updateLayer: (slug: string, data: Partial<MapLayer>) => api.patch(`/maps/layers/${slug}/`, data),
  deleteLayer: (slug: string) => api.delete(`/maps/layers/${slug}/`),
  versions: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<LayerVersion>>('/maps/versions/', { params }),
  uploads: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<LayerUpload>>('/maps/uploads/', { params }),
}

export const subscriptionsApi = {
  plans: () => api.get<PaginatedResponse<SubscriptionPlan>>('/subscriptions/plans/'),
  me: () => api.get<UserSubscription>('/subscriptions/me/'),
  purchases: () => api.get<MyReport[]>('/subscriptions/purchases/'),
}

export const paymentsApi = {
  checkout: (data: {
    order_type: string
    plan_id?: number
    report_id?: number
    license_id?: number
    msisdn?: string
    payment_method?: 'mobile_money' | 'card'
    card_brand?: 'visa' | 'mastercard'
    cardholder_name?: string
    billing_email?: string
  }) => api.post('/payments/checkout/', data),
  orderStatus: (reference: string) => api.get<PaymentOrder>(`/payments/orders/${reference}/status/`),
  invoices: () => api.get<Invoice[]>('/payments/invoices/'),
  revenue: () => api.get<AdminRevenueSummary>('/payments/admin/revenue/'),
  adminOrders: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<PaymentOrder>>('/payments/admin/orders/', { params }),
  adminOrder: (reference: string) => api.get<PaymentOrder>(`/payments/admin/orders/${reference}/`),
  refreshOrder: (reference: string) => api.post<PaymentOrder>(`/payments/admin/orders/${reference}/refresh/`),
  completeOrder: (reference: string) => api.post<PaymentOrder>(`/payments/admin/orders/${reference}/complete/`),
}

export interface ReportAiDraftResponse {
  executive_summary: string
  key_findings: string[]
  assistant_reply: string
  model_used: string
}

export const reportsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Report>>('/reports/', { params }),
  get: (slug: string) => api.get<Report>(`/reports/${slug}/`),
  download: (slug: string) => api.get(`/reports/${slug}/download/`, { responseType: 'blob' }),
  adminList: () => api.get<PaginatedResponse<Report>>('/reports/admin/'),
  adminGet: (slug: string) => api.get<Report>(`/reports/admin/${slug}/`),
  create: (data: FormData | Record<string, unknown>) =>
    data instanceof FormData
      ? api.post('/reports/admin/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      : api.post('/reports/admin/', data),
  adminUpdate: (slug: string, data: FormData | Record<string, unknown>) =>
    data instanceof FormData
      ? api.patch(`/reports/admin/${slug}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
      : api.patch(`/reports/admin/${slug}/`, data),
  adminDelete: (slug: string) => api.delete(`/reports/admin/${slug}/`),
  adminAiAssist: (data: FormData) =>
    api.post<ReportAiDraftResponse>('/reports/admin/ai-assist/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  adminGeneratePdf: (slug: string, force = false) =>
    api.post(`/reports/admin/${slug}/generate-pdf/`, { force }),
}

export const geographyApi = {
  regions: () => api.get<PaginatedResponse<Region>>('/geography/regions/'),
}

export const adminApi = {
  users: () => api.get<PaginatedResponse<User>>('/admin/users/'),
  createAdmin: (data: {
    email: string
    password: string
    first_name?: string
    last_name?: string
    role: 'admin' | 'super_admin'
    phone?: string
  }) => api.post<User>('/admin/users/', data),
  updateUser: (id: number, data: Partial<User>) => api.patch(`/admin/users/${id}/`, data),
  mineralManagers: () => api.get<PaginatedResponse<MineralManagerAssignment>>('/minerals/managers/'),
  assignManager: (data: { user: number; mineral: number; can_publish?: boolean }) =>
    api.post('/minerals/managers/', data),
  removeManager: (id: number) => api.delete(`/minerals/managers/${id}/`),
  subscriptions: () => api.get('/subscriptions/admin/list/'),
  auditLogs: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<AuditLog>>('/compliance/audit-logs/', { params }),
  licenses: () => api.get<PaginatedResponse<LicenseAgreement>>('/compliance/licenses/'),
  updateLicense: (id: number, data: Partial<LicenseAgreement>) =>
    api.patch(`/compliance/licenses/${id}/`, data),
}

export const analyticsApi = {
  hotspots: (mineral?: string) =>
    api.get('/analytics/hotspots/', { params: mineral ? { mineral } : {} }),
  investor: () => api.get('/analytics/investor/'),
  adminPlatform: () => api.get<import('../types').AdminPlatformAnalytics>('/analytics/admin/'),
  searchInsights: (q: string) =>
    api.get<{ results: MineralSearchInsight[] }>('/analytics/search-insights/', { params: { q } }),
  searchContextInsights: (params: { mineral_slug?: string; region_id?: number }) =>
    api.get<AreaInsight>('/analytics/search-context-insights/', { params }),
  areaInsights: (lat: number, lng: number, zoom: number, featureIds?: number[]) =>
    api.get<AreaInsight>('/analytics/area-insights/', {
      params: {
        lat,
        lng,
        zoom,
        ...(featureIds?.length ? { feature_ids: featureIds.join(',') } : {}),
      },
    }),
  assistantCredits: () =>
    api.get<{ assistant_credits: import('../types').AssistantCredits }>('/analytics/assistant/credits/'),
  assistantHistory: (params: {
    mode?: 'map' | 'account'
    thread_key?: string
    lat?: number
    lng?: number
    zoom?: number
    mineralSlug?: string
    regionId?: number
  }) =>
    api.get<{
      thread_key: string
      chat_history: boolean
      messages: AssistantMessage[]
    }>('/analytics/assistant/history/', {
      params: {
        mode: params.mode,
        thread_key: params.thread_key,
        lat: params.lat,
        lng: params.lng,
        zoom: params.zoom,
        mineral_slug: params.mineralSlug,
        region_id: params.regionId,
      },
    }),
  assistantChat: (payload: {
    question: string
    messages: AssistantMessage[]
    mode?: 'map' | 'account'
    lat?: number
    lng?: number
    zoom?: number
    featureIds?: number[]
    mineralSlug?: string
    regionId?: number
    threadKey?: string
  }) =>
    api.post<AssistantChatResponse>('/analytics/assistant/chat/', {
      question: payload.question,
      messages: payload.messages,
      mode: payload.mode || 'map',
      ...(payload.lat != null ? { lat: payload.lat, lng: payload.lng, zoom: payload.zoom ?? 8 } : {}),
      ...(payload.featureIds?.length ? { feature_ids: payload.featureIds } : {}),
      ...(payload.mineralSlug ? { mineral_slug: payload.mineralSlug } : {}),
      ...(payload.regionId != null ? { region_id: payload.regionId } : {}),
      ...(payload.threadKey ? { thread_key: payload.threadKey } : {}),
    }),
}
