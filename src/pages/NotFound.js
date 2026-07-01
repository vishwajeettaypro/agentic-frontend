import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CButton } from '@coreui/react';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="text-center" style={{ paddingTop: 80 }}>
      <div style={{ fontSize: '4rem', marginBottom: 16 }}>🔍</div>
      <h2 style={{ color: '#1a1f36', fontWeight: 700 }}>Page not found</h2>
      <p className="text-muted mb-4">The page you're looking for doesn't exist.</p>
      <CButton className="btn-ai" onClick={() => navigate('/agents')}>
        Back to Dashboard
      </CButton>
    </div>
  );
}
