import React, { useState } from 'react';
import {
  CRow, CCol, CCard, CCardBody, CCardHeader, CButton,
  CSpinner, CFormInput, CFormTextarea, CFormCheck, CBadge,
} from '@coreui/react';
import { getEmails, generateReply, createAndSendEmail } from '../services/emailService';
import { useApp } from '../context/AppContext';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

export default function EmailPage() {
  const { userEmail } = useApp();
  const [emails, setEmails] = useState([]);
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [autoReply, setAutoReply] = useState(true);

  const handleFetchEmails = async () => {
    if (!userEmail) return toast.error('Set your email in Settings first');
    setLoading(true);
    try {
      const data = await getEmails(userEmail);
      setEmails(data.emails || []);
      setSelected(null);
      setReplyText('');
      if (!data.emails?.length) toast('No emails found in inbox', { icon: '📭' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEmail = (email) => {
    setSelected(email);
    setReplyText('');
  };

  const handleGenerateReply = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const data = await generateReply(userEmail, selected.id);
      setReplyText(data.generatedReply || '');
      toast.success('AI reply generated!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!selected || !replyText.trim()) return toast.error('Nothing to send');
    setSending(true);
    try {
      await createAndSendEmail(userEmail, selected.id, replyText, autoReply);
      toast.success(autoReply ? 'Email sent successfully! ✅' : 'Draft created ✅');
      setReplyText('');
      setSelected(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dt) => {
    if (!dt) return '';
    const d = new Date(dt);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-700 mb-1" style={{ color: '#1a1f36' }}>Email</h4>
          <p className="text-muted mb-0" style={{ fontSize: '0.88rem' }}>Fetch inbox, generate AI replies and send</p>
        </div>
        <CButton className="btn-ai" onClick={handleFetchEmails} disabled={loading || !userEmail}>
          {loading ? <><CSpinner size="sm" className="me-2" /> Fetching…</> : '📥 Fetch Inbox'}
        </CButton>
      </div>

      <CRow className="g-3">
        {/* Email List */}
        <CCol md={5} lg={4}>
          <CCard style={{ height: 600, display: 'flex', flexDirection: 'column' }}>
            <CCardHeader className="d-flex align-items-center justify-content-between">
              <span>Inbox</span>
              {emails.length > 0 && <CBadge color="primary">{emails.length}</CBadge>}
            </CCardHeader>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {emails.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📭</div>
                  <div style={{ fontSize: '0.85rem' }}>Click "Fetch Inbox" to load emails</div>
                </div>
              ) : (
                emails.map((email) => (
                  <div
                    key={email.id}
                    className={`email-item ${selected?.id === email.id ? 'selected' : ''}`}
                    onClick={() => handleSelectEmail(email)}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="email-from">{email.fromName || email.from}</div>
                      <div className="email-time">{formatDate(email.receivedDateTime)}</div>
                    </div>
                    <div className="email-subject">{email.subject}</div>
                    <div className="email-preview">{email.bodyPreview}</div>
                  </div>
                ))
              )}
            </div>
          </CCard>
        </CCol>

        {/* Email Detail + Reply */}
        <CCol md={7} lg={8}>
          <CCard style={{ height: 600, display: 'flex', flexDirection: 'column' }}>
            {!selected ? (
              <CCardBody className="d-flex align-items-center justify-content-center text-muted">
                <div className="text-center">
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>✉️</div>
                  <div>Select an email to view details and generate a reply</div>
                </div>
              </CCardBody>
            ) : (
              <>
                <CCardHeader>
                  <div className="fw-600" style={{ color: '#1a1f36' }}>{selected.subject}</div>
                  <div className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>
                    From: <strong>{selected.fromName || selected.from}</strong> &lt;{selected.from}&gt;
                    &nbsp;·&nbsp; {formatDate(selected.receivedDateTime)}
                  </div>
                </CCardHeader>
                <CCardBody style={{ overflowY: 'auto', flex: 1 }}>
                  {/* Preview */}
                  <div className="mb-3 p-3" style={{ background: '#fafafa', borderRadius: 8, border: '1px solid #e9ecef', fontSize: '0.85rem', color: '#4a5568' }}>
                    {selected.bodyPreview}
                  </div>

                  {/* Generate reply */}
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <CButton
                      className="btn-ai"
                      onClick={handleGenerateReply}
                      disabled={generating}
                    >
                      {generating
                        ? <><CSpinner size="sm" className="me-2" /> Generating…</>
                        : <><span className="me-1">🤖</span> Generate AI Reply</>}
                    </CButton>
                    {replyText && <span className="badge-ai">AI Draft Ready</span>}
                  </div>

                  {/* Reply box */}
                  <div className="reply-box">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#4a5568' }}>
                        Reply
                      </label>
                      <CFormCheck
                        type="checkbox"
                        label="Auto-send (skip draft step)"
                        checked={autoReply}
                        onChange={(e) => setAutoReply(e.target.checked)}
                        style={{ fontSize: '0.78rem' }}
                      />
                    </div>
                    <CFormTextarea
                      rows={7}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="AI reply will appear here. You can also type manually."
                      style={{ fontSize: '0.85rem', resize: 'vertical' }}
                    />
                    <div className="d-flex justify-content-end mt-2 gap-2">
                      <CButton color="light" size="sm" onClick={() => setReplyText('')}>
                        Clear
                      </CButton>
                      <CButton
                        className="btn-ai"
                        size="sm"
                        onClick={handleSend}
                        disabled={sending || !replyText.trim()}
                      >
                        {sending
                          ? <><CSpinner size="sm" className="me-1" /> Sending…</>
                          : autoReply ? '🚀 Send Reply' : '📝 Save as Draft'}
                      </CButton>
                    </div>
                  </div>
                </CCardBody>
              </>
            )}
          </CCard>
        </CCol>
      </CRow>
    </>
  );
}
