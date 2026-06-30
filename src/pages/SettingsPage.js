import React, { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormCheck,
  CFormTextarea,
  CAlert,
  CNav,
  CNavItem,
  CNavLink,
  CBadge,
  CSpinner,
} from "@coreui/react";
import { useApp } from "../context/AppContext";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  getOnboardingStatus,
  getUserDetails,
  connectEmail,
  completeMailboxSetup,
  disconnectMailbox,
  saveProfile,
  updateMessaging,
  skipMessaging,
  updateMailboxSettings,
  setPrimaryMailbox,
} from "../services/userDetailsService";

const FALLBACK_STEPS = [
  { id: "email_connection", label: "Mailboxes", icon: "📧" },
  { id: "profile", label: "Profile", icon: "👤" },
  { id: "messaging", label: "Messaging", icon: "💬" },
  { id: "completed", label: "Done", icon: "✓" },
];

const parseList = (value) =>
  value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const formatList = (arr) => (Array.isArray(arr) ? arr.join(", ") : "");

const emptyProfile = {
  designation: "",
  company: "",
  department: "",
  industry: "",
  bio: "",
  writingStyle: "professional",
  preferredLanguage: "en",
  emailSignature: "",
  likes: "",
  dislikes: "",
  keywords: "",
  commonPhrases: "",
  avoidTopics: "",
};

const emptyMessaging = {
  telegram: false,
  whatsapp: false,
  preferredApprovalChannel: "telegram",
  telegramUsername: "",
  whatsappNumber: "",
  requireApprovalForEmailSend: true,
  requireApprovalForEmailDraft: false,
};

const emptyMailboxForm = {
  email: "",
  emailProvider: "outlook",
  mailboxEmail: "",
  displayName: "",
};

