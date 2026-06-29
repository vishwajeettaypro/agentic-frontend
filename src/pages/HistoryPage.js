import React, { useState, useEffect } from 'react';
import {
  CCard, CCardBody, CCardHeader, CButton, CSpinner,
  CFormInput, CInputGroup, CInputGroupText,
} from '@coreui/react';
import { getEmailHistory, deleteEmailRecord } from '../services/emailService';
import { useApp } from '../context/AppContext';
import toast, { Toaster } from 'react-hot-toast';

export default function HistoryPage() {
  const { userEmail } = useApp();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  const fetchHistory = async () => {
    if (!userEmail) return;
    setLoading(true);
    try {
      const data = await getEmailHistory(userEmail);
      setRecords(data.emails || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [userEmail]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    setDeleting(id);
    try {
      await deleteEmailRecord(id);
      setRecords((r) => r.filter((x) => x._id !== id));
      toast.success('Record deleted');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const filtered = records.filter((r) =>
    !search ||
    r.subject?.toLowerCase().includes(search.toLowerCase()) ||
    r.from?.toLowerCase().includes(search.toLowerCase()) ||
    r.fromName?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dt) => dt ? new Date(dt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  return (
    <>
      <Toaster position="top-right" />
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-700 mb-1" style={{ color: '#1a1f36' }}>Email History</h4>
          <p className="text-muted mb-0" style={{ fontSize: '0.88rem' }}>All AI-processed emails for your account</p>
        </div>
        <CButton className="btn-ai" onClick={fetchHistory} disabled={loading || !userEmail}>
          {loading ? <CSpinner size="sm" /> : '🔄 Refresh'}
        </CButton>
      </div>

      {!userEmail ? (
        <div className="alert alert-warning" style={{ borderRadius: 10 }}>⚠️ Set your email in Settings first.</div>
      ) : (
        <CCard>
          <CCardHeader className="d-flex align-items-center gap-3">
            <span>Records ({filtered.length})</span>
            <div style={{ maxWidth: 280, marginLeft: 'auto' }}>
              <CInputGroup size="sm">
                <CInputGroupText>🔍</CInputGroupText>
                <CFormInput
                  placeholder="Search emails…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </CInputGroup>
            </div>
          </CCardHeader>
          <CCardBody className="p-0">
            {loading ? (
              <div className="loading-overlay">
                <CSpinner color="primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📭</div>
                <div>No history records found</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table table-hover mb-0" style={{ fontSize: '0.84rem' }}>
                  <thead style={{ background: '#f8f9ff' }}>
                    <tr>
                      <th className="px-4 py-3 border-0">From</th>
                      <th className="px-3 py-3 border-0">Subject</th>
                      <th className="px-3 py-3 border-0">Status</th>
                      <th className="px-3 py-3 border-0">Received</th>
                      <th className="px-3 py-3 border-0">AI Reply</th>
                      <th className="px-3 py-3 border-0"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r._id}>
                        <td className="px-4 py-3 align-middle">
                          <div className="fw-600" style={{ color: '#1a1f36' }}>{r.fromName || r.from}</div>
                          <div className="text-muted" style={{ fontSize: '0.76rem' }}>{r.from}</div>
                        </td>
                        <td className="px-3 py-3 align-middle" style={{ maxWidth: 220 }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                            {r.subject}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <span className={`status-badge status-${r.status}`}>{r.status}</span>
                        </td>
                        <td className="px-3 py-3 align-middle text-muted">
                          {formatDate(r.receivedDateTime || r.createdAt)}
                        </td>
                        <td className="px-3 py-3 align-middle" style={{ maxWidth: 200 }}>
                          <div style={{
                            fontSize: '0.78rem', color: '#4a5568',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180
                          }}>
                            {r.generatedReply || '—'}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <CButton
                            color="light"
                            size="sm"
                            style={{ fontSize: '0.75rem', color: '#dc3545' }}
                            onClick={() => handleDelete(r._id)}
                            disabled={deleting === r._id}
                          >
                            {deleting === r._id ? <CSpinner size="sm" /> : '🗑'}
                          </CButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CCardBody>
        </CCard>
      )}
    </>
  );
}
