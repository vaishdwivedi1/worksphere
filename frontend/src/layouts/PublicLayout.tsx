import { ChevronRight } from "lucide-react";
import React from "react";

const PublicLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div className="min-h-screen bg-primary flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 md:px-12 lg:px-24 flex flex-wrap items-center justify-between bg-primary/80 backdrop-blur-sm sticky top-0 z-10 transition-colors">
        <div className="flex items-center gap-2 text-2xl font-bold">
          <span className="bg-primary text-inverse p-1.5 rounded-lg transition-colors">
            ◆
          </span>
          <span className="text-heading">WorkSphere</span>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <a
            href="#"
            className="text-secondary hover:text-link transition-colors"
          >
            Features
          </a>
          <a
            href="#"
            className="text-secondary hover:text-link transition-colors"
          >
            Pricing
          </a>
          <a
            href="#"
            className="text-secondary hover:text-link transition-colors"
          >
            About
          </a>
          <button className="text-secondary hover:text-link transition-colors">
            Log in
          </button>
          <button className="btn-primary px-5 py-2.5 rounded-xl transition flex items-center gap-1">
            Get Started <ChevronRight size={16} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="px-6 md:px-12 lg:px-24 py-6 border-t border-primary text-sm text-tertiary flex flex-wrap justify-between items-center transition-colors">
        <span>© 2026 WorkSphere. All rights reserved.</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-link transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-link transition-colors">
            Terms
          </a>
          <a href="#" className="hover:text-link transition-colors">
            Support
          </a>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
