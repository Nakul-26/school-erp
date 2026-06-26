import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Loader2
} from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface KPIProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  description?: string;
  onClick?: () => void;
}

export interface HealthCheckItem {
  label: string;
  passed: boolean;
  message?: string;
  cta?: {
    label: string;
    onClick: () => void;
  };
}

export interface WorkspaceShellProps {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  statusBadge?: {
    label: string;
    type: 'success' | 'warning' | 'danger' | 'secondary' | 'info';
  };
  actions?: React.ReactNode;
  health?: {
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    checks?: HealthCheckItem[];
  };
  kpis?: KPIProps[];
  tabs: {
    id: string;
    label: string;
    count?: number;
    icon?: React.ReactNode;
  }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  loading?: boolean;
}

export default function WorkspaceShell({
  title,
  breadcrumbs,
  statusBadge,
  actions,
  health,
  kpis,
  tabs,
  activeTab,
  onTabChange,
  children,
  sidebar,
  loading = false
}: WorkspaceShellProps) {
  
  if (loading) {
    return (
      <div className="workspace-loading">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading workspace data...</p>
      </div>
    );
  }

  // Determine health colors and icons
  const getHealthConfig = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return {
          icon: <CheckCircle2 className="text-success" size={20} />,
          badgeClass: 'badge-success',
          bannerClass: 'health-banner-healthy',
          label: 'Healthy'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="text-warning" size={20} />,
          badgeClass: 'badge-warning',
          bannerClass: 'health-banner-warning',
          label: 'Needs Attention'
        };
      case 'critical':
        return {
          icon: <AlertCircle className="text-danger" size={20} />,
          badgeClass: 'badge-danger',
          bannerClass: 'health-banner-critical',
          label: 'Critical Action Required'
        };
    }
  };

  const healthConfig = health ? getHealthConfig(health.status) : null;

  return (
    <div className="workspace-container">
      {/* 1. Breadcrumbs */}
      <nav className="workspace-breadcrumbs" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronRight size={14} className="crumb-separator" />}
            {crumb.to ? (
              <Link to={crumb.to} className="crumb-link">
                {crumb.label}
              </Link>
            ) : (
              <span className="crumb-current">{crumb.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* 2. Hero Header */}
      <header className="workspace-header">
        <div className="header-title-area">
          <h1 className="workspace-title">{title}</h1>
          {statusBadge && (
            <span className={`badge badge-${statusBadge.type} workspace-status-badge`}>
              {statusBadge.label}
            </span>
          )}
        </div>
        {actions && <div className="workspace-header-actions">{actions}</div>}
      </header>

      {/* 3. Health Indicator Banner */}
      {health && healthConfig && (
        <section className={`workspace-health-banner ${healthConfig.bannerClass}`}>
          <div className="health-banner-header">
            <div className="health-title-group">
              {healthConfig.icon}
              <div>
                <h3 className="health-status-title">
                  System Health: <span className={`badge ${healthConfig.badgeClass}`}>{healthConfig.label}</span>
                </h3>
                <p className="health-status-msg">{health.message}</p>
              </div>
            </div>
          </div>
          
          {health.checks && health.checks.length > 0 && (
            <div className="health-checks-grid">
              {health.checks.map((check, idx) => (
                <div key={idx} className="health-check-card">
                  <span className="check-indicator">
                    {check.passed ? (
                      <span className="indicator-dot dot-passed">✓</span>
                    ) : (
                      <span className="indicator-dot dot-failed">!</span>
                    )}
                  </span>
                  <div className="check-body">
                    <span className="check-label">{check.label}</span>
                    {check.message && <p className="check-desc">{check.message}</p>}
                  </div>
                  {check.cta && !check.passed && (
                    <button 
                      onClick={check.cta.onClick}
                      className="btn btn-outline btn-sm check-cta"
                    >
                      {check.cta.label}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. KPI Stats Grid */}
      {kpis && kpis.length > 0 && (
        <section className="workspace-kpi-grid">
          {kpis.map((kpi, idx) => {
            const colorClass = kpi.color ? `kpi-${kpi.color}` : 'kpi-primary';
            return (
              <div 
                key={idx} 
                className={`workspace-kpi-card ${colorClass} ${kpi.onClick ? 'kpi-clickable' : ''}`}
                onClick={kpi.onClick}
              >
                <div className="kpi-header">
                  <span className="kpi-label">{kpi.label}</span>
                  {kpi.icon && <span className="kpi-icon">{kpi.icon}</span>}
                </div>
                <div className="kpi-value">{kpi.value}</div>
                {kpi.description && <p className="kpi-desc">{kpi.description}</p>}
              </div>
            );
          })}
        </section>
      )}

      {/* 5. Navigation Tabs */}
      <nav className="workspace-tabs-nav" aria-label="Workspace Sections">
        <div className="workspace-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`workspace-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.icon && <span className="tab-icon">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="tab-count-badge">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* 6. Dynamic Content Area (with optional sidebar) */}
      <div className={`workspace-content-layout ${sidebar ? 'has-sidebar' : ''}`}>
        <main className="workspace-main-content">
          {children}
        </main>
        {sidebar && (
          <aside className="workspace-sidebar">
            {sidebar}
          </aside>
        )}
      </div>
    </div>
  );
}
