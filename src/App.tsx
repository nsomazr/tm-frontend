import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import HomePage from './pages/HomePage'
import MapExplorerPage from './pages/MapExplorerPage'
import SubscriptionsPage from './pages/SubscriptionsPage'
import DownloadsPage from './pages/DownloadsPage'
import ReportPreviewPage from './pages/ReportPreviewPage'
import ReportArticlePage from './pages/ReportArticlePage'
import DashboardLayout from './pages/dashboard/DashboardLayout'
import DashboardOverview from './pages/dashboard/DashboardOverview'
import DashboardSubscription from './pages/dashboard/DashboardSubscription'
import DashboardBilling from './pages/dashboard/DashboardBilling'
import DashboardAnalytics from './pages/dashboard/DashboardAnalytics'
import DashboardTerraAssistant from './pages/dashboard/DashboardTerraAssistant'
import DashboardReports from './pages/dashboard/DashboardReports'
import ExplorationReportPage from './pages/dashboard/ExplorationReportPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import PaymentCallbackPage from './pages/PaymentCallbackPage'
import AboutPage from './pages/AboutPage'
import CompleteProfilePage from './pages/CompleteProfilePage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage'
import AdminCoveragePage from './pages/admin/AdminCoveragePage'
import AdminBoundariesPage from './pages/admin/AdminBoundariesPage'
import { AdminOnly } from './pages/admin/AdminGuard'
import UsersPage from './pages/admin/UsersPage'
import MineralsPage from './pages/admin/MineralsPage'
import MineralManagersPage from './pages/admin/MineralManagersPage'
import ManagerPerformancePage from './pages/admin/ManagerPerformancePage'
import LayerActivityPage from './pages/admin/LayerActivityPage'
import AdminMineralAnalyticsPage from './pages/admin/AdminMineralAnalyticsPage'
import AdminUserActivityPage from './pages/admin/AdminUserActivityPage'
import LayersPage from './pages/admin/LayersPage'
import CoordinatesEditor from './pages/admin/CoordinatesEditor'
import ReportsPage from './pages/admin/ReportsPage'
import ReportEditorPage from './pages/admin/ReportEditorPage'
import RevenuePage from './pages/admin/RevenuePage'
import CompliancePage from './pages/admin/CompliancePage'
import AdminMapSettingsPage from './pages/admin/AdminMapSettingsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="maps" element={<MapExplorerPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="downloads/:slug/read" element={<ReportArticlePage />} />
        <Route path="downloads/:slug" element={<ReportPreviewPage />} />
        <Route path="downloads" element={<DownloadsPage />} />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardOverview />} />
          <Route path="subscription" element={<DashboardSubscription />} />
          <Route path="billing" element={<DashboardBilling />} />
          <Route path="analytics" element={<DashboardAnalytics />} />
          <Route path="assistant" element={<DashboardTerraAssistant />} />
          <Route path="reports" element={<DashboardReports />} />
          <Route path="exploration-reports" element={<ExplorationReportPage />} />
        </Route>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route
          path="complete-profile"
          element={
            <ProtectedRoute requireProfile={false}>
              <CompleteProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="payment/callback" element={<PaymentCallbackPage />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="coverage" element={<AdminCoveragePage />} />
          <Route
            path="boundaries"
            element={
              <AdminOnly>
                <AdminBoundariesPage />
              </AdminOnly>
            }
          />
          <Route
            path="map-settings"
            element={
              <AdminOnly>
                <AdminMapSettingsPage />
              </AdminOnly>
            }
          />
          <Route
            path="mineral-analytics"
            element={
              <AdminOnly>
                <AdminMineralAnalyticsPage />
              </AdminOnly>
            }
          />
          <Route
            path="user-activity"
            element={
              <AdminOnly>
                <AdminUserActivityPage />
              </AdminOnly>
            }
          />
          <Route
            path="analytics"
            element={
              <AdminOnly>
                <AdminAnalyticsPage />
              </AdminOnly>
            }
          />
          <Route
            path="users"
            element={
              <AdminOnly>
                <UsersPage />
              </AdminOnly>
            }
          />
          <Route path="minerals" element={<MineralsPage />} />
          <Route
            path="managers"
            element={
              <AdminOnly>
                <MineralManagersPage />
              </AdminOnly>
            }
          />
          <Route
            path="manager-performance"
            element={
              <AdminOnly>
                <ManagerPerformancePage />
              </AdminOnly>
            }
          />
          <Route
            path="layer-activity"
            element={
              <AdminOnly>
                <LayerActivityPage />
              </AdminOnly>
            }
          />
          <Route path="layers" element={<LayersPage />} />
          <Route path="coordinates" element={<CoordinatesEditor />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/new" element={<ReportEditorPage />} />
          <Route path="reports/:slug/edit" element={<ReportEditorPage />} />
          <Route
            path="revenue"
            element={
              <AdminOnly>
                <RevenuePage />
              </AdminOnly>
            }
          />
          <Route
            path="compliance"
            element={
              <AdminOnly>
                <CompliancePage />
              </AdminOnly>
            }
          />
        </Route>
      </Route>
    </Routes>
  )
}
