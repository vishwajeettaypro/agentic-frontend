import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useApp } from "../context/AppContext";

const PROVIDER_META = {
  gmail: { label: "Gmail", className: "mailbox-selector__provider--gmail" },
  outlook: { label: "Outlook", className: "mailbox-selector__provider--outlook" },
};

const getMailboxEmail = (mb) => mb?.mailboxEmail || mb?.email || "";

const getProviderMeta = (provider) =>
  PROVIDER_META[provider] || {
    label: provider ? String(provider) : "Mailbox",
    className: "mailbox-selector__provider--default",
  };

const getMailboxInitial = (email = "") =>
  email.trim()[0]?.toUpperCase() || "?";

/**
 * Mailbox switcher — provider badge, avatar, and custom dropdown menu.
 */
export default function MailboxSelector({
  label = "Active mailbox",
  className = "",
  showLabel = false,
  variant = "inline",
}) {
  const listboxId = useId();
  const controlRef = useRef(null);
  const [open, setOpen] = useState(false);

  const {
    connectedMailboxes,
    userEmail,
    defaultMailboxEmail,
    setSelectedMailboxEmail,
    onboarding,
  } = useApp();

  const mailboxes = useMemo(
    () => connectedMailboxes || [],
    [connectedMailboxes],
  );

  const activeEmail =
    userEmail || defaultMailboxEmail || getMailboxEmail(mailboxes[0]);

  const activeMailbox = useMemo(
    () =>
      mailboxes.find((mb) => getMailboxEmail(mb) === activeEmail) ||
      mailboxes[0],
    [mailboxes, activeEmail],
  );

  const canSwitch = mailboxes.length > 1;

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!controlRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!onboarding?.emailConnected || !mailboxes.length || !activeMailbox) {
    return null;
  }

  const activeEmailValue = getMailboxEmail(activeMailbox);
  const activeProvider = getProviderMeta(activeMailbox.emailProvider);
  const rootClass = [
    "mailbox-selector",
    `mailbox-selector--${variant}`,
    canSwitch ? "mailbox-selector--switchable" : "mailbox-selector--static",
    open ? "mailbox-selector--open" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleSelect = (mailboxEmail) => {
    setSelectedMailboxEmail(mailboxEmail);
    setOpen(false);
  };

  const renderMailboxOption = (mb) => {
    const email = getMailboxEmail(mb);
    const provider = getProviderMeta(mb.emailProvider);
    const isActive = email === activeEmailValue;
    const displayName =
      mb.displayName?.trim() || email.split("@")[0] || "Mailbox";

    return (
      <li key={mb.id || email} role="none" className="mailbox-selector__menu-item">
        <button
          type="button"
          className={[
            "mailbox-selector__option",
            isActive ? "mailbox-selector__option--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          role="option"
          aria-selected={isActive}
          onClick={() => handleSelect(email)}
        >
          <span
            className={`mailbox-selector__avatar mailbox-selector__avatar--${mb.emailProvider || "default"}`}
            aria-hidden="true"
          >
            {getMailboxInitial(email)}
          </span>

          <span className="mailbox-selector__option-copy">
            <span className="mailbox-selector__option-top">
              <span className="mailbox-selector__option-email" title={email}>
                {email}
              </span>
              {mb.isDefaultMailbox ? (
                <span className="mailbox-selector__badge">Primary</span>
              ) : null}
            </span>
            <span className="mailbox-selector__option-meta">
              <span
                className={`mailbox-selector__provider ${provider.className}`}
              >
                {provider.label}
              </span>
              {displayName !== email.split("@")[0] ? (
                <span className="mailbox-selector__display-name">
                  {displayName}
                </span>
              ) : null}
            </span>
          </span>

          {isActive ? (
            <span className="mailbox-selector__check-wrap" aria-hidden="true">
              <Check className="mailbox-selector__check" size={15} strokeWidth={2.5} />
            </span>
          ) : null}
        </button>
      </li>
    );
  };

  return (
    <div className={rootClass} ref={controlRef}>
      {showLabel ? (
        <span className="mailbox-selector__label">{label}</span>
      ) : null}

      <div className="mailbox-selector__control">
        <button
          type="button"
          className="mailbox-selector__trigger"
          aria-haspopup="listbox"
          aria-expanded={canSwitch ? open : false}
          aria-controls={canSwitch ? listboxId : undefined}
          disabled={!canSwitch}
          onClick={() => canSwitch && setOpen((prev) => !prev)}
        >
          <span
            className={`mailbox-selector__avatar mailbox-selector__avatar--${activeMailbox.emailProvider || "default"}`}
            aria-hidden="true"
          >
            {getMailboxInitial(activeEmailValue)}
          </span>

          <span className="mailbox-selector__trigger-copy">
            <span className="mailbox-selector__trigger-top">
              <span
                className="mailbox-selector__trigger-email"
                title={activeEmailValue}
              >
                {activeEmailValue}
              </span>
              <span
                className={`mailbox-selector__provider ${activeProvider.className}`}
              >
                {activeProvider.label}
              </span>
            </span>
            {activeMailbox.isDefaultMailbox ? (
              <span className="mailbox-selector__trigger-hint">Primary mailbox</span>
            ) : (
              <span className="mailbox-selector__trigger-hint">
                {canSwitch
                  ? `${mailboxes.length} mailboxes connected`
                  : "Connected mailbox"}
              </span>
            )}
          </span>

          {canSwitch ? (
            <ChevronDown
              className="mailbox-selector__chevron"
              size={16}
              strokeWidth={2}
              aria-hidden="true"
            />
          ) : null}
        </button>

        {canSwitch && open ? (
          <div className="mailbox-selector__menu" role="presentation">
            <div className="mailbox-selector__menu-header">
              <span className="mailbox-selector__menu-title">Switch mailbox</span>
              <span className="mailbox-selector__menu-count">
                {mailboxes.length} connected
              </span>
            </div>
            <ul
              id={listboxId}
              className="mailbox-selector__menu-list"
              role="listbox"
              aria-label={label}
            >
              {mailboxes.map((mb) => renderMailboxOption(mb))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
