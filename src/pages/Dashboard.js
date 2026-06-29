import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CRow, CCol, CCard, CCardBody, CCardHeader, CButton, CSpinner } from '@coreui/react';
import { getEmailStatistics } from '../services/emailService';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

export default function Dashboard() {
  const { userEmail } = useApp();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userEmail) return;
    setLoading(true);
    getEmailStatistics(userEmail)
      .then((data) => setStats(data.statistics))
      .catch(() => {}) // stats are optional
      .finally(() => setLoading(false));
  }, [userEmail]);

  const statCards = [
    { label: 'Total Processed', value: stats?.totalEmails ?? '—', cls: 'stat-primary', icon: '📧' },
    { label: 'Emails Sent', value: stats?.sentEmails ?? '—', cls: 'stat-success', icon: '✅' },
    { label: 'Drafts', value: stats?.draftEmails ?? '—', cls: 'stat-warning', icon: '📝' },
    { label: 'AI Generated', value: stats?.generatedEmails ?? '—', cls: 'stat-info', icon: '🤖' },
  ];

  return (
    <>
      <Toaster position="top-right" />
      <div className="mb-4">
        <h4 className="fw-700 mb-1" style={{ color: '#1a1f36' }}>Dashboard</h4>
        <p className="text-muted mb-0" style={{ fontSize: '0.88rem' }}>
          {userEmail ? `Logged in as ${userEmail}` : 'Set your email address in Settings to get started'}
        </p>
      </div>

      {!userEmail && (
        <div className="alert alert-warning d-flex align-items-center gap-3 mb-4" style={{ borderRadius: 10 }}>
          <span style={{ fontSize: '1.3rem' }}>⚠️</span>
          <div>
            <strong>Email not configured.</strong> Go to Settings and enter your Outlook email address to use all features.
          </div>
          <CButton color="warning" size="sm" className="ms-auto" onClick={() => navigate('/settings')}>
            Open Settings
          </CButton>
        </div>
      )}

      {/* Stat Cards */}
      <CRow className="g-3 mb-4">
        {statCards.map((s) => (
          <CCol key={s.label} xs={6} lg={3}>
            <div className={`stat-card ${s.cls}`}>
              <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>{s.icon}</div>
              <div className="stat-value">
                {loading ? <CSpinner size="sm" color="light" /> : s.value}
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          </CCol>
        ))}
      </CRow>

      {/* Quick Actions */}
      <CRow className="g-3 mb-4">
        <CCol md={4}>
          <CCard style={{ cursor: 'pointer', transition: 'box-shadow 0.18s' }}
            onClick={() => navigate('/email')}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(50,31,219,0.12)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
            <CCardBody className="text-center py-4">
              <div style={{ fontSize: '2.2rem', marginBottom: 12 }}>📥</div>
              <div className="fw-600" style={{ color: '#1a1f36' }}>Check Inbox</div>
              <div className="text-muted mt-1" style={{ fontSize: '0.82rem' }}>Fetch & AI-reply to emails</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={4}>
          <CCard style={{ cursor: 'pointer', transition: 'box-shadow 0.18s' }}
            onClick={() => navigate('/calendar')}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(50,31,219,0.12)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
            <CCardBody className="text-center py-4">
              <div style={{ fontSize: '2.2rem', marginBottom: 12 }}>📅</div>
              <div className="fw-600" style={{ color: '#1a1f36' }}>Calendar</div>
              <div className="text-muted mt-1" style={{ fontSize: '0.82rem' }}>View & create events</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={4}>
          <CCard style={{ cursor: 'pointer', transition: 'box-shadow 0.18s' }}
            onClick={() => navigate('/history')}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(50,31,219,0.12)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
            <CCardBody className="text-center py-4">
              <div style={{ fontSize: '2.2rem', marginBottom: 12 }}>📋</div>
              <div className="fw-600" style={{ color: '#1a1f36' }}>Email History</div>
              <div className="text-muted mt-1" style={{ fontSize: '0.82rem' }}>View AI-processed emails</div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* How it works */}
      <CCard>
        <CCardHeader>How it works</CCardHeader>
        <CCardBody>
          <CRow className="g-3 text-center">
            {[
              { step: '1', icon: '📧', title: 'Fetch Emails', desc: 'Pull your latest inbox messages from Outlook via Microsoft Graph API' },
              { step: '2', icon: '🤖', title: 'AI Generates Reply', desc: 'Gemini AI reads the email and crafts a professional reply' },
              { step: '3', icon: '✏️', title: 'Review & Edit', desc: 'Check the generated reply, make any edits needed' },
              { step: '4', icon: '🚀', title: 'Send', desc: 'One click to create a draft and send it back to the sender' },
            ].map((item) => (
              <CCol key={item.step} sm={6} lg={3}>
                <div style={{
                  background: '#f8f9ff', borderRadius: 10, padding: '16px 12px',
                  border: '1px solid #e2e6ff'
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #321fdb, #5b5ea6)',
                    color: '#fff', fontWeight: 700, fontSize: '0.82rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 10px'
                  }}>{item.step}</div>
                  <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{item.icon}</div>
                  <div className="fw-600 mb-1" style={{ fontSize: '0.88rem', color: '#1a1f36' }}>{item.title}</div>
                  <div className="text-muted" style={{ fontSize: '0.78rem' }}>{item.desc}</div>
                </div>
              </CCol>
            ))}
          </CRow>
        </CCardBody>
      </CCard>
    </>
  );
}
