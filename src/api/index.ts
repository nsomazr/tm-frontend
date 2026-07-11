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

export type OtpPurpose = 'register' | 'login'
export type OtpChannel = 'email' | 'sms'

export interface SendOtpPayload {
  purpose: OtpPurpose
  email?: string
  phone?: string
}

export interface VerifyOtpPayload extends SendOtpPayload {
  code: string
}

export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login/', { username, password }),
  register: (data: Record<string, string>) => api.post('/auth/register/', data),
  sendOtp: (payload: SendOtpPayload) => api.post('/auth/otp/send/', payload),
  verifyOtp: (payload: VerifyOtpPayload) => api.post('/auth/otp/verify/', payload),
  signupPassword: (email: string, password: string) =>
    api.post('/auth/signup/password/', { email, password }),
  completeProfile: (data: Record<string, string>) =>
    api.patch('/auth/complete-profile/', data),
  me: () => api.get<User>('/auth/me/'),
}

export const mineralsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Mineral>>('/minerals/', { params }),
  get: (slug: string) => api.get<Mineral>(`/minerals/${slug}/`),
  layers: (slug: string) => api.get<MapLayer[]>(`/minerals/${slug}/layers/`),
  create: (data: Partial<Mineral>) => api.post('/minerals/', data),
  update: (slug: string, data: Partial<Mineral>) => api.patch(`/minerals/${slug}/`, data),
}

function layerLookupParams(mineralSlug?: string) {
  return mineralSlug ? { mineral_slug: mineralSlug } : undefined
}

export const mapsApi = {
  layers: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<MapLayer>>('/maps/layers/', { params }),
  layer: (slug: string, mineralSlug?: string) =>
    api.get<MapLayer>(`/maps/layers/${slug}/`, { params: layerLookupParams(mineralSlug) }),
  geojson: (slug: string, mineralSlug?: string) =>
    api.get(`/maps/layers/${slug}/geojson/`, { params: layerLookupParams(mineralSlug) }),
  reorder: (layerIds: number[]) => api.patch('/maps/layers/reorder/', { layer_ids: layerIds }),
  features: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<MapFeature>>('/maps/features/', { params }),
  createFeature: (data: Partial<MapFeature>) => api.post('/maps/features/', data),
  updateFeature: (id: number, data: Partial<MapFeature>) => api.patch(`/maps/features/${id}/`, data),
  deleteFeature: (id: number) => api.delete(`/maps/features/${id}/`),
  bulkImport: (
    slug: string,
    file: File,
    fileType?: string,
    mineralSlug?: string,
    importMode?: 'replace' | 'append',
    onUploadProgress?: (percent: number) => void,
  ) => {
    const form = new FormData()
    form.append('file', file)
    if (fileType) form.append('file_type', fileType)
    if (importMode) form.append('import_mode', importMode)
    return api.post(`/maps/layers/${slug}/bulk_import/`, form, {
      params: layerLookupParams(mineralSlug),
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (!onUploadProgress) return
        if (event.total && event.total > 0) {
          onUploadProgress(Math.min(100, Math.round((event.loaded * 100) / event.total)))
        } else if (event.loaded > 0) {
          onUploadProgress(1)
        }
      },
    })
  },
  sampleShapefile: (slug: string, mineralSlug?: string) =>
    api.get(`/maps/layers/${slug}/sample_shapefile/`, {
      params: layerLookupParams(mineralSlug),
      responseType: 'blob',
    }),
  createLayer: (data: Partial<MapLayer>) => api.post('/maps/layers/', data),
  updateLayer: (slug: string, data: Partial<MapLayer>, mineralSlug?: string) =>
    api.patch(`/maps/layers/${slug}/`, data, { params: layerLookupParams(mineralSlug) }),
  deleteLayer: (slug: string, mineralSlug?: string) =>
    api.delete(`/maps/layers/${slug}/`, { params: layerLookupParams(mineralSlug) }),
  versions: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<LayerVersion>>('/maps/versions/', { params }),
  uploads: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<LayerUpload>>('/maps/uploads/', { params }),
  savedExplorations: () =>
    api
      .get<SavedExploration[] | PaginatedResponse<SavedExploration>>('/maps/saved-explorations/')
      .then((r) => (Array.isArray(r.data) ? r.data : r.data.results)),
  createSavedExploration: (data: {
    name: string
    mode: 'point' | 'line' | 'polygon'
    points: [number, number][]
  }) => api.post<SavedExploration>('/maps/saved-explorations/', data),
  deleteSavedExploration: (id: number) => api.delete(`/maps/saved-explorations/${id}/`),
  platformSettings: (country = 'TZ') =>
    api.get<{ country: string; coordinate_system: string }>('/maps/settings/', {
      params: { country },
    }),
  updatePlatformSettings: (data: { country: string; coordinate_system: string }) =>
    api.patch<{ country: string; coordinate_system: string }>('/maps/settings/', data),
}

