import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ContentModal from './components/modal/ContentModal.jsx';
import CreativeStudioModal from './components/modal/CreativeStudioModal.jsx';
import PwaManager from './components/pwa/PwaManager.jsx';
import DesktopBridge from './components/DesktopBridge.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import { AppErrorBoundary } from './components/AppErrorBoundary.jsx';
import Login from './pages/Login.jsx';
import AuthCallback from './pages/AuthCallback.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Generator from './pages/Generator.jsx';
import Calendar from './pages/Calendar.jsx';
import Drafts from './pages/Drafts.jsx';
import Accounts from './pages/Accounts.jsx';
import History from './pages/History.jsx';
import BrandIntelligence from './pages/BrandIntelligence.jsx';
import Premium from './pages/Premium.jsx';
import { isTikTokEnabled } from './lib/features.js';
import TikTokAuth from './pages/TikTokAuth.jsx';
import ReviewDemo from './pages/ReviewDemo.jsx';
import TikTokTestPublish from './pages/TikTokTestPublish.jsx';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      {isTikTokEnabled() && (
        <>
          <Route path="/auth/tiktok" element={<TikTokAuth />} />
          <Route path="/review-demo" element={<ReviewDemo />} />
        </>
      )}

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="brand-intelligence" element={<BrandIntelligence />} />
        <Route path="generator" element={<Generator />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="drafts" element={<Drafts />} />
        <Route path="accounts" element={<Accounts />} />
        {isTikTokEnabled() && <Route path="tiktok-test-publish" element={<TikTokTestPublish />} />}
        <Route path="history" element={<History />} />
        <Route path="premium" element={<Premium />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <DesktopBridge />
      <PwaManager />
      <AppRoutes />
      <ContentModal />
      <CreativeStudioModal />
    </AppErrorBoundary>
  );
}
