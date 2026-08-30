import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Check,
  Target,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import STATICPATHS from "../utils/STATICPATHS";
const Home = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-bg-primary font-sans transition-colors duration-300">
      {/* Hero Section */}
      <section className="pt-12 pb-6 px-6 md:px-12 lg:px-24 text-center">
        <span className="inline-block bg-chip-bg text-chip-text px-4 py-1.5 rounded-full mb-4 tracking-wide text-xs font-semibold">
          All-in-one platform
        </span>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-text-heading">
          Task / Employee / Campaign / Leads Management
          <span className="text-text-link block mt-2 text-blue-900">
            unified for your team
          </span>
        </h1>
        <p className="text-text-tertiary text-lg md:text-xl mt-4 max-w-2xl mx-auto">
          One platform. Infinite workflows. Manage projects, leads, campaigns,
          and people — all in one place.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button
            onClick={() => navigate(STATICPATHS.registerOrganization)}
            className="btn-primary px-8 py-3.5 rounded-xl shadow-lg transition flex items-center gap-2 font-semibold"
          >
            Get started <ArrowRight size={18} />
          </button>
          <button className="bg-bg-card border border-border-primary text-text-secondary px-8 py-3.5 rounded-xl hover:border-text-link transition flex items-center gap-2 font-medium shadow-sm">
            <Users size={18} /> Create your org
          </button>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-text-tertiary">
          <span className="flex items-center gap-1">
            <Check size={16} className="text-text-link" /> No credit card
          </span>
          <span className="flex items-center gap-1">
            <Check size={16} className="text-text-link" /> 14-day trial on Pro
          </span>
          <span className="flex items-center gap-1">
            <Check size={16} className="text-text-link" /> Cancel anytime
          </span>
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="px-6 md:px-12 lg:px-24 py-12 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free Plan */}
          <div className="bg-bg-card border border-border-primary shadow-card p-6 flex flex-col rounded-xl hover:shadow-card-hover transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-chip-text bg-chip-bg px-3 py-1 rounded-full">
                Free
              </span>
              <span className="text-xs text-text-tertiary">starter</span>
            </div>
            <div className="mt-4">
              <span className="text-4xl font-bold text-text-heading">$0</span>
              <span className="text-text-tertiary ml-1">/ month</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm flex-1">
              <li className="flex items-start gap-2 text-text-secondary">
                <Check size={18} className="text-text-link shrink-0 mt-0.5" />
                <span>
                  <strong className="text-text-heading">10</strong> total
                  members
                </span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check size={18} className="text-text-link shrink-0 mt-0.5" />
                <span>
                  <span className="text-text-tertiary line-through mr-1">
                    departments
                  </span>{" "}
                  <span className="text-text-error">✕</span> cannot create
                </span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check size={18} className="text-text-link shrink-0 mt-0.5" />
                <span>Basic Task & CRM</span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check size={18} className="text-text-link shrink-0 mt-0.5" />
                <span>Community support</span>
              </li>
            </ul>
            <button className="btn-secondary mt-8 w-full font-medium py-2.5 rounded-xl transition">
              Get started
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-bg-card border-2 border-text-link shadow-card p-6 flex flex-col relative rounded-xl hover:shadow-card-hover transition-shadow">
            <span className="absolute -top-3 z-10 left-1/2 -translate-x-1/2 bg-bg-primary text-text-inverse text-xs font-bold px-4 py-1 rounded-full shadow-md bg-white">
              POPULAR
            </span>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-chip-text bg-chip-bg px-3 py-1 rounded-full">
                Pro
              </span>
              <span className="text-xs text-text-tertiary">growing teams</span>
            </div>
            <div className="mt-4">
              <span className="text-4xl font-bold text-text-heading">$29</span>
              <span className="text-text-tertiary ml-1">/ month</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm flex-1">
              <li className="flex items-start gap-2 text-text-secondary">
                <Check size={18} className="text-text-link shrink-0 mt-0.5" />
                <span>
                  <strong className="text-text-heading">50</strong> total
                  members
                </span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check size={18} className="text-text-link shrink-0 mt-0.5" />
                <span>
                  Up to <strong className="text-text-heading">10</strong>{" "}
                  departments
                </span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check size={18} className="text-text-link shrink-0 mt-0.5" />
                <span>Advanced Task + CRM + HR</span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check size={18} className="text-text-link shrink-0 mt-0.5" />
                <span>Campaign management</span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check size={18} className="text-text-link shrink-0 mt-0.5" />
                <span>Automation & reports</span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check size={18} className="text-text-link shrink-0 mt-0.5" />
                <span>Priority email support</span>
              </li>
            </ul>
            <button className="btn-primary mt-8 w-full font-medium py-2.5 rounded-xl shadow-md transition">
              Start 14-day trial
            </button>
          </div>

          {/* Premium Plan */}
          <div className="bg-bg-card border border-border-primary shadow-card p-6 flex flex-col rounded-xl hover:shadow-card-hover transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-text-warning bg-chip-bg px-3 py-1 rounded-full">
                Premium
              </span>
              <span className="text-xs text-text-tertiary">enterprise</span>
            </div>
            <div className="mt-4">
              <span className="text-4xl font-bold text-text-heading">$79</span>
              <span className="text-text-tertiary ml-1">/ month</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm flex-1">
              <li className="flex items-start gap-2 text-text-secondary">
                <Check size={18} className="text-text-link shrink-0 mt-0.5" />
                <span>
                  <strong className="text-text-heading">Unlimited</strong>{" "}
                  members
                </span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check size={18} className="text-text-link shrink-0 mt-0.5" />
                <span>
                  <strong className="text-text-heading">Unlimited</strong>{" "}
                  departments
                </span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check size={18} className="text-text-link shrink-0 mt-0.5" />
                <span>Full Task + CRM + HR suite</span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check size={18} className="text-text-link shrink-0 mt-0.5" />
                <span>Advanced campaign automation</span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check size={18} className="text-text-link shrink-0 mt-0.5" />
                <span>Custom fields & workflows</span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check size={18} className="text-text-link shrink-0 mt-0.5" />
                <span>Dedicated account manager</span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check size={18} className="text-text-link shrink-0 mt-0.5" />
                <span>SSO & advanced security</span>
              </li>
            </ul>
            <button className="btn-secondary mt-8 w-full font-medium py-2.5 rounded-xl transition">
              Contact sales
            </button>
          </div>
        </div>
        <p className="text-center text-text-tertiary text-xs mt-6">
          All plans include core Task Management, CRM, Employee Management, and
          Campaign modules. Upgrade anytime.
        </p>
      </section>

      {/* Feature highlights */}
      <section className="px-6 md:px-12 lg:px-24 py-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center border-border-primary pt-10">
          <div className="flex flex-col items-center">
            <Briefcase size={28} className="text-text-link" />
            <span className="text-sm font-medium text-text-secondary mt-2">
              Task Management
            </span>
          </div>
          <div className="flex flex-col items-center">
            <BarChart3 size={28} className="text-text-link" />
            <span className="text-sm font-medium text-text-secondary mt-2">
              Sales CRM
            </span>
          </div>
          <div className="flex flex-col items-center">
            <Users size={28} className="text-text-link" />
            <span className="text-sm font-medium text-text-secondary mt-2">
              Employee Management
            </span>
          </div>
          <div className="flex flex-col items-center">
            <Target size={28} className="text-text-link" />
            <span className="text-sm font-medium text-text-secondary mt-2">
              Campaign Management
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