/** Load every page of map layers (admin reorder/arrange needs the full stack). */
export async function fetchAllMapLayers(params: Record<string, string> = {}): Promise<MapLayer[]> {
  const items: MapLayer[] = []
  let page = 1
  for (;;) {
    const { data } = await mapsApi.layers({ ...params, page: String(page) })
    items.push(...data.results)
    if (!data.next) break
    page += 1
  }
  return items
}

/** Load every page of minerals for admin commodity pickers. */
export async function fetchAllMinerals(): Promise<import('../types').Mineral[]> {
  const items: import('../types').Mineral[] = []
  let page = 1
  for (;;) {
    const { data } = await mineralsApi.list({ page: String(page) })
    items.push(...data.results)
    if (!data.next) break
    page += 1
  }
  return items
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
  generateInvoice: (reference: string, regenerate = false) =>
    api.post<PaymentOrder>(`/payments/admin/orders/${reference}/invoice/generate/`, { regenerate }),
  downloadInvoice: (reference: string) =>
    api.get(`/payments/admin/orders/${reference}/invoice/download/`, { responseType: 'blob' }),
  emailInvoice: (reference: string, email?: string) =>
    api.post<PaymentOrder>(`/payments/admin/orders/${reference}/invoice/email/`, email ? { email } : {}),
  generateReceipt: (reference: string, regenerate = false) =>
    api.post<PaymentOrder>(`/payments/admin/orders/${reference}/receipt/generate/`, { regenerate }),
  downloadReceipt: (reference: string) =>
    api.get(`/payments/admin/orders/${reference}/receipt/download/`, { responseType: 'blob' }),
  emailReceipt: (reference: string, email?: string) =>
    api.post<PaymentOrder>(`/payments/admin/orders/${reference}/receipt/email/`, email ? { email } : {}),
}

export interface ReportAiDraftResponse {
  executive_summary: string
  key_findings: string[]
  assistant_reply: string
  model_used: string
  web_search?: {
    requested?: boolean
    used?: boolean
    source_count?: number
    warning?: string | null
  }
}

