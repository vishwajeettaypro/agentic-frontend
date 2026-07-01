import React, { useEffect, useMemo, useState } from "react";
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CSpinner,
  CFormTextarea,
  CFormCheck,
  CBadge,
  CAlert,
} from "@coreui/react";
import {
  getEmails,
  generateReply,
  createAndSendEmail,
  downloadEmailAttachment,
  getUserPreferences,
} from "../services/emailService";
import { useApp } from "../context/AppContext";
import PageHeader from "../components/PageHeader";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";

const CATEGORY_COLORS = {
  Work: "#321fdb",
  Personal: "#2eb85c",
  Marketing: "#9b59b6",
  Support: "#f9b115",
  Urgent: "#e55353",
  Finance: "#0d9488",
  Meeting: "#6366f1",
  Newsletter: "#6c757d",
  General: "#94a3b8",
};

const getCategoryColor = (category) => CATEGORY_COLORS[category] || "#5b5ea6";

const CategoryBadge = ({ category, size = "sm" }) => {
  if (!category) return null;
  const color = getCategoryColor(category);
  return (
    <span
      className="email-category-badge"
      style={{
        background: `${color}18`,
        color,
        borderColor: `${color}40`,
        fontSize: size === "sm" ? "0.68rem" : "0.75rem",
      }}
    >
      {category}
    </span>
  );
};

