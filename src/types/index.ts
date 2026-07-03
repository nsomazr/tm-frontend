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
  has_paid_access?: boolean
  created_at: string
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
  icon: string
  description: string
  is_active: boolean
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
  feature_count: number
}

export interface MapFeature {
  id: number
  layer: number
  geometry: GeoJSON.Geometry
  properties: Record<string, unknown>
  latitude: string | null
  longitude: string | null
  label: string
  is_active: boolean
}

export interface SubscriptionPlan {
  id: number
  name: string
  slug: string
  description: string
  billing_cycle: 'monthly' | 'annual'
  price: string
  currency: string
  included_minerals: number[]
  included_mineral_names: string[]
}

export interface UserSubscription {
  id: number
  plan: number
  plan_detail: SubscriptionPlan
  status: string
  start_date: string | null
  end_date: string | null
  auto_renew: boolean
  is_active: boolean
  days_until_expiry: number | null
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
  preview_image: string | null
  price: string
  currency: string
  is_purchased: boolean
  has_full_access?: boolean
  key_findings_count?: number
  ai_summary?: {
    summary: string
    key_findings?: string[]
    generated_at: string
    model_used?: string
    is_preview?: boolean
  }
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

export interface PaymentOrder {
  id: number
  user?: number
  user_email?: string
  user_username?: string
  order_type: 'subscription' | 'download' | 'license'
  amount: string
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  merchant_reference: string
  order_tracking_id: string
  payment_provider: 'selcom' | 'simulated'
  msisdn: string
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
  created_at: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface MineralSearchInsight {
  type?: 'mineral' | 'region'
  id: number
  name: string
  name_sw: string
  slug: string
  color: string
  description: string
  feature_count: number
  layer_count: number
  total_layer_count: number
  top_regions: { region: string; count: number }[]
  center: { lat: number; lng: number } | null
  zoom?: number
  has_full_data: boolean
}

export interface AreaInsight {
  lat: number
  lng: number
  zoom: number
  region: string | null
  minerals: { slug: string; name: string; name_sw?: string; color: string; count: number }[]
  feature_count: number
  labels: string[]
  has_mapped_data?: boolean
  ai_insight: string | null
  ai_model: string | null
  insight_tier?: 'basic' | 'highlight' | 'full' | 'none'
  has_detail_access?: boolean
  requires_subscription?: boolean
  upgrade_message?: string
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
  geology: {
    total_prospects: number
    total_layers: number
    preview_layers: number
    regions_covered: number
    layer_by_type: { layer_type: string; count: number }[]
    hotspots_by_region: { region: string; count: number }[]
    minerals: {
      name: string
      slug: string
      color: string
      layer_count: number
      feature_count: number
      report_count: number
    }[]
  }
  licenses: { total: number; active: number; pending: number; approved: number }
}

export namespace GeoJSON {
  export interface Geometry {
    type: string
    coordinates: unknown
  }
}
