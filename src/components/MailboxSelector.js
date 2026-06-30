import React from 'react';
import { CFormSelect, CFormLabel } from '@coreui/react';
import { useApp } from '../context/AppContext';

/**
 * Pick which connected mailbox drives Email / Calendar / History APIs.
 * Backend persists the primary/default mailbox across sessions.
 */
export default function MailboxSelector({ label = 'Active mailbox', className = '', showLabel = true }) {
  const {
    connectedMailboxes,
    userEmail,
    defaultMailboxEmail,
    setSelectedMailboxEmail,
    onboarding,
  } = useApp();

  if (!onboarding?.emailConnected || !connectedMailboxes?.length) {
    return null;
  }

  const isPrimary = (mb) =>
    mb.isDefaultMailbox || mb.mailboxEmail === defaultMailboxEmail;

  if (connectedMailboxes.length === 1) {
    const mb = connectedMailboxes[0];
    return (
      <div className={className}>
        {showLabel && (
          <div className="text-muted mb-1" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
            {label}
          </div>
        )}
        <div style={{ fontSize: '0.84rem', color: '#1a1f36' }}>
          {mb.displayName ? `${mb.displayName} · ` : ''}
          {mb.mailboxEmail}
          {isPrimary(mb) ? ' · Primary' : ''}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {showLabel && (
        <CFormLabel className="fw-semibold mb-1" style={{ fontSize: '0.82rem' }}>
          {label}
        </CFormLabel>
      )}
      <CFormSelect
        size="sm"
        value={userEmail || defaultMailboxEmail || connectedMailboxes[0]?.mailboxEmail || ''}
        onChange={(e) => setSelectedMailboxEmail(e.target.value)}
        style={{ maxWidth: 360 }}
      >
        {connectedMailboxes.map((mb) => (
          <option key={mb.id || mb.mailboxEmail} value={mb.mailboxEmail}>
            {mb.displayName ? `${mb.displayName} (${mb.mailboxEmail})` : mb.mailboxEmail}
            {mb.emailProvider ? ` · ${mb.emailProvider}` : ''}
            {isPrimary(mb) ? ' · Primary' : ''}
          </option>
        ))}
      </CFormSelect>
    </div>
  );
}

