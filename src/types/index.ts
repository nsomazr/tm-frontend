export interface UserCurrentPlan {
  slug: string
  name: string
  billing_cycle: 'monthly' | 'annual' | null
  days_until_expiry: number | null
}

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: 'super_admin' | 'admin' | 'mineral_manager' | 'subscriber' | 'free'
  phone: string
  organization: string
  profile_complete: boolean
  is_active?: boolean
  has_paid_access?: boolean
  can_save_explorations?: boolean
  can_use_analytics?: boolean
  current_plan?: UserCurrentPlan | null
  assistant_credits?: AssistantCredits | null
  mineral_exploration?: MineralExplorationQuota | null
  created_at: string
}

export interface SavedExploration {
  id: number
  name: string
  mode: 'point' | 'line' | 'polygon'
  points: [number, number][]
  created_at: string
  updated_at: string
}

export interface Mineral {
  id: number
  name: string
  name_sw: string
  slug: string
  category: number | null
  category_name: string
  country: number
  country_code: string
  color: string
  color_rgba?: string
  icon: string
  description: string
  is_active: boolean
  /** Extra structure/point (etc.) layers included in this commodity's heatmap overlay. */
  associated_layer_ids?: number[]
}

export interface MapLayer {
  id: number
  name: string
  name_sw: string
  slug: string
  layer_type: 'polygon' | 'point' | 'line'
  mineral: number
  mineral_name: string
  mineral_slug: string
  region: number | null
  region_name: string | null
  z_index: number
  is_preview: boolean
  is_active: boolean
  style: Record<string, unknown>
  description: string
  /** Reference buffer radius (km) for insight influence zone; 1 to 50 when set. */
  buffer_km: number | null
  /** Relative heatmap contribution strength (0–10). */
  heatmap_weight?: number
  /** Catalog mineral slugs that associate this layer for heatmap overlays. */
  associated_catalog_slugs?: string[]
  feature_count: number
  /** Total polygon coverage (km²); used for large-under-small stack order. */
  area_km2?: number
  current_version?: number
  created_by?: number | null
  created_by_name?: string | null
  last_uploaded_by_name?: string | null
  last_uploaded_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface LayerVersion {
  id: number
  layer: number
  layer_name: string
  layer_slug: string
  mineral_name: string
  version_number: number
  changelog: string
  uploaded_by: number | null
  uploaded_by_name: string | null
  feature_count: number
  created_at: string
}

export interface LayerUpload {
  id: number
  layer: number
  layer_name: string
  layer_slug: string
  mineral_name: string
  filename: string
  file_type: string
  import_mode?: 'replace' | 'append'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message: string
  uploaded_by: number | null
  uploaded_by_name: string | null
  uploaded_by_role: string | null
  created_at: string
}

export interface MapFeature {
  id: number
  layer: number
  geometry: GeoJSON.Geometry
  properties: Record<string, unknown>
  latitude: string | null
  longitude: string | null
  label: string
  created_by?: number | null
  is_active: boolean
}

export interface SubscriptionPlan {
  id: number
  name: string
  slug: string
  description: string
  billing_cycle: 'monthly' | 'annual'
  billing_cycle_label?: string
  price: string
  currency: string
  included_minerals: number[]
  included_mineral_names: string[]
  included_report_downloads?: number
  included_assistant_credits?: number
  includes_chat_history?: boolean
  includes_saved_explorations?: boolean
  max_explorable_minerals?: number | null
}

export interface AssistantCredits {
  limit: number | null
  used: number
  remaining: number | null
  period_end: string | null
  period_label: 'monthly' | 'annual' | 'session' | null
  tier: 'free' | 'paid' | 'anonymous' | 'unlimited'
  unlimited?: boolean
  chat_history?: boolean
}

export type AiProviderId = 'groq' | 'gemini' | 'ollama'

export interface AiProviderStatus {
  configured: boolean
  available: boolean
  model: string
  base_url?: string
  configured_model?: string
  installed_chat_models?: string[]
  using_fallback_model?: boolean
}

export interface AssistantPlatformSettings {
  ai_provider: AiProviderId
  ai_provider_fallback: AiProviderId[]
  effective_chain: AiProviderId[]
  providers: Record<AiProviderId, AiProviderStatus>
  uses_env_defaults: boolean
  env_defaults: {
    ai_provider: AiProviderId
    ai_provider_fallback: AiProviderId[]
  }
  updated_at: string | null
}

export interface MineralExplorationQuota {
  limit: number | null
  used: number
  remaining: number | null
  explored_slugs: string[]
  period_end: string | null
  period_label: 'monthly' | null
  tier: 'free' | 'starter' | 'growth' | 'premium' | 'unlimited' | 'anonymous'
  unlimited?: boolean
}

export interface DownloadQuota {
  limit: number | null
  used: number
  remaining: number | null
  period_end: string | null
  billing_cycle: 'monthly' | 'annual' | null
  unlimited?: boolean
}

export interface UserSubscription {
  id: number | null
  plan: number | null
  plan_detail: SubscriptionPlan | null
  status: string | null
  start_date: string | null
  end_date: string | null
  auto_renew: boolean
  is_active: boolean
  days_until_expiry: number | null
  download_quota?: DownloadQuota | null
  assistant_credits?: AssistantCredits | null
  created_at?: string | null
}

export interface Report {
  id: number
  title: string
  slug: string
  mineral: number
  mineral_name: string
  region: number | null
  region_name: string | null
  description: string
  source_type?: 'uploaded' | 'ai_generated' | 'user_generated'
  access_type?: 'free' | 'paid' | 'subscriber_only' | 'subscriber_or_paid'
  report_format?: 'pdf' | 'web_article' | 'pdf_and_article'
  bounding_box?: Record<string, number>
  center_lat?: number | null
  center_lng?: number | null
  zoom?: number | null
  /** Optional GeoJSON Point or Polygon AOI. */
  geometry?: { type: string; coordinates: unknown } | Record<string, never> | null
  /** Optional buffer (km) around geometry; max 20. */
  buffer_km?: number | null
  preview_image: string | null
  price: string
  currency: string
  is_active?: boolean
  is_purchased: boolean
  has_full_access?: boolean
  has_pdf?: boolean
  has_article?: boolean
  article_body?: ArticleBlock[]
  linked_layers?: LinkedReportLayer[]
  location_tags?: ReportLocationTag[]
  allowed_plan_ids?: number[]
  summary_preview?: string
  can_download?: boolean
  download_source?: 'purchase' | 'subscription' | 'admin' | 'free' | null
  key_findings_count?: number
  relevance_score?: number
  linked_layer_slugs?: string[]
  linked_boundary_names?: string[]
  ai_summary?: {
    summary: string
    key_findings?: string[]
    generated_at: string
    model_used?: string
    is_preview?: boolean
  }
}

export type ArticleBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'callout'; text: string }

