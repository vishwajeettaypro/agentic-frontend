import React from 'react';
import { Link } from 'react-router-dom';
import { CCol, CContainer, CRow } from '@coreui/react';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <CContainer fluid className="p-0 h-100">
        <CRow className="g-0 min-vh-100">
          <CCol
            lg={6}
            className="auth-brand-panel d-none d-lg-flex flex-column justify-content-center p-5"
          >
            <div className="auth-brand-content">
              <div className="auth-logo mb-4">
                <img
                  src="/logo.png"
                  alt="Taypro AI"
                  style={{ height: 32, objectFit: 'contain' }}
                />
              </div>
              <h1 className="auth-headline mb-3">
                AI-powered email and calendar for modern teams.
              </h1>
              <p className="auth-tagline mb-0">
                Automate replies, manage your inbox, and stay on schedule — all
                from one workspace.
              </p>
            </div>
          </CCol>

          <CCol
            lg={6}
            className="d-flex align-items-center justify-content-center p-4 p-md-5"
          >
            <div className="auth-form-wrapper w-100">
              <div className="d-lg-none text-center mb-4">
                <Link to="/login" className="auth-logo-mobile d-inline-block">
                  <img
                    src="/logo.png"
                    alt="Taypro AI"
                    style={{ height: 28, objectFit: 'contain' }}
                  />
                </Link>
              </div>

              <div className="auth-card">
                <div className="mb-4">
                  <h2 className="auth-title mb-1">{title}</h2>
                  {subtitle && <p className="auth-subtitle mb-0">{subtitle}</p>}
                </div>

                {children}
              </div>

              {footer && <div className="auth-footer text-center mt-4">{footer}</div>}
            </div>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  );
}
