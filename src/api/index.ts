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
  Country,
  CountryFocus,
  Region,
  Report,
  SavedExploration,
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
  savedExplorations: () =>
    api.get<PaginatedResponse<SavedExploration>>('/maps/saved-explorations/'),
  createSavedExploration: (data: {
    name: string
    mode: 'point' | 'line' | 'polygon'
    points: [number, number][]
  }) => api.post<SavedExploration>('/maps/saved-explorations/', data),
  deleteSavedExploration: (id: number) => api.delete(`/maps/saved-explorations/${id}/`),
  platformSettings: () => api.get<{ coordinate_system: string }>('/maps/settings/'),
  updatePlatformSettings: (data: { coordinate_system: string }) =>
    api.patch<{ coordinate_system: string }>('/maps/settings/', data),
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
    lat?: number
    lng?: number
    zoom?: number
    extra_km2?: number
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

function normalizeCountryList(
  data: Country[] | PaginatedResponse<Country>
): PaginatedResponse<Country> {
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data }
  }
  return data
}

export const geographyApi = {
  regions: () => api.get<PaginatedResponse<Region>>('/geography/regions/'),
  countries: () =>
    api
      .get<Country[] | PaginatedResponse<Country>>('/geography/countries/')
      .then((r) => ({ ...r, data: normalizeCountryList(r.data) })),
  countriesWithBoundaries: () =>
    api.get<Country[]>('/geography/countries/with-boundaries/'),
  countryFocus: (code: string) => api.get<CountryFocus>(`/geography/countries/${code}/focus/`),
  boundaries: (
    code: string,
    levels = '0,1,2,3,4',
    options?: { display?: boolean; offset?: number; limit?: number },
  ) =>
    api.get<{
      type: 'FeatureCollection'
      features: unknown[]
      meta?: { total: number; offset: number; limit: number; count: number }
    }>(`/geography/countries/${code}/boundaries/`, {
      params: {
        levels,
        ...(options?.display ? { display: 'true' } : {}),
        ...(options?.offset != null ? { offset: options.offset } : {}),
        ...(options?.limit != null ? { limit: options.limit } : {}),
      },
      timeout: levels.includes('4') ? 120_000 : 30_000,
    }),
  boundariesAllVillages: async (code: string) => {
    const { data } = await geographyApi.boundaries(code, '4', { display: true })
    if (data.features?.length) {
      return { type: 'FeatureCollection' as const, features: data.features }
    }
    const pageSize = 3000
    let offset = 0
    let total = Number.POSITIVE_INFINITY
    const features: unknown[] = []
    while (offset < total) {
      const { data: page } = await geographyApi.boundaries(code, '4', {
        display: true,
        offset,
        limit: pageSize,
      })
      features.push(...(page.features ?? []))
      total = page.meta?.total ?? features.length
      offset += page.features?.length ?? 0
      if (!page.features?.length) break
    }
    return { type: 'FeatureCollection' as const, features }
  },
  boundariesAt: (code: string, lat: number, lng: number) =>
    api.get<import('../types').AdminBoundaryAtResponse>(
      `/geography/countries/${code}/boundaries/at/`,
      { params: { lat, lng } }
    ),
  adminBoundaryStats: (country = 'TZ') =>
    api.get<import('../types').AdminBoundaryStats>('/geography/admin/boundaries/', {
      params: { country },
    }),
  importBoundaries: (form: FormData) =>
    api.post<{ task_id?: string; status?: string; imported?: number; country?: string; level?: number }>(
      '/geography/admin/boundaries/import/',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),
  boundaryImportStatus: (taskId: string) =>
    api.get<{
      task_id: string
      status: 'processing' | 'completed' | 'failed'
      phase?: string
      done?: number
      total?: number
      imported?: number
      country?: string
      level?: number
      error?: string
    }>(`/geography/admin/boundaries/import/${taskId}/`),
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
  syncManagerMinerals: (data: { user: number; minerals: number[]; can_publish?: boolean }) =>
    api.post<MineralManagerAssignment[]>('/minerals/managers/sync/', data),
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
  adminManagerPerformance: () =>
    api.get<import('../types').ManagerPerformanceReview>('/analytics/admin/managers/'),
  mineralExploration: () =>
    api.get<import('../types').MineralExplorationQuota>('/analytics/mineral-exploration/'),
  searchInsights: (q: string) =>
    api.get<{ results: MineralSearchInsight[] }>('/analytics/search-insights/', { params: { q } }),
  mineralCatalog: (country = 'TZ') =>
    api.get<import('../types').MineralCatalogResponse>(
      '/analytics/mineral-catalog/',
      { params: { country } }
    ),
  mineralCoverage: (slug: string, options?: { country?: string; includeVillages?: boolean }) =>
    api.get<import('../types').MineralBoundaryCoverage>(`/analytics/minerals/${slug}/coverage/`, {
      params: {
        country: options?.country,
        ...(options?.includeVillages ? { include_villages: 'true' } : {}),
      },
    }),
  mineralHeatmap: (slug: string, options?: { country?: string; layerIds?: number[] }) =>
    api.get<import('../types').MineralHeatmapData>(`/analytics/minerals/${slug}/heatmap/`, {
      params: {
        country: options?.country,
        ...(options?.layerIds?.length
          ? { layer_ids: options.layerIds.join(',') }
          : {}),
      },
    }),
  searchContextInsights: (params: {
    mineral_slug?: string
    region_id?: number
    layer_id?: number
    boundary_id?: number
  }) =>
    api.get<AreaInsight>('/analytics/search-context-insights/', { params }),
  areaInsights: (
    lat: number,
    lng: number,
    zoom: number,
    options?: { featureIds?: number[]; country?: string; boundaryId?: number }
  ) =>
    api.get<AreaInsight>('/analytics/area-insights/', {
      params: {
        lat,
        lng,
        zoom,
        ...(options?.featureIds?.length ? { feature_ids: options.featureIds.join(',') } : {}),
        ...(options?.country ? { country: options.country } : {}),
        ...(options?.boundaryId != null ? { boundary_id: options.boundaryId } : {}),
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
    layerId?: number
    regionId?: number
    boundaryId?: number
    countryCode?: string
    threadKey?: string
  }) =>
    api.post<AssistantChatResponse>('/analytics/assistant/chat/', {
      question: payload.question,
      messages: payload.messages,
      mode: payload.mode || 'map',
      ...(payload.lat != null ? { lat: payload.lat, lng: payload.lng, zoom: payload.zoom ?? 8 } : {}),
      ...(payload.featureIds?.length ? { feature_ids: payload.featureIds } : {}),
      ...(payload.mineralSlug ? { mineral_slug: payload.mineralSlug } : {}),
      ...(payload.layerId != null ? { layer_id: payload.layerId } : {}),
      ...(payload.regionId != null ? { region_id: payload.regionId } : {}),
      ...(payload.boundaryId != null ? { boundary_id: payload.boundaryId } : {}),
      ...(payload.countryCode ? { country: payload.countryCode } : {}),
      ...(payload.threadKey ? { thread_key: payload.threadKey } : {}),
    }),
  exportInsightReport: (payload: {
    mode?: 'map' | 'account'
    sections: string[]
    messages?: AssistantMessage[]
    mapSnapshot?: string
    lat?: number
    lng?: number
    zoom?: number
    featureIds?: number[]
    mineralSlug?: string
    regionId?: number
    boundaryId?: number
    countryCode?: string
  }) =>
    api.post('/analytics/assistant/export-report/', {
      mode: payload.mode || 'account',
      sections: payload.sections,
      messages: payload.messages ?? [],
      ...(payload.mapSnapshot ? { map_snapshot: payload.mapSnapshot } : {}),
      ...(payload.lat != null ? { lat: payload.lat, lng: payload.lng, zoom: payload.zoom ?? 8 } : {}),
      ...(payload.featureIds?.length ? { feature_ids: payload.featureIds } : {}),
      ...(payload.mineralSlug ? { mineral_slug: payload.mineralSlug } : {}),
      ...(payload.regionId != null ? { region_id: payload.regionId } : {}),
      ...(payload.boundaryId != null ? { boundary_id: payload.boundaryId } : {}),
      ...(payload.countryCode ? { country: payload.countryCode } : {}),
    }, { responseType: 'blob' }),
}
