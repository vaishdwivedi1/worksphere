import React from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import PublicLayout from "../layouts/PublicLayout";
import Dashboard from "../pages/Dashboard";
import Home from "../pages/Home";
import Login from "../pages/Login";
import RegisterOrganization from "../pages/RegisterOrganization";
import STATICPATHS from "../utils/STATICPATHS";
import Members from "../pages/Members";
import Settings from "../pages/Settings";
import AcceptInvitation from "../pages/AcceptInvitation";
import HRJobs from "../pages/HRJobs";

// ============================================
// ERROR BOUNDARY
// ============================================
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-primary px-4">
            <div className="card p-8 max-w-md w-full text-center">
              <div className="text-error text-6xl mb-4">⚠️</div>
              <h2 className="text-heading text-xl font-bold mb-2">
                Something went wrong
              </h2>
              <p className="text-tertiary text-sm mb-4">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary px-6 py-2 rounded-lg transition"
              >
                Refresh Page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// ============================================
// ROUTING COMPONENT
// ============================================

const Routing = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          {/* Public Routes (No Sidebar) */}
          <Route
            path="/"
            element={
              <PublicLayout>
                <Home />
              </PublicLayout>
            }
          />
          <Route
            path={STATICPATHS.registerOrganization}
            element={<RegisterOrganization />}
          />
          <Route path={STATICPATHS.login} element={<Login />} />
          <Route
            path={STATICPATHS.acceptInvitation}
            element={<AcceptInvitation />}
          />

          {/* Protected Routes (With Sidebar) */}
          <Route
            path="/"
            element={
              <MainLayout>
                <Outlet />
              </MainLayout>
            }
          >
            <Route path={STATICPATHS.dashboard} element={<Dashboard />} />
            <Route path={STATICPATHS.members} element={<Members />} />
            <Route path={STATICPATHS.settings} element={<Settings />} />
            <Route path={STATICPATHS.jobs} element={<HRJobs />} />
          </Route>

          {/* 404 Route */}
          <Route
            path="*"
            element={
              <PublicLayout>
                <div className="min-h-[60vh] flex items-center justify-center px-4">
                  <div className="text-center">
                    <div className="text-6xl mb-4">404</div>
                    <h2 className="text-heading text-2xl font-bold mb-2">
                      Page Not Found
                    </h2>
                    <p className="text-tertiary mb-6">
                      The page you're looking for doesn't exist.
                    </p>
                    <a
                      href="/"
                      className="btn-primary px-6 py-2.5 rounded-xl transition inline-block"
                    >
                      Go Home
                    </a>
                  </div>
                </div>
              </PublicLayout>
            }
          />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routing;