const SettingsPage = () => {
  const {
    user,
    authEmail,
    defaultMailboxEmail,
    connectedMailboxes: contextMailboxes,
    refreshUserDetails,
    applyOnboardingPayload,
  } = useApp();
  const userId = user?._id;

  const [activeTab, setActiveTab] = useState("email");
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(null);
  const [connectedMailboxes, setConnectedMailboxes] = useState([]);
  const [saving, setSaving] = useState(false);

  const [mailboxForm, setMailboxForm] = useState(emptyMailboxForm);
  const [profileForm, setProfileForm] = useState(emptyProfile);
  const [messagingForm, setMessagingForm] = useState(emptyMessaging);
  const [aiPrefs, setAiPrefs] = useState({
    writingStyle: "professional",
    autoSend: false,
    customTemplate: "",
  });
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [aiPrefsSaving, setAiPrefsSaving] = useState(false);

  const hydrateFromMailbox = useCallback((mailbox) => {
    if (!mailbox) return;

    setProfileForm({
      designation: mailbox.designation || "",
      company: mailbox.company || "",
      department: mailbox.department || "",
      industry: mailbox.industry || "",
      bio: mailbox.bio || "",
      writingStyle: mailbox.writingStyle || "professional",
      preferredLanguage: mailbox.preferredLanguage || "en",
      emailSignature: mailbox.emailSignature || "",
      likes: formatList(mailbox.likes),
      dislikes: formatList(mailbox.dislikes),
      keywords: formatList(mailbox.keywords),
      commonPhrases: formatList(mailbox.commonPhrases),
      avoidTopics: formatList(mailbox.avoidTopics),
    });

    setMessagingForm({
      telegram: mailbox.activeServices?.telegram ?? false,
      whatsapp: mailbox.activeServices?.whatsapp ?? false,
      preferredApprovalChannel: mailbox.preferredApprovalChannel || "telegram",
      telegramUsername: mailbox.serviceContacts?.telegramUsername || "",
      whatsappNumber: mailbox.serviceContacts?.whatsappNumber || "",
      requireApprovalForEmailSend:
        mailbox.approvalSettings?.requireApprovalForEmailSend ?? true,
      requireApprovalForEmailDraft:
        mailbox.approvalSettings?.requireApprovalForEmailDraft ?? false,
    });

    setAiPrefs({
      writingStyle: mailbox.writingStyle || "professional",
      autoSend: mailbox.emailSettings?.autoSend ?? false,
      customTemplate: mailbox.emailSettings?.customTemplate || "",
    });
  }, []);

  const loadPrimaryMailboxDetails = useCallback(
    async (mailboxEmail) => {
      if (!userId || !mailboxEmail) return;
      setDetailsLoading(true);
      try {
        const res = await getUserDetails(userId, mailboxEmail);
        hydrateFromMailbox(res.data || res.mailbox);
      } catch (err) {
        toast.error(err.message || "Failed to load mailbox settings");
      } finally {
        setDetailsLoading(false);
      }
    },
    [userId, hydrateFromMailbox],
  );

  const applyResponse = useCallback(
    (res) => {
      setOnboarding(res.onboarding || null);
      setConnectedMailboxes(res.mailboxes || []);
      applyOnboardingPayload(res);
    },
    [applyOnboardingPayload],
  );

  const loadSettings = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await getOnboardingStatus(userId);
      applyResponse(res);
    } catch (err) {
      toast.error(err.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [userId, applyResponse]);

  useEffect(() => {
    const email = user?.email || "";
    setMailboxForm({
      email,
      emailProvider: "outlook",
      mailboxEmail: email,
      displayName: user?.username || "",
    });
    setProfileForm(emptyProfile);
    setMessagingForm(emptyMessaging);
    setOnboarding(null);
    setConnectedMailboxes([]);
    setAiPrefs({
      writingStyle: "professional",
      autoSend: false,
      customTemplate: "",
    });
  }, [userId, user?.email, user?.username]);

  useEffect(() => {
    if (contextMailboxes.length) {
      setConnectedMailboxes(contextMailboxes);
    }
  }, [contextMailboxes]);

  useEffect(() => {
    if (!defaultMailboxEmail) return;
    loadPrimaryMailboxDetails(defaultMailboxEmail);
  }, [defaultMailboxEmail, loadPrimaryMailboxDetails]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const steps = onboarding?.steps?.length
    ? onboarding.steps.map((s) => ({
        key: s.id,
        label: s.label,
        status: s.status,
        description: s.description,
      }))
    : FALLBACK_STEPS.map((s) => ({ ...s, status: "pending" }));

  const handleAddMailbox = async () => {
    if (!mailboxForm.email.trim()) {
      toast.error("Email address is required");
      return;
    }
    setSaving(true);
    try {
      const res = await connectEmail({
        userId,
        email: mailboxForm.email.trim(),
        emailProvider: mailboxForm.emailProvider,
        mailboxEmail: (mailboxForm.mailboxEmail || mailboxForm.email).trim(),
        displayName: mailboxForm.displayName.trim() || undefined,
      });
      applyResponse(res);
      await refreshUserDetails(userId);
      toast.success(res.message || "Mailbox connected");
      setMailboxForm((f) => ({
        ...f,
        email: "",
        mailboxEmail: "",
        displayName: "",
      }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteMailboxSetup = async () => {
    setSaving(true);
    try {
      const res = await completeMailboxSetup(userId);
      applyResponse(res);
      await refreshUserDetails(userId);
      toast.success(res.message || "Mailbox setup complete");
      setActiveTab("profile");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectMailbox = async (mailboxEmail) => {
    if (!window.confirm(`Disconnect ${mailboxEmail}?`)) return;
    setSaving(true);
    try {
      const res = await disconnectMailbox({ userId, mailboxEmail });
      applyResponse(res);
      await refreshUserDetails(userId);
      toast.success(res.message || "Mailbox disconnected");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimaryMailbox = async (mailboxEmail) => {
    setSaving(true);
    try {
      const res = await setPrimaryMailbox({ userId, mailboxEmail });
      applyResponse(res);
      await refreshUserDetails(userId, false);
      await loadPrimaryMailboxDetails(mailboxEmail);
      toast.success(res.message || "Primary mailbox updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!defaultMailboxEmail) {
      toast.error("Set a primary mailbox first");
      return;
    }
    setSaving(true);
    try {
      const res = await saveProfile({
        userId,
        mailboxEmail: defaultMailboxEmail,
        designation: profileForm.designation,
        company: profileForm.company,
        department: profileForm.department,
        industry: profileForm.industry,
        bio: profileForm.bio,
        writingStyle: profileForm.writingStyle,
        preferredLanguage: profileForm.preferredLanguage,
        emailSignature: profileForm.emailSignature,
        likes: parseList(profileForm.likes),
        dislikes: parseList(profileForm.dislikes),
        keywords: parseList(profileForm.keywords),
        commonPhrases: parseList(profileForm.commonPhrases),
        avoidTopics: parseList(profileForm.avoidTopics),
      });
      applyResponse(res);
      await refreshUserDetails(userId);
      await loadPrimaryMailboxDetails(defaultMailboxEmail);
      toast.success(res.message || "Profile saved");
      setActiveTab("messaging");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMessaging = async () => {
    if (!defaultMailboxEmail) {
      toast.error("Set a primary mailbox first");
      return;
    }
    setSaving(true);
    try {
      const res = await updateMessaging({
        userId,
        mailboxEmail: defaultMailboxEmail,
        activeServices: {
          telegram: messagingForm.telegram,
          whatsapp: messagingForm.whatsapp,
        },
        preferredApprovalChannel: messagingForm.preferredApprovalChannel,
        serviceContacts: {
          telegramUsername: messagingForm.telegramUsername || null,
          whatsappNumber: messagingForm.whatsappNumber || null,
        },
        approvalSettings: {
          requireApprovalForEmailSend:
            messagingForm.requireApprovalForEmailSend,
          requireApprovalForEmailDraft:
            messagingForm.requireApprovalForEmailDraft,
        },
      });
      applyResponse(res);
      await refreshUserDetails(userId);
      await loadPrimaryMailboxDetails(defaultMailboxEmail);
      toast.success(res.message || "Messaging settings saved");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSkipMessaging = async () => {
    setSaving(true);
    try {
      const res = await skipMessaging(userId);
      applyResponse(res);
      await refreshUserDetails(userId);
      toast.success(res.message || "Messaging skipped");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAiPrefs = async () => {
    if (!defaultMailboxEmail) {
      toast.error("Set a primary mailbox first");
      return;
    }
    setAiPrefsSaving(true);
    try {
      await updateMailboxSettings({
        userId,
        mailboxEmail: defaultMailboxEmail,
        writingStyle: aiPrefs.writingStyle,
        emailSettings: {
          autoSend: aiPrefs.autoSend,
          customTemplate: aiPrefs.customTemplate,
        },
      });
      await refreshUserDetails(userId);
      await loadPrimaryMailboxDetails(defaultMailboxEmail);
      toast.success("AI preferences saved for primary mailbox");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAiPrefsSaving(false);
    }
  };

  if (!userId) {
    return (
      <CAlert color="warning">Please sign in to manage your settings.</CAlert>
    );
  }

  return (
    <>
      <Toaster position="top-right" />

      <div className="mb-4">
        <h4 className="fw-700 mb-1 text-dark">Settings</h4>
        <p className="text-muted mb-0" style={{ fontSize: "0.88rem" }}>
          Connect mailboxes, complete onboarding, and configure AI preferences
        </p>
      </div>

      <CCard className="mb-4">
        <CCardBody className="d-flex flex-wrap align-items-center gap-3 py-3">
          <div
            className="d-flex align-items-center justify-content-center text-white fw-bold"
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #321fdb, #5b5ea6)",
              fontSize: "1.1rem",
            }}
          >
            {(user.username || user.email)?.[0]?.toUpperCase()}
          </div>
          <div className="flex-grow-1">
            <div className="fw-600" style={{ color: "#1a1f36" }}>
              {user.username}
            </div>
            <div className="text-muted" style={{ fontSize: "0.84rem" }}>
              {authEmail}
            </div>
          </div>
          <CBadge color="info" className="text-capitalize">
            {user.role}
          </CBadge>
          {onboarding?.connectedMailboxCount > 0 && (
            <CBadge color="primary">
              {onboarding.connectedMailboxCount} mailbox(es)
            </CBadge>
          )}
          {defaultMailboxEmail && (
            <CBadge color="secondary">Primary: {defaultMailboxEmail}</CBadge>
          )}
          {onboarding?.isOnboardingComplete && (
            <CBadge color="success">Setup complete</CBadge>
          )}
        </CCardBody>
      </CCard>

      <div className="settings-stepper mb-4">
        {steps.map((step) => {
          const isDone =
            step.status === "completed" || onboarding?.isOnboardingComplete;
          const isActive =
            step.status === "current" && !onboarding?.isOnboardingComplete;
          const fallback = FALLBACK_STEPS.find(
            (s) => s.key === step.key || s.id === step.key,
          );
          return (
            <div
              key={step.key || step.id}
              className={`settings-step ${isDone ? "done" : ""} ${isActive ? "active" : ""}`}
              title={step.description}
            >
              <div className="settings-step-icon">
                {isDone ? "✓" : fallback?.icon || "•"}
              </div>
              <div className="settings-step-label">{step.label}</div>
            </div>
          );
        })}
      </div>

      <CNav variant="tabs" className="mb-4 settings-tabs">
        {[
          { key: "email", label: "Mailboxes" },
          { key: "profile", label: "Profile" },
          { key: "messaging", label: "Messaging & Approvals" },
          { key: "ai", label: "AI Preferences" },
        ].map((tab) => (
          <CNavItem key={tab.key}>
            <CNavLink
              active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{ cursor: "pointer" }}
            >
              {tab.label}
            </CNavLink>
          </CNavItem>
        ))}
      </CNav>

      {loading ? (
        <div className="text-center py-5">
          <LoadingSpinner />
        </div>
      ) : (
        <CRow className="g-4">
          {activeTab === "email" && (
            <>
              <CCol lg={5}>
                <CCard>
                  <CCardHeader>
                    <strong>📬 Connected Mailboxes</strong>
                  </CCardHeader>
                  <CCardBody>
                    {connectedMailboxes.length === 0 ? (
                      <p
                        className="text-muted mb-0"
                        style={{ fontSize: "0.84rem" }}
                      >
                        No mailboxes connected yet. Add your first Gmail or
                        Outlook account.
                      </p>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {connectedMailboxes.map((mb) => {
                          const isPrimaryMailbox = Boolean(mb.isDefaultMailbox);
                          return (
                            <div
                              key={mb.id || mb.mailboxEmail}
                              className={`mailbox-list-item${isPrimaryMailbox ? " mailbox-list-item--primary" : ""}`}
                            >
                              <div className="d-flex align-items-start justify-content-between gap-2">
                                <div>
                                  <div className="d-flex align-items-center gap-2 flex-wrap">
                                    <div
                                      className="fw-600"
                                      style={{ fontSize: "0.88rem" }}
                                    >
                                      {mb.displayName || mb.mailboxEmail}
                                    </div>
                                    {isPrimaryMailbox && (
                                      <CBadge
                                        color="primary"
                                        style={{ fontSize: "0.68rem" }}
                                      >
                                        Primary
                                      </CBadge>
                                    )}
                                  </div>
                                  <div
                                    className="text-muted"
                                    style={{ fontSize: "0.78rem" }}
                                  >
                                    {mb.mailboxEmail}
                                  </div>
                                  <div
                                    className="text-muted text-capitalize"
                                    style={{ fontSize: "0.72rem" }}
                                  >
                                    {mb.emailProvider}
                                  </div>
                                </div>
                                <div className="d-flex flex-column gap-1 align-items-end">
                                  {!isPrimaryMailbox && (
                                    <CButton
                                      color="primary"
                                      variant="outline"
                                      size="sm"
                                      disabled={saving}
                                      onClick={() =>
                                        handleSetPrimaryMailbox(mb.mailboxEmail)
                                      }
                                    >
                                      {saving ? (
                                        <CSpinner size="sm" />
                                      ) : (
                                        "Set as primary"
                                      )}
                                    </CButton>
                                  )}
                                  <CButton
                                    color="danger"
                                    variant="outline"
                                    size="sm"
                                    disabled={saving}
                                    onClick={() =>
                                      handleDisconnectMailbox(mb.mailboxEmail)
                                    }
                                  >
                                    Remove
                                  </CButton>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {onboarding?.canCompleteMailboxSetup && (
                      <CAlert
                        color="info"
                        className="mt-3 mb-0 py-2"
                        style={{ fontSize: "0.84rem" }}
                      >
                        You have {onboarding.connectedMailboxCount} mailbox(es)
                        connected. Complete setup to continue to your profile.
                      </CAlert>
                    )}

                    {onboarding?.canCompleteMailboxSetup && (
                      <CButton
                        color="success"
                        className="mt-3"
                        onClick={handleCompleteMailboxSetup}
                        disabled={saving}
                      >
                        {saving ? (
                          <CSpinner size="sm" />
                        ) : (
                          "Complete Mailbox Setup → Profile"
                        )}
                      </CButton>
                    )}

                    {onboarding?.mailboxesSetupCompleted && (
                      <CAlert
                        color="success"
                        className="mt-3 mb-0 py-2"
                        style={{ fontSize: "0.84rem" }}
                      >
                        Mailbox setup complete
                      </CAlert>
                    )}
                  </CCardBody>
                </CCard>
              </CCol>

              <CCol lg={7}>
                <CCard>
                  <CCardHeader>
                    <strong>➕ Add Mailbox</strong>
                  </CCardHeader>
                  <CCardBody>
                    <p
                      className="text-muted mb-4"
                      style={{ fontSize: "0.84rem" }}
                    >
                      Choose any mailbox as <strong>primary</strong>. Profile,
                      Messaging, and AI Preferences load from and save to that
                      mailbox. It is also the default for Email, Calendar, and
                      History after sign-in.
                    </p>

                    <div className="mb-3">
                      <CFormLabel className="fw-semibold">
                        Display Name
                      </CFormLabel>
                      <CFormInput
                        value={mailboxForm.displayName}
                        onChange={(e) =>
                          setMailboxForm((f) => ({
                            ...f,
                            displayName: e.target.value,
                          }))
                        }
                        placeholder="Work Outlook"
                      />
                    </div>

                    <div className="mb-3">
                      <CFormLabel className="fw-semibold">Provider</CFormLabel>
                      <CFormSelect
                        value={mailboxForm.emailProvider}
                        onChange={(e) =>
                          setMailboxForm((f) => ({
                            ...f,
                            emailProvider: e.target.value,
                          }))
                        }
                      >
                        <option value="outlook">Outlook / Microsoft 365</option>
                        <option value="gmail">Gmail</option>
                      </CFormSelect>
                    </div>

                    <div className="mb-3">
                      <CFormLabel className="fw-semibold">
                        Account Email <span className="text-danger">*</span>
                      </CFormLabel>
                      <CFormInput
                        type="email"
                        value={mailboxForm.email}
                        onChange={(e) =>
                          setMailboxForm((f) => ({
                            ...f,
                            email: e.target.value,
                          }))
                        }
                        placeholder="you@company.com"
                      />
                    </div>

                    <div className="mb-4">
                      <CFormLabel className="fw-semibold">
                        Mailbox Email (optional)
                      </CFormLabel>
                      <CFormInput
                        type="email"
                        value={mailboxForm.mailboxEmail}
                        onChange={(e) =>
                          setMailboxForm((f) => ({
                            ...f,
                            mailboxEmail: e.target.value,
                          }))
                        }
                        placeholder="Same as account email if left blank"
                      />
                    </div>

                    <CButton
                      color="primary"
                      onClick={handleAddMailbox}
                      disabled={saving}
                    >
                      {saving ? <CSpinner size="sm" /> : "Add Mailbox"}
                    </CButton>
                  </CCardBody>
                </CCard>
              </CCol>
            </>
          )}

          {activeTab === "profile" && (
            <CCol lg={10}>
              <CCard>
                <CCardHeader>
                  <strong>👤 User Profile</strong>
                </CCardHeader>
                <CCardBody>
                  {!onboarding?.mailboxesSetupCompleted && (
                    <CAlert color="warning" className="mb-3">
                      Complete mailbox setup before saving your profile.
                    </CAlert>
                  )}

                  {defaultMailboxEmail ? (
                    <CAlert color="info" className="mb-3 py-2" style={{ fontSize: "0.84rem" }}>
                      Profile settings for primary mailbox{" "}
                      <strong>{defaultMailboxEmail}</strong>. Change primary on the Mailboxes tab.
                    </CAlert>
                  ) : (
                    <CAlert color="warning" className="mb-3">
                      Connect a mailbox and set it as primary to configure profile settings.
                    </CAlert>
                  )}

                  {detailsLoading ? (
                    <div className="text-center py-4">
                      <LoadingSpinner />
                    </div>
                  ) : (
                  <CRow className="g-3">
                    <CCol md={6}>
                      <CFormLabel className="fw-semibold">
                        Designation
                      </CFormLabel>
                      <CFormInput
                        value={profileForm.designation}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            designation: e.target.value,
                          }))
                        }
                        placeholder="e.g. Product Manager"
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel className="fw-semibold">Company</CFormLabel>
                      <CFormInput
                        value={profileForm.company}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            company: e.target.value,
                          }))
                        }
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel className="fw-semibold">
                        Department
                      </CFormLabel>
                      <CFormInput
                        value={profileForm.department}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            department: e.target.value,
                          }))
                        }
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel className="fw-semibold">Industry</CFormLabel>
                      <CFormInput
                        value={profileForm.industry}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            industry: e.target.value,
                          }))
                        }
                      />
                    </CCol>
                    <CCol md={12}>
                      <CFormLabel className="fw-semibold">Bio</CFormLabel>
                      <CFormTextarea
                        rows={3}
                        value={profileForm.bio}
                        onChange={(e) =>
                          setProfileForm((f) => ({ ...f, bio: e.target.value }))
                        }
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel className="fw-semibold">
                        Writing Style
                      </CFormLabel>
                      <CFormSelect
                        value={profileForm.writingStyle}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            writingStyle: e.target.value,
                          }))
                        }
                      >
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="formal">Formal</option>
                        <option value="casual">Casual</option>
                        <option value="concise">Concise</option>
                      </CFormSelect>
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel className="fw-semibold">
                        Preferred Language
                      </CFormLabel>
                      <CFormInput
                        value={profileForm.preferredLanguage}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            preferredLanguage: e.target.value,
                          }))
                        }
                      />
                    </CCol>
                    <CCol md={12}>
                      <CFormLabel className="fw-semibold">
                        Email Signature
                      </CFormLabel>
                      <CFormTextarea
                        rows={2}
                        value={profileForm.emailSignature}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            emailSignature: e.target.value,
                          }))
                        }
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel className="fw-semibold">
                        Likes (comma-separated)
                      </CFormLabel>
                      <CFormInput
                        value={profileForm.likes}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            likes: e.target.value,
                          }))
                        }
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel className="fw-semibold">
                        Dislikes (comma-separated)
                      </CFormLabel>
                      <CFormInput
                        value={profileForm.dislikes}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            dislikes: e.target.value,
                          }))
                        }
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel className="fw-semibold">
                        Keywords (comma-separated)
                      </CFormLabel>
                      <CFormInput
                        value={profileForm.keywords}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            keywords: e.target.value,
                          }))
                        }
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel className="fw-semibold">
                        Common Phrases (comma-separated)
                      </CFormLabel>
                      <CFormInput
                        value={profileForm.commonPhrases}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            commonPhrases: e.target.value,
                          }))
                        }
                      />
                    </CCol>
                    <CCol md={12}>
                      <CFormLabel className="fw-semibold">
                        Topics to Avoid (comma-separated)
                      </CFormLabel>
                      <CFormInput
                        value={profileForm.avoidTopics}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            avoidTopics: e.target.value,
                          }))
                        }
                      />
                    </CCol>
                  </CRow>
                  )}

                  <div className="mt-4">
                    <CButton
                      color="primary"
                      onClick={handleSaveProfile}
                      disabled={
                        saving ||
                        detailsLoading ||
                        !onboarding?.mailboxesSetupCompleted ||
                        !defaultMailboxEmail
                      }
                    >
                      {saving ? <CSpinner size="sm" /> : "Save Profile"}
                    </CButton>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
          )}

          {activeTab === "messaging" && (
            <CCol lg={8}>
              <CCard>
                <CCardHeader>
                  <strong>💬 Messaging & Approval Channels</strong>
                </CCardHeader>
                <CCardBody>
                  {!onboarding?.profileComplete && (
                    <CAlert color="warning" className="mb-3">
                      Complete your profile before configuring messaging.
                    </CAlert>
                  )}

                  {defaultMailboxEmail ? (
                    <CAlert color="info" className="mb-3 py-2" style={{ fontSize: "0.84rem" }}>
                      Messaging settings for primary mailbox{" "}
                      <strong>{defaultMailboxEmail}</strong>.
                    </CAlert>
                  ) : (
                    <CAlert color="warning" className="mb-3">
                      Set a primary mailbox to configure messaging.
                    </CAlert>
                  )}

                  {detailsLoading ? (
                    <div className="text-center py-4">
                      <LoadingSpinner />
                    </div>
                  ) : (
                  <>
                  <div className="mb-3">
                    <CFormCheck
                      id="telegram"
                      label="Enable Telegram notifications"
                      checked={messagingForm.telegram}
                      onChange={(e) =>
                        setMessagingForm((f) => ({
                          ...f,
                          telegram: e.target.checked,
                        }))
                      }
                    />
                  </div>
                  {messagingForm.telegram && (
                    <div className="mb-3 ms-4">
                      <CFormLabel className="fw-semibold">
                        Telegram Username
                      </CFormLabel>
                      <CFormInput
                        value={messagingForm.telegramUsername}
                        onChange={(e) =>
                          setMessagingForm((f) => ({
                            ...f,
                            telegramUsername: e.target.value,
                          }))
                        }
                        placeholder="@username"
                      />
                    </div>
                  )}

                  <div className="mb-3">
                    <CFormCheck
                      id="whatsapp"
                      label="Enable WhatsApp notifications"
                      checked={messagingForm.whatsapp}
                      onChange={(e) =>
                        setMessagingForm((f) => ({
                          ...f,
                          whatsapp: e.target.checked,
                        }))
                      }
                    />
                  </div>
                  {messagingForm.whatsapp && (
                    <div className="mb-3 ms-4">
                      <CFormLabel className="fw-semibold">
                        WhatsApp Number
                      </CFormLabel>
                      <CFormInput
                        value={messagingForm.whatsappNumber}
                        onChange={(e) =>
                          setMessagingForm((f) => ({
                            ...f,
                            whatsappNumber: e.target.value,
                          }))
                        }
                        placeholder="+1234567890"
                      />
                    </div>
                  )}

                  <div className="mb-3">
                    <CFormLabel className="fw-semibold">
                      Preferred Approval Channel
                    </CFormLabel>
                    <CFormSelect
                      value={messagingForm.preferredApprovalChannel}
                      onChange={(e) =>
                        setMessagingForm((f) => ({
                          ...f,
                          preferredApprovalChannel: e.target.value,
                        }))
                      }
                    >
                      <option value="telegram">Telegram</option>
                      <option value="whatsapp">WhatsApp</option>
                    </CFormSelect>
                  </div>

                  <hr className="my-4" />

                  <div className="mb-3">
                    <CFormCheck
                      id="requireSend"
                      label="Require approval before sending emails"
                      checked={messagingForm.requireApprovalForEmailSend}
                      onChange={(e) =>
                        setMessagingForm((f) => ({
                          ...f,
                          requireApprovalForEmailSend: e.target.checked,
                        }))
                      }
                    />
                  </div>
                  <div className="mb-4">
                    <CFormCheck
                      id="requireDraft"
                      label="Require approval for email drafts"
                      checked={messagingForm.requireApprovalForEmailDraft}
                      onChange={(e) =>
                        setMessagingForm((f) => ({
                          ...f,
                          requireApprovalForEmailDraft: e.target.checked,
                        }))
                      }
                    />
                  </div>

                  <div className="d-flex gap-2 flex-wrap">
                    <CButton
                      color="primary"
                      onClick={handleSaveMessaging}
                      disabled={
                        saving ||
                        detailsLoading ||
                        !onboarding?.profileComplete ||
                        !defaultMailboxEmail
                      }
                    >
                      {saving ? (
                        <CSpinner size="sm" />
                      ) : (
                        "Save Messaging Settings"
                      )}
                    </CButton>
                    <CButton
                      color="secondary"
                      variant="outline"
                      onClick={handleSkipMessaging}
                      disabled={
                        saving ||
                        detailsLoading ||
                        !onboarding?.profileComplete ||
                        !defaultMailboxEmail
                      }
                    >
                      Skip for Now
                    </CButton>
                  </div>
                  </>
                  )}
                </CCardBody>
              </CCard>
            </CCol>
          )}

          {activeTab === "ai" && (
            <CCol lg={8}>
              <CCard>
                <CCardHeader>
                  <strong>🤖 AI Reply Preferences</strong>
                </CCardHeader>
                <CCardBody>
                  {defaultMailboxEmail ? (
                    <CAlert color="info" className="mb-3 py-2" style={{ fontSize: "0.84rem" }}>
                      AI preferences for primary mailbox{" "}
                      <strong>{defaultMailboxEmail}</strong>.
                    </CAlert>
                  ) : (
                    <CAlert color="warning" className="mb-3">
                      Set a primary mailbox to configure AI preferences.
                    </CAlert>
                  )}

                  {!connectedMailboxes.length && (
                    <CAlert color="warning" className="mb-3">
                      Connect at least one mailbox first.
                    </CAlert>
                  )}

                  {detailsLoading ? (
                    <div className="text-center py-4">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    <>
                      <div className="mb-3">
                        <CFormLabel className="fw-semibold">
                          Writing Style / Reply Tone
                        </CFormLabel>
                        <CFormSelect
                          value={aiPrefs.writingStyle}
                          onChange={(e) =>
                            setAiPrefs((p) => ({
                              ...p,
                              writingStyle: e.target.value,
                            }))
                          }
                        >
                          <option value="professional">Professional</option>
                          <option value="friendly">Friendly</option>
                          <option value="formal">Formal</option>
                          <option value="casual">Casual</option>
                          <option value="concise">Concise</option>
                        </CFormSelect>
                      </div>

                      <div className="mb-3">
                        <CFormCheck
                          id="autoSend"
                          label="Auto-send emails after AI generates a reply"
                          checked={aiPrefs.autoSend}
                          onChange={(e) =>
                            setAiPrefs((p) => ({
                              ...p,
                              autoSend: e.target.checked,
                            }))
                          }
                        />
                      </div>

                      <div className="mb-4">
                        <CFormLabel className="fw-semibold">
                          Custom Reply Template (optional)
                        </CFormLabel>
                        <CFormTextarea
                          rows={4}
                          value={aiPrefs.customTemplate}
                          onChange={(e) =>
                            setAiPrefs((p) => ({
                              ...p,
                              customTemplate: e.target.value,
                            }))
                          }
                          placeholder="Add custom instructions for every AI reply..."
                        />
                      </div>

                      <CButton
                        color="primary"
                        onClick={handleSaveAiPrefs}
                        disabled={
                          aiPrefsSaving || detailsLoading || !defaultMailboxEmail
                        }
                      >
                        {aiPrefsSaving ? (
                          <CSpinner size="sm" />
                        ) : (
                          "Save AI Preferences"
                        )}
                      </CButton>
                    </>
                  )}
                </CCardBody>
              </CCard>
            </CCol>
          )}
        </CRow>
      )}
    </>
  );
};

export default SettingsPage;