export interface LinkedReportLayer {
  id: number
  slug: string
  name: string
}

export interface ReportLocationTag {
  id: number
  name: string
  level: number
  level_label: string
}

export interface ReportChatMessage {
  role: 'user' | 'assistant'
  content: string
  model_used?: string
}

export interface UserExplorationReport {
  id: number
  title: string
  prompt: string
  status: 'draft' | 'generating' | 'ready' | 'failed'
  context: Record<string, unknown>
  revision_notes: string
  narrative: string
  sections: Record<string, unknown>
  pdf_file: string | null
  error_message: string
  created_at: string
  updated_at: string
}

export interface MyReport {
  id: number
  report: number
  report_slug: string
  report_title: string
  source: 'purchase' | 'subscription' | 'insight_export' | 'exploration'
  purchased_at: string
  amount_paid?: string | null
  currency?: string | null
  status?: string
  can_download?: boolean
}

export interface Invoice {
  id: number
  invoice_number: string
  amount: string
  currency: string
  description: string
  pdf_file: string | null
  issued_at: string
}

export interface PaymentDocumentSummary {
  number: string
  issued_at: string
  has_pdf: boolean
  email_sent_at: string | null
  email_sent_to: string | null
  email_send_count: number
  email_last_error: string | null
}

export interface DocumentEmailLog {
  id: number
  document_type: 'invoice' | 'receipt'
  document_number: string
  sent_to: string
  sent_by_email?: string | null
  status: 'sent' | 'failed'
  error: string
  created_at: string
}

export interface PaymentOrderSubscriptionDetail {
  id: number
  status: string
  plan_name: string
  plan_slug: string
  billing_cycle: string
  start_date: string | null
  end_date: string | null
}

export interface PaymentOrderReportDetail {
  id: number
  title: string
  slug: string
}

