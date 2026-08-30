import React from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import Home from "../pages/Home";
import MainLayout from "../layouts/MainLayout";
import STATICPATHS from "../utils/STATICPATHS";
import RegisterOrganization from "../pages/RegisterOrganization";
import Dashboard from "../pages/Dashboard";

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

          {/* Protected Routes (With Sidebar) */}
          <Route
            path="/"
            element={
              <MainLayout>
                <Outlet />
              </MainLayout>
            }
          >
            <Route
              path="tasks"
              element={
                <div className="card p-6">
                  <h2 className="text-heading text-xl font-bold mb-4">Tasks</h2>
                  <p className="text-tertiary">Manage your tasks here.</p>
                </div>
              }
            />
            <Route path={STATICPATHS.dashboard} element={<Dashboard />} />
            <Route
              path="employees"
              element={
                <div className="card p-6">
                  <h2 className="text-heading text-xl font-bold mb-4">
                    Employees
                  </h2>
                  <p className="text-tertiary">Manage your employees here.</p>
                </div>
              }
            />
            <Route
              path="campaigns"
              element={
                <div className="card p-6">
                  <h2 className="text-heading text-xl font-bold mb-4">
                    Campaigns
                  </h2>
                  <p className="text-tertiary">Manage your campaigns here.</p>
                </div>
              }
            />
            <Route
              path="analytics"
              element={
                <div className="card p-6">
                  <h2 className="text-heading text-xl font-bold mb-4">
                    Analytics
                  </h2>
                  <p className="text-tertiary">View your analytics here.</p>
                </div>
              }
            />
            <Route
              path="settings"
              element={
                <div className="card p-6">
                  <h2 className="text-heading text-xl font-bold mb-4">
                    Settings
                  </h2>
                  <p className="text-tertiary">Configure your settings here.</p>
                </div>
              }
            />
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
