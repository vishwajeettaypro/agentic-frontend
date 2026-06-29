import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  CContainer,
  CSidebar,
  CSidebarBrand,
  CSidebarNav,
  CNavItem,
  CNavLink,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CBadge,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilSpeedometer,
  cilEnvelopeClosed,
  cilCalendar,
  cilHistory,
  cilSettings,
  cilMenu,
  cilUser,
  cilBell,
} from '@coreui/icons';
import { useApp } from '../context/AppContext';

const navItems = [
  { to: '/dashboard', icon: cilSpeedometer, label: 'Dashboard' },
  { to: '/email',     icon: cilEnvelopeClosed, label: 'Email' },
  { to: '/calendar',  icon: cilCalendar, label: 'Calendar' },
  { to: '/history',   icon: cilHistory, label: 'History' },
  { to: '/settings',  icon: cilSettings, label: 'Settings' },
];

export default function DefaultLayout() {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const { userEmail, setUserEmail } = useApp();
  const navigate = useNavigate();

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <CSidebar
        visible={sidebarVisible}
        onVisibleChange={setSidebarVisible}
        style={{ position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 1030, width: 240 }}
      >
        <CSidebarBrand className="py-3">
          <div className="sidebar-brand-name d-flex align-items-center gap-2">
            <span style={{ fontSize: '1.4rem' }}>🤖</span>
            <span>Agentic AI</span>
          </div>
        </CSidebarBrand>

        <CSidebarNav>
          {navItems.map(({ to, icon, label }) => (
            <CNavItem key={to}>
              <NavLink to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <CIcon icon={icon} className="nav-icon" />
                {label}
              </NavLink>
            </CNavItem>
          ))}
        </CSidebarNav>

        {/* User section at bottom */}
        {userEmail && (
          <div className="mt-auto p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="d-flex align-items-center gap-2">
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 700, color: '#fff'
              }}>
                {userEmail[0]?.toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userEmail}
                </div>
              </div>
            </div>
          </div>
        )}
      </CSidebar>

      {/* Main content */}
      <div style={{ flex: 1, marginLeft: sidebarVisible ? 240 : 0, transition: 'margin-left 0.3s', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <CHeader className="px-4 py-2 d-flex align-items-center justify-content-between" style={{ position: 'sticky', top: 0, zIndex: 1020 }}>
          <CHeaderToggler onClick={() => setSidebarVisible(!sidebarVisible)} className="me-3">
            <CIcon icon={cilMenu} size="lg" />
          </CHeaderToggler>

          <div className="ms-auto d-flex align-items-center gap-3">
            {!userEmail && (
              <CBadge color="warning" className="text-dark" style={{ cursor: 'pointer' }} onClick={() => navigate('/settings')}>
                ⚠ Set your email in Settings
              </CBadge>
            )}
            <CIcon icon={cilBell} style={{ color: '#6c757d', cursor: 'pointer' }} />
            <CDropdown>
              <CDropdownToggle caret={false} className="p-0 border-0 bg-transparent">
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #321fdb, #5b5ea6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                }}>
                  {userEmail ? userEmail[0]?.toUpperCase() : <CIcon icon={cilUser} />}
                </div>
              </CDropdownToggle>
              <CDropdownMenu>
                <CDropdownItem onClick={() => navigate('/settings')}>
                  <CIcon icon={cilSettings} className="me-2" /> Settings
                </CDropdownItem>
                <CDropdownItem onClick={() => { setUserEmail(''); navigate('/settings'); }}>
                  Sign out
                </CDropdownItem>
              </CDropdownMenu>
            </CDropdown>
          </div>
        </CHeader>

        {/* Page content */}
        <CContainer fluid className="p-4" style={{ flex: 1 }}>
          <Outlet />
        </CContainer>
      </div>
    </div>
  );
}