export interface PaymentOrderLicenseDetail {
  id: number
  company_name: string
  contact_name: string
  status: string
}

export interface PaymentOrderAerialDetail {
  lat: number
  lng: number
  zoom?: number
  purchased_extra_km2?: number
  max_area_km2?: number
}

export interface PaymentOrder {
  id: number
  user?: number
  user_email?: string
  user_username?: string
  order_type: 'subscription' | 'download' | 'license' | 'aerial'
  description?: string
  amount: string
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  merchant_reference: string
  account_number?: string
  order_tracking_id: string
  payment_provider: 'snippe' | 'simulated'
  payment_method?: string | null
  msisdn: string
  subscription_detail?: PaymentOrderSubscriptionDetail | null
  report_detail?: PaymentOrderReportDetail | null
  license_detail?: PaymentOrderLicenseDetail | null
  aerial_detail?: PaymentOrderAerialDetail | null
  invoice_number?: string | null
  invoice_issued_at?: string | null
  invoice?: PaymentDocumentSummary | null
  receipt_number?: string | null
  receipt?: PaymentDocumentSummary | null
  document_emails?: DocumentEmailLog[]
  activation_source?: 'manual_admin' | 'webhook' | 'gateway' | null
  gateway_response?: Record<string, unknown>
  created_at: string
  updated_at?: string
}

export interface AdminRevenueSummary {
  total_revenue: number
  by_type: { order_type: string; total: number; count: number }[]
  by_provider: { payment_provider: string; total: number; count: number }[]
  pending_count: number
  failed_count: number
  recent_orders: PaymentOrder[]
}

export interface MineralManagerAssignment {
  id: number
  user: number
  user_detail: User
  mineral: number
  mineral_name: string
  can_publish: boolean
  assigned_at: string
}

export interface Country {
  id: number
  code: string
  name: string
  name_sw: string
  center_lat?: number | null
  center_lng?: number | null
  default_zoom?: number
  bounds?: { west: number; south: number; east: number; north: number }
  coordinate_system?: string
  is_active: boolean
}

export interface CountryFocus {
  code: string
  name: string
  name_sw?: string
  center: { lat: number; lng: number }
  default_zoom: number
  bounds: { west: number; south: number; east: number; north: number }
  geojson?: {
    type: 'FeatureCollection'
    features: Array<{
      type: 'Feature'
      properties?: Record<string, unknown>
      geometry: { type: string; coordinates: unknown }
    }>
  }
  boundary_levels?: number[]
}

export interface Region {
  id: number
  country: number
  country_name: string
  name: string
  name_sw: string
}

export interface LicenseAgreement {
  id: number
  company_name: string
  contact_name: string
  contact_email: string
  minerals: number[]
  regions: number[]
  terms: string
  price: string
  currency: string
  status: string
}