export default function EmailPage() {
  const { userEmail } = useApp();
  const [emails, setEmails] = useState([]);
  const [availableLabels, setAvailableLabels] = useState([]);
  const [emailCount, setEmailCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [autoReply, setAutoReply] = useState(true);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState(null);

  useEffect(() => {
    if (!userEmail) return;

    getUserPreferences(userEmail)
      .then((data) => {
        const autoSend =
          data?.user?.autoSend ?? data?.user?.emailSettings?.autoSend;
        if (autoSend !== undefined) {
          setAutoReply(Boolean(autoSend));
        }
      })
      .catch(() => {});
  }, [userEmail]);

  const labeledCount = useMemo(
    () => emails.filter((e) => e.labeled).length,
    [emails],
  );

  const filteredEmails = useMemo(() => {
    if (activeFilter === "All") return emails;
    return emails.filter((e) => e.category === activeFilter);
  }, [emails, activeFilter]);

  const handleFetchEmails = async () => {
    if (!userEmail) return toast.error("Connect a mailbox in Settings first");
    setLoading(true);
    try {
      const data = await getEmails(userEmail);
      setEmails(data.emails || []);
      setAvailableLabels(data.availableLabels || []);
      setEmailCount(data.count ?? data.emails?.length ?? 0);
      setActiveFilter("All");
      setSelected(null);
      setReplyText("");
      if (!data.emails?.length) {
        toast("No emails found in inbox", { icon: "📭" });
      } else {
        const labeled = (data.emails || []).filter((e) => e.labeled).length;
        toast.success(
          `Fetched ${data.count ?? data.emails.length} emails · ${labeled} labeled`,
        );
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEmail = (email) => {
    setSelected(email);
    setReplyText("");
  };

  const handleGenerateReply = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const data = await generateReply(userEmail, selected.id);
      setReplyText(data.generatedReply || "");
      if (data.autoReply !== undefined) {
        setAutoReply(Boolean(data.autoReply));
      }
      toast.success("AI reply generated!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!selected || !replyText.trim()) return toast.error("Nothing to send");
    setSending(true);
    try {
      await createAndSendEmail(userEmail, selected.id, replyText, autoReply);
      toast.success(
        autoReply ? "Email sent successfully! ✅" : "Draft created ✅",
      );
      setReplyText("");
      setSelected(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dt) => {
    if (!dt) return "";
    const d = new Date(dt);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const formatPreview = (email) => {
    const text =
      email?.bodyText ||
      email?.body ||
      email?.bodyPreview ||
      (typeof email === "string" ? email : "");
    return String(text).replace(/\s+/g, " ").trim().slice(0, 160);
  };

  const getEmailBodyDisplay = (email) => {
    if (!email) return { contentType: "text", content: "" };

    if (email.bodyContentType === "html" && email.body) {
      return { contentType: "html", content: email.body };
    }

    return {
      contentType: "text",
      content: email.bodyText || email.body || email.bodyPreview || "",
    };
  };

  const formatFileSize = (bytes = 0) => {
    const size = Number(bytes) || 0;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownloadAttachment = async (attachment) => {
    if (!selected?.id || !userEmail || !attachment?.id) return;

    setDownloadingAttachmentId(attachment.id);
    try {
      await downloadEmailAttachment(
        userEmail,
        selected.id,
        attachment.id,
        attachment.name,
        attachment.mimeType,
      );
      toast.success(`Downloaded ${attachment.name}`);
    } catch (err) {
      toast.error(err.message || "Failed to download attachment");
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  const filterOptions = ["All", ...availableLabels];

  return (
    <>
      <Toaster position="top-right" />
      <PageHeader
        title="Inbox"
        subtitle="Email Agent — fetch inbox, auto-label with AI, generate replies and send"
        actions={
          <CButton
            className="btn btn-primary"
            size="sm"
            onClick={handleFetchEmails}
            disabled={loading || !userEmail}
          >
            {loading ? (
              <>
                <CSpinner size="sm" className="me-2 text-white" /> Fetching…
              </>
            ) : (
              "📥 Fetch Inbox"
            )}
          </CButton>
        }
      />

      {emails.length > 0 && (
        <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
          <div className="email-stat-pill">
            <span className="email-stat-value">{emailCount}</span>
            <span className="email-stat-label">Fetched</span>
          </div>
          <div className="email-stat-pill">
            <span className="email-stat-value">{labeledCount}</span>
            <span className="email-stat-label">Labeled</span>
          </div>
          <div className="email-stat-pill">
            <span className="email-stat-value">{availableLabels.length}</span>
            <span className="email-stat-label">Categories</span>
          </div>
        </div>
      )}

      <CRow className="g-3">
        <CCol md={5} lg={4}>
          <CCard
            style={{ height: 600, display: "flex", flexDirection: "column" }}
          >
            <CCardHeader>
              {/* <div className="d-flex align-items-center justify-content-between mb-2">
                <span>Inbox</span>
                {filteredEmails.length > 0 && (
                  <CBadge color="primary">{filteredEmails.length}</CBadge>
                )}
              </div> */}
              {/* {availableLabels.length > 0 && (
                <div className="email-filter-chips">
                  {filterOptions.map((label) => (
                    <button
                      key={label}
                      type="button"
                      className={`email-filter-chip ${activeFilter === label ? 'active' : ''}`}
                      onClick={() => setActiveFilter(label)}
                    >
                      {label === 'All' ? 'All' : <CategoryBadge category={label} />}
                    </button>
                  ))}
                </div>
              )} */}
            </CCardHeader>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {emails.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>📭</div>
                  <div style={{ fontSize: "0.85rem" }}>
                    Click &quot;Fetch Inbox&quot; to load emails
                  </div>
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <div style={{ fontSize: "0.85rem" }}>
                    No emails in this category
                  </div>
                </div>
              ) : (
                filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    className={`email-item ${selected?.id === email.id ? "selected" : ""}`}
                    onClick={() => handleSelectEmail(email)}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div className="email-from text-truncate">
                        {email.fromName || email.from}
                      </div>
                      <div className="email-time">
                        {formatDate(email.receivedDateTime)}
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2 mt-1 flex-wrap">
                      <div className="email-subject flex-grow-1 mb-0">
                        {email.subject}
                      </div>
                      <CategoryBadge category={email.category} />
                    </div>
                    <div className="email-preview">{formatPreview(email)}</div>
                    {email.hasAttachments && (
                      <div
                        className="text-muted mt-1"
                        style={{ fontSize: "0.72rem" }}
                      >
                        📎{" "}
                        {email.attachments?.length
                          ? `${email.attachments.length} attachment(s)`
                          : "Has attachments"}
                      </div>
                    )}
                    <div className="d-flex align-items-center gap-2 mt-1">
                      {/* {email.labeled ? (
                        <span className="email-label-status success">
                          ✓ Label
                        </span>
                      ) : (
                        <span className="email-label-status warning">
                          ⚠ Label pending
                        </span>
                      )} */}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CCard>
        </CCol>

        <CCol md={7} lg={8}>
          <CCard
            style={{ height: 600, display: "flex", flexDirection: "column" }}
          >
            {!selected ? (
              <CCardBody className="d-flex align-items-center justify-content-center text-muted">
                <div className="text-center">
                  <div style={{ fontSize: "3rem", marginBottom: 12 }}>✉️</div>
                  <div>
                    Select an email to view details and generate a reply
                  </div>
                </div>
              </CCardBody>
            ) : (
              <>
                <CCardHeader>
                  <div className="d-flex align-items-start justify-content-between gap-2 flex-wrap">
                    <div className="flex-grow-1">
                      <div className="fw-600" style={{ color: "#1a1f36" }}>
                        {selected.subject}
                      </div>
                      <div
                        className="text-muted mt-1"
                        style={{ fontSize: "0.8rem" }}
                      >
                        From:{" "}
                        <strong>{selected.fromName || selected.from}</strong>
                        {selected.from && selected.fromName && (
                          <> &lt;{selected.from}&gt;</>
                        )}
                        &nbsp;·&nbsp; {formatDate(selected.receivedDateTime)}
                      </div>
                    </div>
                    <CategoryBadge category={selected.category} size="md" />
                  </div>
                  <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
                    {selected.labeled ? (
                      <CBadge color="success" className="text-white">
                        Labeled in Outlook
                      </CBadge>
                    ) : (
                      <CBadge color="warning" className="text-dark">
                        Not labeled
                      </CBadge>
                    )}
                    {selected.previousCategories?.length > 0 && (
                      <span
                        className="text-muted"
                        style={{ fontSize: "0.75rem" }}
                      >
                        Previous: {selected.previousCategories.join(", ")}
                      </span>
                    )}
                  </div>
                  {selected.labelError && (
                    <CAlert
                      color="warning"
                      className="mt-2 mb-0 py-2"
                      style={{ fontSize: "0.8rem" }}
                    >
                      Label error: {selected.labelError}
                    </CAlert>
                  )}
                </CCardHeader>
                <CCardBody style={{ overflowY: "auto", flex: 1 }}>
                  {(() => {
                    const body = getEmailBodyDisplay(selected);
                    return body.contentType === "html" ? (
                      <div
                        className="mb-3 p-3 email-body-html"
                        style={{
                          background: "#fff",
                          borderRadius: 8,
                          border: "1px solid #e9ecef",
                          fontSize: "0.85rem",
                          color: "#1a1f36",
                          lineHeight: 1.6,
                          overflowX: "auto",
                        }}
                        dangerouslySetInnerHTML={{ __html: body.content }}
                      />
                    ) : (
                      <div
                        className="mb-3 p-3"
                        style={{
                          background: "#fafafa",
                          borderRadius: 8,
                          border: "1px solid #e9ecef",
                          fontSize: "0.85rem",
                          color: "#4a5568",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.5,
                        }}
                      >
                        {body.content}
                      </div>
                    );
                  })()}

                  {selected.attachments?.length > 0 && (
                    <div className="mb-3">
                      <div
                        className="text-muted mb-2"
                        style={{ fontSize: "0.78rem", fontWeight: 600 }}
                      >
                        Attachments ({selected.attachments.length})
                      </div>
                      <div className="d-flex flex-column gap-2">
                        {selected.attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="d-flex align-items-center justify-content-between gap-2 p-2"
                            style={{
                              border: "1px solid #e9ecef",
                              borderRadius: 8,
                              background: "#fafafa",
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div
                                className="fw-600 text-truncate"
                                style={{ fontSize: "0.84rem" }}
                                title={attachment.name}
                              >
                                📎 {attachment.name}
                              </div>
                              <div
                                className="text-muted"
                                style={{ fontSize: "0.74rem" }}
                              >
                                {formatFileSize(attachment.size)}
                                {attachment.isInline ? " · inline" : ""}
                              </div>
                            </div>
                            <CButton
                              size="sm"
                              color="light"
                              disabled={
                                downloadingAttachmentId === attachment.id
                              }
                              onClick={() =>
                                handleDownloadAttachment(attachment)
                              }
                            >
                              {downloadingAttachmentId === attachment.id ? (
                                <CSpinner size="sm" />
                              ) : (
                                "Download"
                              )}
                            </CButton>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="d-flex align-items-center gap-2 mb-3">
                    <CButton
                      className="btn-ai"
                      onClick={handleGenerateReply}
                      disabled={generating}
                    >
                      {generating ? (
                        <>
                          <CSpinner size="sm" className="me-2" /> Generating…
                        </>
                      ) : (
                        <>
                          <span className="me-1">🤖</span> Generate AI Reply
                        </>
                      )}
                    </CButton>
                    {replyText && (
                      <span className="badge-ai">AI Draft Ready</span>
                    )}
                  </div>

                  <div className="reply-box">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <label
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color: "#4a5568",
                        }}
                      >
                        Reply
                      </label>
                      <CFormCheck
                        type="checkbox"
                        label="Auto-send (skip draft step)"
                        checked={autoReply}
                        onChange={(e) => setAutoReply(e.target.checked)}
                        style={{ fontSize: "0.78rem" }}
                      />
                    </div>
                    <CFormTextarea
                      rows={7}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="AI reply will appear here. You can also type manually."
                      style={{ fontSize: "0.85rem", resize: "vertical" }}
                    />
                    <div className="d-flex justify-content-end mt-2 gap-2">
                      <CButton
                        color="light"
                        size="sm"
                        onClick={() => setReplyText("")}
                      >
                        Clear
                      </CButton>
                      <CButton
                        className="btn-ai"
                        size="sm"
                        onClick={handleSend}
                        disabled={sending || !replyText.trim()}
                      >
                        {sending ? (
                          <>
                            <CSpinner size="sm" className="me-1" /> Sending…
                          </>
                        ) : autoReply ? (
                          "🚀 Send Reply"
                        ) : (
                          "📝 Save as Draft"
                        )}
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