export const reportsApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Report>>('/reports/', { params }),
  get: (slug: string) => api.get<Report>(`/reports/${slug}/`),
  contextual: (params: Record<string, string>) =>
    api.get<{ results: Report[] }>('/reports/contextual/', { params }),
  download: (slug: string) => api.get(`/reports/${slug}/download/`, { responseType: 'blob' }),
  chat: (slug: string) => api.get<{ messages: import('../types').ReportChatMessage[] }>(`/reports/${slug}/chat/`),
  sendChat: (slug: string, message: string) =>
    api.post<{
      reply: string
      model_used: string
      citations: { page_number: number; excerpt: string }[]
      messages: import('../types').ReportChatMessage[]
    }>(`/reports/${slug}/chat/`, { message }, { timeout: 120_000 }),
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
    api.post<ReportAiDraftResponse>('/reports/admin/ai-assist/', data),
  adminGeneratePdf: (slug: string, force = false) =>
    api.post(`/reports/admin/${slug}/generate-pdf/`, { force }),
  explorationList: () => api.get<PaginatedResponse<import('../types').UserExplorationReport>>('/reports/exploration/'),
  explorationGet: (id: number) => api.get<import('../types').UserExplorationReport>(`/reports/exploration/${id}/`),
  explorationGenerate: (data: { prompt: string; title?: string; context?: Record<string, unknown> }) =>
    api.post<import('../types').UserExplorationReport>('/reports/exploration/generate/', data),
  explorationRefine: (id: number, revision_notes: string) =>
    api.post<import('../types').UserExplorationReport>(`/reports/exploration/${id}/refine/`, { revision_notes }),
  explorationExportPdf: (id: number) =>
    api.post<import('../types').UserExplorationReport>(`/reports/exploration/${id}/export-pdf/`),
  explorationDownload: (id: number) =>
    api.get(`/reports/exploration/${id}/download/`, { responseType: 'blob' }),
  explorationDelete: (id: number) => api.delete(`/reports/exploration/${id}/`),
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
  adminBoundaryItems: (params: { country?: string; level?: number; q?: string }) =>
    api.get<{ country: string; results: import('../types').AdminBoundaryListItem[] }>(
      '/geography/admin/boundaries/items/',
      { params }
    ),
  adminBoundaryGeology: (boundaryId: number) =>
    api.get<import('../types').AdminBoundaryGeology>(
      `/geography/admin/boundaries/${boundaryId}/geology/`
    ),
  updateAdminBoundaryGeology: (
    boundaryId: number,
    payload: Partial<
      Pick<
        import('../types').AdminBoundaryGeology,
        'geological_summary' | 'geological_summary_sw' | 'geological_metadata'
      >
    >
  ) => api.patch<import('../types').AdminBoundaryGeology>(
    `/geography/admin/boundaries/${boundaryId}/geology/`,
    payload
  ),
  uploadBoundaryGeologyDocument: (boundaryId: number, form: FormData) =>
    api.post<import('../types').BoundaryGeologyDocument>(
      `/geography/admin/boundaries/${boundaryId}/geology/documents/`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),
  deleteBoundaryGeologyDocument: (boundaryId: number, documentId: number) =>
    api.delete(`/geography/admin/boundaries/${boundaryId}/geology/documents/${documentId}/`),
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
  updateUser: (id: number, data: Partial<User>) => api.patch<User>(`/admin/users/${id}/`, data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}/`),
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
  adminMineralAnalytics: () =>
    api.get<import('../types').AdminMineralAnalytics>('/analytics/admin/minerals/'),
  adminUserActivity: () =>
    api.get<import('../types').AdminUserActivityAnalytics>('/analytics/admin/user-activity/'),
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
  layerCoverage: (layerIds: number[], options?: { country?: string; includeVillages?: boolean }) =>
    api.get<import('../types').LayerBoundaryCoverage>('/analytics/layers/coverage/', {
      params: {
        layer_ids: layerIds.join(','),
        country: options?.country,
        ...(options?.includeVillages ? { include_villages: 'true' } : {}),
      },
    }),
  mineralHeatmap: (
    slug: string,
    options: { country?: string; layerIds?: number[] } = {},
  ) =>
    api.get<import('../types').MineralHeatmapData>(`/analytics/minerals/${slug}/heatmap/`, {
      params: {
        country: options.country,
        ...(options.layerIds?.length
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
    options?: {
      featureIds?: number[]
      visibleLayerIds?: number[]
      country?: string
      boundaryId?: number
      explorationGeometry?: import('../components/map/explorationGeometry').DrawGeometry
      basemap?: import('../components/map/basemaps').BasemapId
      mapSnapshot?: string
    }
  ) => {
    const payload = {
      lat,
      lng,
      zoom,
      ...(options?.featureIds?.length ? { feature_ids: options.featureIds } : {}),
      ...(options?.visibleLayerIds?.length
        ? { visible_layer_ids: options.visibleLayerIds }
        : {}),
      ...(options?.country ? { country: options.country } : {}),
      ...(options?.boundaryId != null ? { boundary_id: options.boundaryId } : {}),
      ...(options?.basemap ? { basemap: options.basemap } : {}),
      ...(options?.explorationGeometry
        ? { exploration_geometry: options.explorationGeometry }
        : {}),
      ...(options?.mapSnapshot ? { map_snapshot: options.mapSnapshot } : {}),
    }
    if (options?.mapSnapshot) {
      return api.post<AreaInsight>('/analytics/area-insights/', payload)
    }
    return api.get<AreaInsight>('/analytics/area-insights/', {
      params: {
        lat,
        lng,
        zoom,
        ...(options?.featureIds?.length ? { feature_ids: options.featureIds.join(',') } : {}),
        ...(options?.visibleLayerIds?.length
          ? { visible_layer_ids: options.visibleLayerIds.join(',') }
          : {}),
        ...(options?.country ? { country: options.country } : {}),
        ...(options?.boundaryId != null ? { boundary_id: options.boundaryId } : {}),
        ...(options?.basemap ? { basemap: options.basemap } : {}),
        ...(options?.explorationGeometry
          ? { exploration_geometry: JSON.stringify(options.explorationGeometry) }
          : {}),
      },
    })
  },
  assistantCredits: () =>
    api.get<{ assistant_credits: import('../types').AssistantCredits }>('/analytics/assistant/credits/'),
  assistantSettings: () =>
    api.get<import('../types').AssistantPlatformSettings>('/analytics/assistant/settings/'),
  updateAssistantSettings: (payload: {
    ai_provider: 'groq' | 'gemini' | 'ollama'
    ai_provider_fallback: Array<'groq' | 'gemini' | 'ollama'>
  }) => api.patch<import('../types').AssistantPlatformSettings>('/analytics/assistant/settings/', payload),
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
    visibleLayerIds?: number[]
    mineralSlug?: string
    layerId?: number
    regionId?: number
    boundaryId?: number
    countryCode?: string
    threadKey?: string
    explorationGeometry?: import('../components/map/explorationGeometry').DrawGeometry
    basemap?: import('../components/map/basemaps').BasemapId
  }) =>
    api.post<AssistantChatResponse>('/analytics/assistant/chat/', {
      question: payload.question,
      messages: payload.messages,
      mode: payload.mode || 'map',
      ...(payload.lat != null ? { lat: payload.lat, lng: payload.lng, zoom: payload.zoom ?? 8 } : {}),
      ...(payload.featureIds?.length ? { feature_ids: payload.featureIds } : {}),
      ...(payload.visibleLayerIds?.length
        ? { visible_layer_ids: payload.visibleLayerIds }
        : {}),
      ...(payload.mineralSlug ? { mineral_slug: payload.mineralSlug } : {}),
      ...(payload.layerId != null ? { layer_id: payload.layerId } : {}),
      ...(payload.regionId != null ? { region_id: payload.regionId } : {}),
      ...(payload.boundaryId != null ? { boundary_id: payload.boundaryId } : {}),
      ...(payload.countryCode ? { country: payload.countryCode } : {}),
      ...(payload.threadKey ? { thread_key: payload.threadKey } : {}),
      ...(payload.basemap ? { basemap: payload.basemap } : {}),
      ...(payload.explorationGeometry
        ? { exploration_geometry: payload.explorationGeometry }
        : {}),
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
    explorationGeometry?: import('../components/map/explorationGeometry').DrawGeometry
    analysisAreaKm2?: number
    basemap?: import('../components/map/basemaps').BasemapId
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
      ...(payload.analysisAreaKm2 != null ? { analysis_area_km2: payload.analysisAreaKm2 } : {}),
      ...(payload.basemap ? { basemap: payload.basemap } : {}),
      ...(payload.explorationGeometry
        ? { exploration_geometry: payload.explorationGeometry }
        : {}),
    }, { responseType: 'blob' }),
}

export const adsApi = {
  serve: (placement: string, country?: string) =>
    api.get<import('../types').PublicAd[]>('/ads/serve/', {
      params: { placement, ...(country ? { country } : {}) },
    }),
  track: (payload: { ad_id: number; kind: 'impression' | 'click'; placement: string }) =>
    api.post('/ads/track/', payload, {
      headers: { 'X-Ad-Session': getAdSessionId() },
    }),
  adminList: () =>
    api.get<import('../types').AdCampaign[] | import('../types').PaginatedResponse<import('../types').AdCampaign>>(
      '/ads/admin/',
    ).then((r) => (Array.isArray(r.data) ? r.data : r.data.results)),
  adminStats: () => api.get<import('../types').AdAdminStats>('/ads/admin/stats/'),
  adminCreate: (data: FormData) =>
    api.post<import('../types').AdCampaign>('/ads/admin/', data),
  adminUpdate: (id: number, data: FormData) =>
    api.patch<import('../types').AdCampaign>(`/ads/admin/${id}/`, data),
  adminDelete: (id: number) => api.delete(`/ads/admin/${id}/`),
}

function getAdSessionId(): string {
  const key = 'terra-ad-session'
  try {
    let id = sessionStorage.getItem(key)
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem(key, id)
    }
    return id
  } catch {
    return 'anonymous'
  }
}
