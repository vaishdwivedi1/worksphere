import {
  BarChart3,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Target,
  Users,
  X,
} from "lucide-react";
import React from "react";

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  };

  const closeMobileSidebar = () => {
    if (window.innerWidth < 768) {
      setMobileSidebarOpen(false);
    }
  };

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2 text-xl font-bold text-link">
          <span className="bg-primary text-inverse p-1.5 rounded-lg transition-colors">
            ◆
          </span>
          <span className="text-heading">WorkSphere</span>
        </div>
        <button
          onClick={toggleSidebar}
          className="hidden md:flex p-1 rounded-lg hover:bg-tertiary transition-colors text-secondary"
        >
          {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
        <button
          onClick={toggleSidebar}
          className="flex md:hidden p-1 rounded-lg hover:bg-tertiary transition-colors text-secondary"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          <NavItem icon={LayoutDashboard} label="Dashboard" active />
          <NavItem icon={Briefcase} label="Tasks" />
          <NavItem icon={Users} label="Employees" />
          <NavItem icon={Target} label="Campaigns" />
          <NavItem icon={BarChart3} label="Analytics" />
          <NavItem icon={Settings} label="Settings" />
        </div>

        <div className="mt-8 pt-4 border-t border-primary">
          <NavItem icon={HelpCircle} label="Help & Support" />
          <NavItem
            icon={LogOut}
            label="Log Out"
            className="text-error hover:bg-error/10"
          />
        </div>
      </nav>

      {/* Sidebar Footer */}
      <div className="px-4 py-3 border-t border-primary text-xs text-tertiary">
        <p>Version 2.0.0</p>
      </div>
    </div>
  );

  const NavItem = ({
    icon: Icon,
    label,
    active = false,
    className = "",
  }: {
    icon: any;
    label: string;
    active?: boolean;
    className?: string;
  }) => {
    if (!sidebarOpen && window.innerWidth >= 768) {
      return (
        <div className="flex justify-center py-3">
          <div
            className={`p-2 rounded-lg cursor-pointer transition-colors ${
              active
                ? "bg-link/10 text-link"
                : "text-secondary hover:bg-tertiary hover:text-heading"
            } ${className}`}
            title={label}
          >
            <Icon size={20} />
          </div>
        </div>
      );
    }

    return (
      <div
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
          active
            ? "bg-link/10 text-link"
            : "text-secondary hover:bg-tertiary hover:text-heading"
        } ${className}`}
      >
        <Icon size={20} />
        <span className="text-sm font-medium">{label}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-primary flex">
      {/* Desktop Sidebar */}
      <div
        className={`hidden md:block fixed left-0 top-0 h-full bg-card border-r border-primary transition-all duration-300 z-20 ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
      >
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-card border-r border-primary transform transition-transform duration-300 z-40 md:hidden ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen && window.innerWidth >= 768
            ? "ml-64"
            : window.innerWidth >= 768
              ? "ml-16"
              : "ml-0"
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-10 bg-primary/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg bg-tertiary text-secondary hover:bg-muted transition-colors md:hidden"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-heading text-lg font-semibold">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-secondary hidden sm:block">
              John Doe
            </span>
            <div className="w-8 h-8 rounded-full bg-link/20 flex items-center justify-center text-link font-semibold">
              JD
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