export interface AuditLog {
  id: number
  actor_name: string
  action: string
  resource_type: string
  resource_id: string
  details?: Record<string, unknown>
  created_at: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface MineralSearchInsight {
  type?: 'mineral' | 'region' | 'layer' | 'region_boundary' | 'district_boundary' | 'ward_boundary' | 'village_boundary'
  id: number
  boundary_id?: number
  boundary_level?: number
  name: string
  name_sw: string
  slug: string
  color: string
  description: string
  feature_count: number
  layer_count: number
  total_layer_count: number
  top_regions: { region: string; count: number; area_km2?: number }[]
  top_minerals?: {
    slug: string
    name: string
    name_sw?: string
    color: string
    count: number
    area_km2?: number
  }[]
  center: { lat: number; lng: number } | null
  bounds?: { west: number; south: number; east: number; north: number } | null
  zoom?: number
  has_full_data: boolean
}

export interface AerialAccess {
  default_analysis_km2?: number
  analysis_area_km2: number
  max_analysis_km2?: number
  included_km2: number
  purchased_extra_km2?: number
  using_extended_area?: boolean
  extension_available?: boolean
  extension_options_km2?: number[]
  allowed: boolean
  requires_subscription?: boolean
  aerial_price_per_km2: number
  aerial_total_price?: number
  zone_center?: { lat: number; lng: number }
  zone_bounds?: { south: number; north: number; west: number; east: number }
}

export interface AdminBoundaryRef {
  id: number
  level: number
  name: string
  name_sw?: string
  code: string
  region_id?: number | null
  center?: { lat: number; lng: number }
  bounds?: { west: number; south: number; east: number; north: number } | null
}

export interface AdminBoundaryAtResponse {
  country?: AdminBoundaryRef | null
  region: AdminBoundaryRef | null
  district: AdminBoundaryRef | null
  ward: AdminBoundaryRef | null
  village: AdminBoundaryRef | null
}

export interface AdminBoundaryStats {
  country: string
  counts: { '0': number; '1': number; '2': number; '3': number; '4': number }
  last_updated: string | null
}

export interface AdminBoundaryListItem {
  id: number
  level: number
  name: string
  name_sw?: string
  code: string
  has_geology: boolean
  document_count: number
}

export interface BoundaryGeologyMetadata {
  scope?: 'local' | 'regional' | 'global'
  formations?: string | string[]
  lithology?: string
  stratigraphy?: string
  tectonic_setting?: string
  age?: string
  data_sources?: string
}

export interface BoundaryGeologyDocument {
  id: number
  title: string
  scope: 'local' | 'regional' | 'global'
  file: string
  extracted_text: string
  created_at: string
}

export interface GeoReferenceDataset {
  id: number
  name: string
  slug: string
  country: number | null
  country_code: string | null
  source_filename: string
  feature_count: number
  bounds: { west?: number; south?: number; east?: number; north?: number }
  is_active: boolean
  uploaded_by_name: string
  created_at: string
  updated_at: string
}

export interface AdminBoundaryGeology {
  id: number
  level: number
  level_label: string
  name: string
  name_sw?: string
  code: string
  geological_summary: string
  geological_summary_sw: string
  geological_metadata: BoundaryGeologyMetadata
  documents: BoundaryGeologyDocument[]
  updated_at: string
}

export interface GeologicalContext {
  entries: unknown[]
  summary_lines: string[]
  ai_block: string
}

export interface MineralCatalogEntry {
  id: number
  slug: string
  name: string
  name_sw: string
  color: string
  color_rgba?: string
  description: string
  feature_count: number
  is_mapped: boolean
  periodic_z?: number | null
  periodic_special?: string | null
  layer_slug?: string
}

export interface MineralCatalogResponse {
  minerals: MineralCatalogEntry[]
  country: string
  stats?: {
    layer_count: number
    mapped_layer_count: number
  }
}

export interface LayerBoundaryCoverage {
  layer_ids: number[]
  feature_count: number
  region_ids: number[]
  district_ids: number[]
  ward_ids: number[]
  village_ids: number[]
  bounds: { west: number; south: number; east: number; north: number } | null
  center: { lat: number; lng: number } | null
}

export interface MineralBoundaryCoverage {
  slug: string
  name: string
  color: string
  feature_count: number
  region_ids: number[]
  district_ids: number[]
  village_ids: number[]
  bounds: { west: number; south: number; east: number; north: number } | null
  center: { lat: number; lng: number } | null
  exploration_quota?: MineralExplorationQuota
}

export interface MineralHighlightSpec {
  slug: string
  color: string
  regionIds: number[]
  districtIds: number[]
  villageIds: number[]
}

export interface MineralHeatmapPoint {
  lat: number
  lng: number
  weight: number
}

export interface MineralHeatmapData {
  slug: string
  name: string
  color: string
  mode?: 'single' | 'interaction'
  feature_count: number
  point_count: number
  points: MineralHeatmapPoint[]
  concentration_stats?: {
    mean: number
    median: number
    stdev: number
    cutoff: number
  }
  minerals?: { slug: string; name: string; color: string }[]
  empty_reason?: string | null
  detail?: string
  contours?: {
    level: string
    threshold: number
    coordinates?: number[][][]
  }[]
  weight_legend?: {
    strong: number
    medium_poly_point: number
    medium_poly_line: number
    medium_point_line: number
    light_polygon: number
    light_point: number
    light_line: number
  }
}

export interface DirectionMineralInsight {
  slug: string
  name: string
  count: number
  sectors: Record<string, number>
  dominant_sector: string
  dominant_direction: string
  dominant_count: number
}

export interface DirectionInsights {
  center: { lat: number; lng: number }
  sectors: Record<string, number>
  by_mineral: DirectionMineralInsight[]
  summary_lines: string[]
}

export interface StructureOrientations {
  dominant_trend: string
  dominant_trend_label: string
  mean_trend_deg?: number | null
  count_with_orientation: number
  property_count?: number
  geometry_count?: number
  bins: Record<string, number>
  by_mineral?: {
    slug: string
    name: string
    count: number
    bins: Record<string, number>
    dominant_trend: string
    dominant_trend_label: string
    dominant_count: number
  }[]
  summary_lines: string[]
}

export interface TerrainContext {
  elevation_m: number
  relief_m: number
  relief_class: string
  slope_class: string
  landform_hint: string
  min_elevation_m: number
  max_elevation_m: number
  summary_lines: string[]
}

export interface SimilarAreaRecommendation {
  boundary_id: number
  label: string
  region?: string | null
  lat: number
  lng: number
  score: number
  minerals: string[]
  feature_count: number
  match_reasons: string[]
  terrain_hint?: string | null
}

export interface AreaInsight {
  lat: number
  lng: number
  zoom: number
  region: string | null
  geographic_region?: string | null
  region_boundary?: AdminBoundaryRef | null
  district_boundary?: AdminBoundaryRef | null
  ward_boundary?: AdminBoundaryRef | null
  village_boundary?: AdminBoundaryRef | null
  minerals: {
    slug: string
    name: string
    name_sw?: string
    color: string
    count: number
    occurrence_count?: number
    polygon_count?: number
    area_km2?: number
  }[]
  feature_count: number
  occurrence_count?: number
  polygon_count?: number
  labels: string[]
  has_mapped_data?: boolean
  ai_insight: string | null
  ai_model: string | null
  insight_tier?: 'basic' | 'highlight' | 'full' | 'none'
  has_detail_access?: boolean
  requires_subscription?: boolean
  requires_aerial_purchase?: boolean
  requires_extension_purchase?: boolean
  requires_zoom_in?: boolean
  upgrade_message?: string
  aerial?: AerialAccess
  follow_up_limit?: number | null
  follow_ups_remaining?: number | null
  assistant_credits?: AssistantCredits | null
  top_regions?: { region: string; count: number; area_km2?: number }[]
  direction_insights?: DirectionInsights | null
  structure_orientations?: StructureOrientations | null
  geological_context?: GeologicalContext | null
  terrain_context?: TerrainContext | null
  basemap?: string | null
  basemap_label?: string | null
  visual_observations?: string | null
  similar_areas?: SimilarAreaRecommendation[]
  total_area_km2?: number
  search_name?: string
  description?: string
  search_type?: string
  connected_layers?: {
    id: number
    slug: string
    name: string
    layer_type: string
    feature_count: number
  }[]
  related_reports?: {
    slug: string
    title: string
    access_type: string
    has_article: boolean
    region: string | null
  }[]
}

export interface AssistantMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AssistantChatResponse {
  reply: string
  ai_model: string
  assistant_credits: AssistantCredits
  requires_subscription?: boolean
  thread_key?: string
  chat_history?: boolean
}

export interface AdminPlatformAnalytics {
  generated_at: string
  users: {
    total: number
    new_30d: number
    by_role: { role: string; count: number }[]
    signup_trend: { month: string; count: number }[]
    recent: { username: string; email: string; role: string; created_at: string; organization: string }[]
  }
  conversions: {
    subscriber_rate: number
    checkout_success_rate: number
    subscription_checkout_rate: number
    free_users: number
    paying_subscribers: number
  }
  subscriptions: {
    active: number
    expired: number
    pending: number
    cancelled: number
    expiring_soon: number
    by_plan: { plan: string; billing_cycle: string; count: number }[]
    mrr_estimate: number
  }
  revenue: {
    total: number
    last_30_days: number
    by_type: { order_type: string; total: number; count: number }[]
    monthly_trend: { month: string; total: number }[]
  }
  orders: { total: number; completed: number; pending: number; failed: number }
  reports: {
    catalog_size: number
    total_downloads: number
    download_revenue: number
    top_reports: { title: string; id: number; purchases: number; revenue: number }[]
  }
  licenses: { total: number; active: number; pending: number; approved: number }
}

export interface AdminMineralAnalytics {
  generated_at: string
  catalog: { layer_count: number; mapped_layer_count: number }
  coverage: {
    total_prospects: number
    total_layers: number
    preview_layers: number
    regions_covered: number
    layer_by_type: { layer_type: string; count: number }[]
    hotspots_by_region: { region: string; count: number }[]
    layers: {
      slug: string
      name: string
      color: string
      feature_count: number
      layer_type: string
    }[]
    minerals: {
      name: string
      slug: string
      color: string
      layer_count: number
      feature_count: number
      report_count: number
    }[]
  }
  exploration_interest: {
    mineral_slug: string
    explorations: number
    unique_users: number
  }[]
}

export interface AdminUserActivityAnalytics {
  generated_at: string
  summary: {
    explorations_30d: number
    unique_explorers_30d: number
    assistant_events_30d: number
    assistant_credits_30d: number
    map_insights_30d: number
    assistant_chats_30d: number
    report_exports_30d: number
    active_assistant_users_30d: number
    chat_threads_total: number
    chat_threads_active_30d: number
  }
  explored_minerals: { mineral_slug: string; explorations: number; unique_users: number }[]
  explored_minerals_30d: { mineral_slug: string; explorations: number }[]
  assistant_by_kind: { kind: string; events: number; credits: number }[]
  exploration_trend: { month: string; count: number }[]
  assistant_trend: { month: string; count: number }[]
  top_active_users: { user_id: number; username: string; activity_score: number }[]
  recent_explorations: { username: string; mineral_slug: string; created_at: string }[]
  recent_assistant_usage: { username: string; kind: string; credits: number; created_at: string }[]
}

export interface ManagerPerformanceRow {
  user_id: number
  username: string
  full_name: string
  email: string
  is_active: boolean
  rank: number
  assigned_minerals: number
  mineral_names: string[]
  can_publish: boolean
  layers_managed: number
  layers_created: number
  reports_published: number
  features: {
    points: number
    lines: number
    polygons: number
    other: number
    total: number
    recent_30d: number
    on_managed_layers: number
    on_managed_layers_breakdown: {
      points: number
      lines: number
      polygons: number
    }
  }
  uploads: {
    total: number
    completed: number
    failed: number
    pending: number
    recent_30d: number
  }
  versions: number
  last_activity: string | null
  contribution_score: number
}

export interface ManagerPerformanceReview {
  managers: ManagerPerformanceRow[]
  generated_at: string
}

export type AdPlacement =
  | 'map_sidebar'
  | 'map_overlay'
  | 'downloads_banner'
  | 'subscriptions_banner'
  | 'dashboard_card'
  | 'about_banner'

export type AdAudience = 'all' | 'free' | 'subscriber'

export type AdStatus = 'live' | 'scheduled' | 'expired' | 'hidden' | 'inactive'

export interface PublicAd {
  id: number
  title: string
  company_name: string
  headline: string
  body_text: string
  image_url: string
  cta_label: string
  link_url: string
  open_in_new_tab: boolean
}

export interface AdCampaign extends PublicAd {
  slug: string
  placements: AdPlacement[]
  placement_labels: string[]
  priority: number
  is_active: boolean
  is_hidden: boolean
  audience: AdAudience
  country_codes: string[]
  starts_at: string | null
  ends_at: string | null
  impression_count: number
  click_count: number
  click_through_rate: number
  is_live: boolean
  status_label: AdStatus
  created_by: number | null
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface AdPlacementStats {
  placement: AdPlacement
  label: string
  impressions: number
  clicks: number
  ctr: number
}

export interface AdAdminStats {
  campaigns: number
  live_campaigns: number
  impressions: number
  clicks: number
  ctr: number
  reach: number
  by_placement: AdPlacementStats[]
}

export namespace GeoJSON {
  export interface Geometry {
    type: string
    coordinates: unknown
  }
}

export type MarketplaceListingStatus = 'draft' | 'published' | 'hidden'

export interface MarketplaceListingDocument {
  id: number
  title: string
  file_url: string | null
  is_public?: boolean
  created_at: string
}

export interface MarketplaceListingPublic {
  id: number
  slug: string
  title: string
  summary: string
  description?: string
  geometry?: GeoJSON.Geometry | Record<string, unknown>
  geometry_type: string | null
  buffer_km: number | null
  center_lat: number | null
  center_lng: number | null
  bounding_box?: Record<string, number>
  commodity_labels: string[]
  primary_mineral?: string
  other_minerals?: string[]
  show_contact_public?: boolean
  allow_inquiries?: boolean
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  documents?: MarketplaceListingDocument[]
  updated_at: string
}

export interface MarketplaceListingOwner {
  id: number
  slug: string
  title: string
  summary: string
  description: string
  geometry: GeoJSON.Geometry | Record<string, unknown>
  buffer_km: number | null
  center_lat: number | null
  center_lng: number | null
  bounding_box: Record<string, number>
  commodity_labels: string[]
  primary_mineral?: string
  other_minerals?: string[]
  status: MarketplaceListingStatus
  show_on_map: boolean
  contact_name: string
  contact_email: string
  contact_phone: string
  show_contact_public: boolean
  allow_inquiries: boolean
  country: number | null
  documents: MarketplaceListingDocument[]
  inquiry_unread_count: number
  inquiry_count?: number
  view_count?: number
  map_click_count?: number
  document_download_count?: number
  terra_summary_count?: number
  created_at: string
  updated_at: string
}

export interface MarketplaceOwnerAnalyticsListing {
  id: number
  slug: string
  title: string
  status: MarketplaceListingStatus
  show_on_map: boolean
  views: number
  map_clicks: number
  document_downloads: number
  terra_summaries: number
  inquiries: number
  inquiries_unread: number
  inquiry_rate: number
  updated_at: string
}

export interface MarketplaceOwnerAnalytics {
  totals: {
    listings: number
    published: number
    draft: number
    hidden: number
    views: number
    map_clicks: number
    document_downloads: number
    terra_summaries: number
    inquiries: number
    inquiries_unread: number
    views_30d: number
    map_clicks_30d: number
    document_downloads_30d: number
    terra_summaries_30d: number
    inquiry_rate: number
  }
  listings: MarketplaceOwnerAnalyticsListing[]
  insights: string[]
}

export interface MarketplaceListingWrite {
  title: string
  summary?: string
  description?: string
  geometry?: GeoJSON.Geometry | Record<string, unknown> | null
  buffer_km?: number | null
  commodity_labels?: string[]
  primary_mineral?: string
  other_minerals?: string[]
  status?: MarketplaceListingStatus
  show_on_map?: boolean
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  show_contact_public?: boolean
  allow_inquiries?: boolean
  country?: number | null
}

export interface MarketplaceInquiry {
  id: number
  listing: number
  listing_title: string
  listing_slug: string
  from_user: number
  from_username: string
  message: string
  contact_email: string
  is_read: boolean
  created_at: string
  conversation_id?: number
  message_id?: number
}

export interface MarketplaceMessageReply {
  id: number
  sender_username: string
  body: string
}

export interface MarketplaceMessage {
  id: number
  sender: number
  sender_username: string
  body: string
  reply_to: MarketplaceMessageReply | null
  created_at: string
  is_mine: boolean
  read_by_recipient: boolean
}

export type MarketplaceConversationOrigin =
  | 'marketplace_inquiry'
  | 'listing_message'
  | 'owner_outreach'
  | 'direct'

export interface MarketplaceConversation {
  id: number
  listing: number | null
  listing_title: string | null
  listing_slug: string | null
  buyer: number
  buyer_username: string
  owner_username: string
  buyer_contact_email: string
  owner_last_read_at: string | null
  buyer_last_read_at: string | null
  last_message: MarketplaceMessage | null
  unread: boolean
  archived: boolean
  role: 'owner' | 'buyer' | 'viewer'
  origin: MarketplaceConversationOrigin
  created_at: string
  updated_at: string
  messages?: MarketplaceMessage[]
}

export interface UserNotification {
  id: number
  kind: 'marketplace_inquiry' | 'marketplace_message'
  title: string
  body: string
  link: string
  payload: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export interface MarketplaceUserSearchResult {
  id: number
  username: string
  display_name: string
  organization: string
  public_listing_count: number
}

export interface ConversationListingOption {
  id: number
  title: string
  slug: string
  role: 'owner' | 'buyer'
}

export interface MarketplaceGeoJsonFeature {
  type: 'Feature'
  id: number
  geometry: GeoJSON.Geometry
  properties: {
    id: number
    slug: string
    title: string
    summary: string
    geometry_type: string | null
    buffer_km: number | null
    commodity_labels: string[]
    primary_mineral?: string
    other_minerals?: string[]
    color: string
  }
}

export interface MarketplaceGeoJson {
  type: 'FeatureCollection'
  features: MarketplaceGeoJsonFeature[]
}
