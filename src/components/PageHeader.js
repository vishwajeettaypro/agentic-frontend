import React from "react";
import MailboxSelector from "./MailboxSelector";

/**
 * Shared SaaS page header — title, meta line, and actions.
 */
export default function PageHeader({
  title,
  subtitle,
  actions = null,
  showMailbox = true,
  mailboxLabel = "",
}) {
  const showMeta = Boolean(subtitle) || showMailbox;

  return (
    <header className="saas-page-header">
      <div className="saas-page-header-main">
        <div className="saas-page-header-copy">
          <h1 className="saas-page-header-title">{title}</h1>
          {showMeta ? (
            <div className="saas-page-header-meta">
              {subtitle ? (
                <p className="saas-page-header-subtitle">{subtitle}</p>
              ) : null}
              {showMailbox ? (
                <MailboxSelector
                  label={mailboxLabel || "Active mailbox"}
                  showLabel={false}
                  className="saas-page-header-mailbox"
                />
              ) : null}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="saas-page-header-actions">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
