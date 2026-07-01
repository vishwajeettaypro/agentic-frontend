import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilApps,
  cilSettings,
  cilMenu,
  cilUser,
  cilBell,
  cilAccountLogout,
  cilChevronLeft,
} from "@coreui/icons";
import { useApp } from "../context/AppContext";
import { AGENTS } from "../config/agents";

const platformNav = [
  { to: "/agents", icon: cilApps, label: "All Agents", end: true },
  { to: "/settings", icon: cilSettings, label: "Settings" },
];

export default function DefaultLayout() {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const { user, userEmail, authEmail, connectedMailboxes, logout } = useApp();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const displayEmail = userEmail || authEmail || user?.email || "";
  const displayName =
    user?.name ||
    user?.displayName ||
    displayEmail.split("@")[0] ||
    "Account";

  const activeAgent = AGENTS.find((agent) =>
    pathname.toLowerCase().startsWith(agent.basePath.toLowerCase()),
  );

  const renderNavLink = ({ to, icon, label, end = false, nested = false }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "saas-nav-link",
          nested ? "saas-nav-link--nested" : "",
          isActive ? "saas-nav-link--active" : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      {icon ? (
        <span className="saas-nav-icon-wrap">
          <CIcon icon={icon} className="saas-nav-icon" />
        </span>
      ) : null}
      <span className="saas-nav-label">{label}</span>
    </NavLink>
  );

  return (
    <div
      className={`saas-app${sidebarVisible ? "" : " saas-app--sidebar-collapsed"}`}
    >
      {sidebarVisible ? (
        <button
          type="button"
          className="saas-sidebar-backdrop d-lg-none"
          aria-label="Close navigation"
          onClick={() => setSidebarVisible(false)}
        />
      ) : null}

      <aside className="saas-sidebar">
        <div className="saas-sidebar-glow" aria-hidden="true" />

        <div className="saas-sidebar-brand">
          <div className="saas-sidebar-brand-main">
            <img src="/logo.png" alt="Taypro AI" className="saas-sidebar-logo" />
            <div className="saas-sidebar-brand-text">
              <span className="saas-sidebar-product">Agent Console</span>
              <span className="saas-sidebar-tagline">AI Workspace</span>
            </div>
          </div>
          <button
            type="button"
            className="saas-sidebar-collapse d-none d-lg-inline-flex"
            aria-label="Collapse sidebar"
            onClick={() => setSidebarVisible(false)}
          >
            <CIcon icon={cilChevronLeft} />
          </button>
        </div>

        <div className="saas-sidebar-nav">
          <div className="saas-nav-section">
            <span className="saas-nav-section-label">Platform</span>
            <div className="saas-nav-group">
              {platformNav.map((item) => renderNavLink(item))}
            </div>
          </div>

          <div className="saas-nav-section saas-nav-section--agents">
            <span className="saas-nav-section-label">Agents</span>
            <div className="saas-nav-group">
              {AGENTS.map((agent) => {
                const isAgentActive = pathname
                  .toLowerCase()
                  .startsWith(agent.basePath.toLowerCase());
                const hasSubNav = agent.nav?.length > 0;

                return (
                  <div
                    key={agent.id}
                    className={`saas-nav-agent${isAgentActive ? " saas-nav-agent--open" : ""}`}
                  >
                    <NavLink
                      to={agent.basePath}
                      className={({ isActive }) =>
                        [
                          "saas-nav-link",
                          "saas-nav-link--agent",
                          agent.comingSoon ? "saas-nav-link--muted" : "",
                          isActive && !hasSubNav ? "saas-nav-link--active" : "",
                          isAgentActive ? "saas-nav-link--agent-active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")
                      }
                    >
                      <span
                        className="saas-nav-agent-badge"
                        style={{ "--agent-color": agent.color }}
                        aria-hidden="true"
                      >
                        {agent.icon}
                      </span>
                      <span className="saas-nav-label">
                        <span className="saas-nav-agent-name">{agent.shortName}</span>
                        {agent.comingSoon ? (
                          <span className="saas-nav-soon">Soon</span>
                        ) : null}
                      </span>
                    </NavLink>

                    {hasSubNav && isAgentActive ? (
                      <div className="saas-nav-sub">
                        {agent.nav.map((item) =>
                          renderNavLink({ ...item, nested: true }),
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {displayEmail ? (
          <div className="saas-sidebar-footer">
            <button
              type="button"
              className="saas-sidebar-user"
              onClick={() => navigate("/settings")}
            >
              <div className="saas-sidebar-user-avatar" aria-hidden="true">
                {displayEmail[0]?.toUpperCase()}
                <span className="saas-sidebar-user-status" />
              </div>
              <div className="saas-sidebar-user-meta">
                <span className="saas-sidebar-user-name">{displayName}</span>
                <span className="saas-sidebar-user-email">{displayEmail}</span>
              </div>
            </button>
            {activeAgent ? (
              <span
                className="saas-sidebar-agent-pill"
                style={{ "--agent-color": activeAgent.color }}
              >
                {activeAgent.shortName}
              </span>
            ) : null}
          </div>
        ) : null}
      </aside>

      <div className="saas-main">
        <header className="saas-header">
          <div className="saas-header-start">
            <button
              type="button"
              className="saas-header-toggle"
              aria-label={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
              onClick={() => setSidebarVisible(!sidebarVisible)}
            >
              <CIcon icon={cilMenu} />
            </button>
            {activeAgent ? (
              <div className="saas-header-context">
                <span
                  className="saas-header-context-dot"
                  style={{ background: activeAgent.color }}
                />
                <span className="saas-header-context-label">
                  {activeAgent.name}
                </span>
              </div>
            ) : null}
          </div>

          <div className="saas-header-end">
            {!displayEmail ? (
              <button
                type="button"
                className="saas-header-pill saas-header-pill--warning"
                onClick={() => navigate("/settings")}
              >
                Connect mailbox
              </button>
            ) : null}

            <button
              type="button"
              className="saas-header-icon-btn"
              aria-label="Notifications"
            >
              <CIcon icon={cilBell} />
            </button>

            <CDropdown alignment="end">
              <CDropdownToggle
                caret={false}
                className="saas-header-profile-toggle"
              >
                <div className="saas-header-avatar">
                  {displayEmail ? (
                    displayEmail[0]?.toUpperCase()
                  ) : (
                    <CIcon icon={cilUser} />
                  )}
                </div>
              </CDropdownToggle>
              <CDropdownMenu className="saas-dropdown-menu">
                {displayEmail ? (
                  <>
                    <div className="saas-dropdown-header">
                      <span className="saas-dropdown-name">{displayName}</span>
                      <span className="saas-dropdown-email">{displayEmail}</span>
                      {connectedMailboxes.length > 1 ? (
                        <span className="saas-dropdown-meta">
                          {connectedMailboxes.length} connected mailboxes
                        </span>
                      ) : null}
                    </div>
                    <CDropdownItem divider />
                  </>
                ) : null}
                <CDropdownItem onClick={() => navigate("/agents")}>
                  <CIcon icon={cilApps} className="me-2" />
                  All Agents
                </CDropdownItem>
                <CDropdownItem onClick={() => navigate("/settings")}>
                  <CIcon icon={cilSettings} className="me-2" />
                  Settings
                </CDropdownItem>
                <CDropdownItem
                  onClick={async () => {
                    await logout();
                    navigate("/login");
                  }}
                >
                  <CIcon icon={cilAccountLogout} className="me-2" />
                  Sign out
                </CDropdownItem>
              </CDropdownMenu>
            </CDropdown>
          </div>
        </header>

        <main className="saas-content">
          <div className="saas-content-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
