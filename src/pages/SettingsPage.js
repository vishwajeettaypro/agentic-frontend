import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import CIcon from "@coreui/icons-react";
import {
  cilAppsSettings,
  cilAt,
  cilBolt,
  cilCheckCircle,
  cilEnvelopeClosed,
  cilInbox,
  cilSend,
  cilSettings,
  cilSpeech,
  cilUser,
} from "@coreui/icons";
import { useApp } from "../context/AppContext";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  getOnboardingStatus,
  getUserDetails,
  connectEmail,
  completeMailboxSetup,
  disconnectMailbox,
  saveProfile,
  enrichProfileFromCompany,
  updateMessaging,
  skipMessaging,
  updateMailboxSettings,
  setPrimaryMailbox,
} from "../services/userDetailsService";
import { getGoogleConnectUrl } from "../services/authService";
import {
  getMessagingStatus,
  generateTelegramLinkCode,
  unlinkTelegram,
  testTelegramMessage,
  testWhatsAppMessage,
} from "../services/messagingService";

const FALLBACK_STEPS = [
  { id: "email_connection", label: "Mailboxes", icon: cilEnvelopeClosed },
  { id: "profile", label: "Profile", icon: cilUser },
  { id: "messaging", label: "Messaging", icon: cilSpeech },
  { id: "completed", label: "Done", icon: cilCheckCircle },
];

const SETTINGS_TABS = [
  {
    key: "email",
    label: "Mailboxes",
    description: "Connected accounts",
    icon: cilInbox,
  },
  {
    key: "profile",
    label: "Profile",
    description: "Identity and tone",
    icon: cilUser,
  },
  {
    key: "messaging",
    label: "Approvals",
    description: "Telegram and WhatsApp",
    icon: cilSend,
  },
  {
    key: "ai",
    label: "AI Preferences",
    description: "Reply behavior",
    icon: cilBolt,
  },
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
  companyWebsite: "",
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
  const [gmailConnecting, setGmailConnecting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

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
  const [enrichingProfile, setEnrichingProfile] = useState(false);
  const [messagingStatus, setMessagingStatus] = useState(null);
  const [telegramLinkCode, setTelegramLinkCode] = useState("");
  const [messagingActionLoading, setMessagingActionLoading] = useState(false);

  const profileCompanyFieldsReady = [
    profileForm.designation,
    profileForm.company,
    profileForm.department,
    profileForm.industry,
  ].every((value) => String(value || "").trim());

  const applyMessagingProfile = useCallback((messaging = {}) => {
    if (!messaging || !Object.keys(messaging).length) return;

    setMessagingForm({
      telegram: messaging.activeServices?.telegram ?? false,
      whatsapp: messaging.activeServices?.whatsapp ?? false,
      preferredApprovalChannel: messaging.preferredApprovalChannel || "telegram",
      telegramUsername: messaging.serviceContacts?.telegramUsername || "",
      whatsappNumber: messaging.serviceContacts?.whatsappNumber || "",
      requireApprovalForEmailSend:
        messaging.approvalSettings?.requireApprovalForEmailSend ?? true,
      requireApprovalForEmailDraft:
        messaging.approvalSettings?.requireApprovalForEmailDraft ?? false,
    });
    setTelegramLinkCode(messaging.telegramLinkCode || "");
  }, []);

  const hydrateFromMailbox = useCallback((mailbox, messaging) => {
    if (!mailbox) return;

    setProfileForm({
      designation: mailbox.designation || "",
      company: mailbox.company || "",
      department: mailbox.department || "",
      industry: mailbox.industry || "",
      companyWebsite:
        mailbox.companyWebsite ||
        (mailbox.mailboxEmail?.includes("@")
          ? `https://${mailbox.mailboxEmail.split("@")[1]}`
          : ""),
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

    applyMessagingProfile(messaging);

    setAiPrefs({
      writingStyle: mailbox.writingStyle || "professional",
      autoSend: mailbox.emailSettings?.autoSend ?? false,
      customTemplate: mailbox.emailSettings?.customTemplate || "",
    });
  }, [applyMessagingProfile]);

  const loadMessagingStatus = useCallback(async () => {
    if (!userId) return;
    setMessagingActionLoading(true);
    try {
      const res = await getMessagingStatus(userId);
      setMessagingStatus(res.data || null);
      if (res.data?.messaging) {
        applyMessagingProfile(res.data.messaging);
      }
      if (res.data?.telegram?.pendingLinkCode) {
        setTelegramLinkCode(res.data.telegram.pendingLinkCode);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load messaging status");
    } finally {
      setMessagingActionLoading(false);
    }
  }, [userId, applyMessagingProfile]);

  const loadPrimaryMailboxDetails = useCallback(
    async (mailboxEmail) => {
      if (!userId || !mailboxEmail) return;
      setDetailsLoading(true);
      try {
        const res = await getUserDetails(userId, mailboxEmail);
        hydrateFromMailbox(res.data || res.mailbox, res.messaging);
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
    if (activeTab === "messaging" && userId) {
      loadMessagingStatus();
    }
  }, [activeTab, userId, loadMessagingStatus]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const gmailConnected = searchParams.get("gmailConnected");
    const mailbox = searchParams.get("mailbox");
    const gmailError = searchParams.get("gmailError");
    const tab = searchParams.get("tab");

    if (tab === "email") {
      setActiveTab("email");
    }

    if (gmailConnected === "1") {
      toast.success(
        mailbox ? `Gmail connected: ${mailbox}` : "Gmail mailbox connected",
      );
      if (userId) {
        refreshUserDetails(userId);
        loadSettings();
      }
      searchParams.delete("gmailConnected");
      searchParams.delete("mailbox");
      searchParams.delete("tab");
      setSearchParams(searchParams, { replace: true });
    } else if (gmailError) {
      toast.error(decodeURIComponent(gmailError));
      searchParams.delete("gmailError");
      searchParams.delete("tab");
      setSearchParams(searchParams, { replace: true });
    }
  }, [
    searchParams,
    setSearchParams,
    userId,
    refreshUserDetails,
    loadSettings,
  ]);

  const steps = onboarding?.steps?.length
    ? onboarding.steps.map((s) => ({
        key: s.id,
        label: s.label,
        status: s.status,
        description: s.description,
      }))
    : FALLBACK_STEPS.map((s) => ({ ...s, status: "pending" }));

  const handleAddMailbox = async () => {
    if (mailboxForm.emailProvider === "gmail") {
      return handleConnectGmail();
    }

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

  const handleConnectGmail = async () => {
    setGmailConnecting(true);
    try {
      const res = await getGoogleConnectUrl(mailboxForm.displayName.trim());
      window.location.href = res.url;
    } catch (err) {
      toast.error(err.message || "Failed to start Google sign-in");
      setGmailConnecting(false);
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

  const handleEnrichFromCompany = async () => {
    if (!userId || !defaultMailboxEmail) {
      toast.error("Set a primary mailbox first");
      return;
    }
    if (!profileCompanyFieldsReady) {
      toast.error("Fill designation, company, department, and industry first");
      return;
    }

    setEnrichingProfile(true);
    try {
      const res = await enrichProfileFromCompany({
        userId,
        mailboxEmail: defaultMailboxEmail,
        designation: profileForm.designation,
        company: profileForm.company,
        department: profileForm.department,
        industry: profileForm.industry,
        companyWebsite: profileForm.companyWebsite,
        bio: profileForm.bio,
        keywords: parseList(profileForm.keywords),
      });

      setProfileForm((form) => ({
        ...form,
        bio: res.bio || form.bio,
        keywords: formatList(res.keywords || parseList(form.keywords)),
      }));

      toast.success(
        res.generationSource === "azure"
          ? "Bio and keywords generated with Azure OpenAI"
          : res.quotaExceeded
            ? "Bio and keywords filled from website (AI quota limit reached)"
            : res.websiteFound
              ? `Bio and keywords updated from ${res.websiteUsed || "company website"}`
              : res.message || "Bio and keywords generated from company profile",
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEnrichingProfile(false);
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
        companyWebsite: profileForm.companyWebsite,
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

      if (res.companyEnrichment?.enriched) {
        setProfileForm((form) => ({
          ...form,
          bio: res.data?.bio || res.companyEnrichment.bio || form.bio,
          keywords: formatList(
            res.data?.keywords || res.companyEnrichment.keywords || [],
          ),
        }));
      }

      toast.success(res.message || "Profile saved");
      setActiveTab("messaging");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateTelegramCode = async () => {
    if (!userId) return;
    setMessagingActionLoading(true);
    try {
      const res = await generateTelegramLinkCode(userId);
      setTelegramLinkCode(res.linkCode || "");
      setMessagingStatus(res.data || messagingStatus);
      toast.success(res.message || "Link code generated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMessagingActionLoading(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    if (!userId) return;
    if (!window.confirm("Unlink Telegram from this account?")) return;
    setMessagingActionLoading(true);
    try {
      const res = await unlinkTelegram(userId);
      setMessagingStatus(res.data || null);
      setTelegramLinkCode("");
      applyMessagingProfile(res.data?.messaging);
      toast.success(res.message || "Telegram unlinked");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMessagingActionLoading(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!userId) return;
    setMessagingActionLoading(true);
    try {
      const res = await testTelegramMessage(userId);
      toast.success(res.message || "Test sent to Telegram");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMessagingActionLoading(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!userId) return;
    setMessagingActionLoading(true);
    try {
      const res = await testWhatsAppMessage(userId);
      toast.success(res.message || "Test sent to WhatsApp");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMessagingActionLoading(false);
    }
  };

  const copyTelegramStartCommand = async () => {
    const command =
      messagingStatus?.telegram?.startCommand ||
      (telegramLinkCode ? `/start ${telegramLinkCode}` : "");
    if (!command) {
      toast.error("Generate a link code first");
      return;
    }
    try {
      await navigator.clipboard.writeText(command);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy — copy manually: " + command);
    }
  };

  const handleSaveMessaging = async () => {
    if (!defaultMailboxEmail) {
      toast.error("Set a primary mailbox first");
      return;
    }
    setSaving(true);
    try {
      const linkedTelegram = messagingStatus?.telegram?.linked;
      const linkedChatId = messagingStatus?.telegram?.chatId;
      const linkedUsername = messagingStatus?.telegram?.username;

      const res = await updateMessaging({
        userId,
        mailboxEmail: defaultMailboxEmail,
        activeServices: {
          telegram: messagingForm.telegram,
          whatsapp: messagingForm.whatsapp,
        },
        preferredApprovalChannel: messagingForm.preferredApprovalChannel,
        serviceContacts: {
          telegramUsername:
            messagingForm.telegramUsername ||
            (linkedTelegram && linkedUsername ? linkedUsername : null),
          whatsappNumber: messagingForm.whatsappNumber || null,
          ...(linkedTelegram && linkedChatId
            ? { telegramChatId: String(linkedChatId) }
            : {}),
        },
        approvalSettings: {
          requireApprovalForEmailSend:
            messagingForm.requireApprovalForEmailSend,
          requireApprovalForEmailDraft:
            messagingForm.requireApprovalForEmailDraft,
        },
      });
      applyResponse(res);
      if (res.messaging) {
        applyMessagingProfile(res.messaging);
      }
      await refreshUserDetails(userId);
      await loadPrimaryMailboxDetails(defaultMailboxEmail);
      await loadMessagingStatus();
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

      <section className="settings-hero mb-4">
        <div className="settings-hero-copy">
          <div className="settings-eyebrow">
            <CIcon icon={cilAppsSettings} />
            Workspace Settings
          </div>
          <h1>Control center for your AI workspace</h1>
          <p>
            Connect mailboxes, tune your profile, configure approvals, and
            control how your AI agent responds.
          </p>
        </div>

        <div className="settings-account-card">
          <div className="settings-account-avatar">
            {(user.username || user.email)?.[0]?.toUpperCase()}
          </div>
          <div className="settings-account-copy">
            <span className="settings-account-name">
              {user.username || "Workspace Admin"}
            </span>
            <span className="settings-account-email">{authEmail}</span>
          </div>
          <span className="settings-role-pill text-capitalize">
            {user.role || "user"}
          </span>
        </div>
      </section>

      <div className="settings-insights-grid mb-4">
        <div className="settings-insight-card">
          <span className="settings-insight-icon">
            <CIcon icon={cilEnvelopeClosed} />
          </span>
          <div>
            <div className="settings-insight-value">
              {onboarding?.connectedMailboxCount || 0}
            </div>
            <div className="settings-insight-label">Connected mailboxes</div>
          </div>
        </div>
        <div className="settings-insight-card">
          <span className="settings-insight-icon">
            <CIcon icon={cilAt} />
          </span>
          <div>
            <div className="settings-insight-value settings-insight-email">
              {defaultMailboxEmail || "Not selected"}
            </div>
            <div className="settings-insight-label">Primary mailbox</div>
          </div>
        </div>
        <div className="settings-insight-card">
          <span className="settings-insight-icon">
            <CIcon icon={cilCheckCircle} />
          </span>
          <div>
            <div className="settings-insight-value">
              {onboarding?.isOnboardingComplete ? "Complete" : "In progress"}
            </div>
            <div className="settings-insight-label">Setup status</div>
          </div>
        </div>
      </div>

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
                <CIcon icon={isDone ? cilCheckCircle : fallback?.icon || cilSettings} />
              </div>
              <div className="settings-step-label">{step.label}</div>
            </div>
          );
        })}
      </div>

      <CNav className="mb-4 settings-tabs settings-tabs-premium">
        {SETTINGS_TABS.map((tab) => (
          <CNavItem key={tab.key}>
            <CNavLink
              active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="settings-tab-icon">
                <CIcon icon={tab.icon} />
              </span>
              <span className="settings-tab-copy">
                <span>{tab.label}</span>
                <small>{tab.description}</small>
              </span>
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
                <CCard className="settings-panel-card">
                  <CCardHeader className="settings-panel-header">
                    <span className="settings-panel-icon">
                      <CIcon icon={cilEnvelopeClosed} />
                    </span>
                    <div>
                      <strong>Connected Mailboxes</strong>
                      <small>Accounts available to your AI workspace</small>
                    </div>
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
                                  {mb.isOAuthConnected ? " · Google linked" : ""}
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
                <CCard className="settings-panel-card">
                  <CCardHeader className="settings-panel-header">
                    <span className="settings-panel-icon">
                      <CIcon icon={cilAt} />
                    </span>
                    <div>
                      <strong>Add Mailbox</strong>
                      <small>Connect Gmail or Microsoft 365 accounts</small>
                    </div>
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

                    {mailboxForm.emailProvider === "gmail" ? (
                      <>
                        <CAlert color="info" className="mb-3 py-2" style={{ fontSize: "0.84rem" }}>
                          Sign in with Google to connect Gmail. Your mailbox and
                          OAuth tokens are saved automatically in the database.
                        </CAlert>
                        <div className="mb-3">
                          <CFormLabel className="fw-semibold">
                            Display Name (optional)
                          </CFormLabel>
                          <CFormInput
                            value={mailboxForm.displayName}
                            onChange={(e) =>
                              setMailboxForm((f) => ({
                                ...f,
                                displayName: e.target.value,
                              }))
                            }
                            placeholder="Personal Gmail"
                          />
                        </div>
                        <CButton
                          color="danger"
                          className="text-white"
                          onClick={handleConnectGmail}
                          disabled={gmailConnecting || saving}
                        >
                          {gmailConnecting ? (
                            <CSpinner size="sm" />
                          ) : (
                            "Connect with Google"
                          )}
                        </CButton>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </CCardBody>
                </CCard>
              </CCol>
            </>
          )}

          {activeTab === "profile" && (
            <CCol lg={10}>
              <CCard className="settings-panel-card">
                <CCardHeader className="settings-panel-header">
                  <span className="settings-panel-icon">
                    <CIcon icon={cilUser} />
                  </span>
                  <div>
                    <strong>User Profile</strong>
                    <small>Company context, signature, and response style</small>
                  </div>
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
                      <CFormLabel className="fw-semibold">
                        Company website
                      </CFormLabel>
                      <div className="d-flex flex-wrap gap-2">
                        <CFormInput
                          className="flex-grow-1"
                          value={profileForm.companyWebsite}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              companyWebsite: e.target.value,
                            }))
                          }
                          placeholder="https://company.com or company.com"
                        />
                        <CButton
                          color="light"
                          className="text-nowrap"
                          onClick={handleEnrichFromCompany}
                          disabled={
                            enrichingProfile ||
                            saving ||
                            detailsLoading ||
                            !profileCompanyFieldsReady
                          }
                        >
                          {enrichingProfile ? (
                            <CSpinner size="sm" />
                          ) : (
                            "✨ Generate bio & keywords"
                          )}
                        </CButton>
                      </div>
                      <div className="form-text">
                        After filling designation, company, department, and
                        industry, we fetch your company website and auto-fill bio
                        and keywords.
                      </div>
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
              <CCard className="settings-panel-card">
                <CCardHeader className="settings-panel-header">
                  <span className="settings-panel-icon">
                    <CIcon icon={cilSend} />
                  </span>
                  <div>
                    <strong>Messaging & Approval Channels</strong>
                    <small>Telegram, WhatsApp, and approval rules</small>
                  </div>
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
                  <div className="messaging-service-grid mb-4">
                    <div className="messaging-service-card">
                      <div className="messaging-service-card-head">
                        <span className="messaging-service-icon">
                          <CIcon icon={cilSend} />
                        </span>
                        <div>
                          <strong>Telegram</strong>
                          <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                            {messagingStatus?.telegram?.botUsername || "@agentic_email_bot"}
                            {messagingStatus?.telegram?.botConfigured ? (
                              <CBadge color="success" className="ms-2">Bot online</CBadge>
                            ) : (
                              <CBadge color="secondary" className="ms-2">Bot not configured</CBadge>
                            )}
                          </div>
                        </div>
                        <CBadge color={messagingStatus?.telegram?.linked ? "success" : "warning"}>
                          {messagingStatus?.telegram?.linked ? "Linked" : "Not linked"}
                        </CBadge>
                      </div>

                      <CFormCheck
                        id="telegram"
                        className="mb-3"
                        label="Enable Telegram notifications & commands"
                        checked={messagingForm.telegram}
                        onChange={(e) =>
                          setMessagingForm((f) => ({
                            ...f,
                            telegram: e.target.checked,
                          }))
                        }
                      />

                      {messagingForm.telegram && (
                        <div className="messaging-service-panel">
                          {messagingStatus?.telegram?.linked ? (
                            <CAlert color="success" className="py-2 mb-3" style={{ fontSize: "0.84rem" }}>
                              Connected as{" "}
                              <strong>
                                {messagingStatus.telegram.username
                                  ? `@${messagingStatus.telegram.username}`
                                  : `chat ${messagingStatus.telegram.chatId}`}
                              </strong>
                              <div className="mt-1 text-muted">
                                Mode: {messagingStatus.telegram.connectionMode}
                              </div>
                            </CAlert>
                          ) : (
                            <CAlert color="info" className="py-2 mb-3" style={{ fontSize: "0.84rem" }}>
                              1. Click <strong>Generate link code</strong>
                              <br />
                              2. Open {messagingStatus?.telegram?.botUsername || "your Telegram bot"}
                              <br />
                              3. Send the <code>/start CODE</code> command
                            </CAlert>
                          )}

                          <div className="d-flex flex-wrap gap-2 mb-3">
                            <CButton
                              size="sm"
                              color="primary"
                              onClick={handleGenerateTelegramCode}
                              disabled={messagingActionLoading}
                            >
                              {messagingActionLoading ? <CSpinner size="sm" /> : "Generate link code"}
                            </CButton>
                            {(telegramLinkCode || messagingStatus?.telegram?.startCommand) && (
                              <CButton
                                size="sm"
                                color="light"
                                onClick={copyTelegramStartCommand}
                              >
                                Copy /start command
                              </CButton>
                            )}
                            {messagingStatus?.telegram?.linked && (
                              <>
                                <CButton
                                  size="sm"
                                  color="light"
                                  onClick={handleTestTelegram}
                                  disabled={messagingActionLoading}
                                >
                                  Send test
                                </CButton>
                                <CButton
                                  size="sm"
                                  color="danger"
                                  variant="outline"
                                  onClick={handleUnlinkTelegram}
                                  disabled={messagingActionLoading}
                                >
                                  Unlink
                                </CButton>
                              </>
                            )}
                          </div>

                          {(telegramLinkCode || messagingStatus?.telegram?.startCommand) && (
                            <div className="messaging-command-box mb-3">
                              <code>
                                {messagingStatus?.telegram?.startCommand ||
                                  `/start ${telegramLinkCode}`}
                              </code>
                            </div>
                          )}

                          <CFormLabel className="fw-semibold">Telegram username (optional)</CFormLabel>
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
                    </div>

                    <div className="messaging-service-card">
                      <div className="messaging-service-card-head">
                        <span className="messaging-service-icon">
                          <CIcon icon={cilSpeech} />
                        </span>
                        <div>
                          <strong>WhatsApp</strong>
                          <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                            Twilio WhatsApp channel
                            {messagingStatus?.whatsapp?.twilioConfigured ? (
                              <CBadge color="success" className="ms-2">Server ready</CBadge>
                            ) : (
                              <CBadge color="secondary" className="ms-2">Twilio not configured</CBadge>
                            )}
                          </div>
                        </div>
                        <CBadge color={messagingForm.whatsapp && messagingForm.whatsappNumber ? "success" : "secondary"}>
                          {messagingForm.whatsapp && messagingForm.whatsappNumber ? "Configured" : "Setup needed"}
                        </CBadge>
                      </div>

                      <CFormCheck
                        id="whatsapp"
                        className="mb-3"
                        label="Enable WhatsApp approval notifications"
                        checked={messagingForm.whatsapp}
                        onChange={(e) =>
                          setMessagingForm((f) => ({
                            ...f,
                            whatsapp: e.target.checked,
                          }))
                        }
                      />

                      {messagingForm.whatsapp && (
                        <div className="messaging-service-panel">
                          <CFormLabel className="fw-semibold">WhatsApp number</CFormLabel>
                          <div className="d-flex flex-wrap gap-2">
                            <CFormInput
                              className="flex-grow-1"
                              value={messagingForm.whatsappNumber}
                              onChange={(e) =>
                                setMessagingForm((f) => ({
                                  ...f,
                                  whatsappNumber: e.target.value,
                                }))
                              }
                              placeholder="+1234567890"
                            />
                            <CButton
                              size="sm"
                              color="light"
                              onClick={handleTestWhatsApp}
                              disabled={
                                messagingActionLoading ||
                                !messagingForm.whatsappNumber ||
                                !messagingStatus?.whatsapp?.twilioConfigured
                              }
                            >
                              Send test
                            </CButton>
                          </div>
                          {!messagingStatus?.whatsapp?.twilioConfigured && (
                            <div className="form-text text-warning">
                              Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM on the server.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    <CFormLabel className="fw-semibold">
                      Preferred approval channel
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

                  <h6 className="fw-semibold mb-3">Approval rules</h6>

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

                  {messagingStatus?.approvals?.recent?.length > 0 && (
                    <>
                      <hr className="my-4" />
                      <h6 className="fw-semibold mb-2">
                        Recent approvals
                        {messagingStatus.approvals.pendingCount > 0 && (
                          <CBadge color="warning" className="ms-2">
                            {messagingStatus.approvals.pendingCount} pending
                          </CBadge>
                        )}
                      </h6>
                      <ul className="messaging-approval-list mb-0">
                        {messagingStatus.approvals.recent.map((item) => (
                          <li key={item._id} className="messaging-approval-item">
                            <span>{item.title}</span>
                            <CBadge
                              color={
                                item.status === "approved"
                                  ? "success"
                                  : item.status === "rejected"
                                    ? "danger"
                                    : "warning"
                              }
                            >
                              {item.status}
                            </CBadge>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  <div className="d-flex gap-2 flex-wrap mt-4">
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
                      color="light"
                      onClick={loadMessagingStatus}
                      disabled={messagingActionLoading || detailsLoading}
                    >
                      {messagingActionLoading ? <CSpinner size="sm" /> : "Refresh status"}
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
              <CCard className="settings-panel-card">
                <CCardHeader className="settings-panel-header">
                  <span className="settings-panel-icon">
                    <CIcon icon={cilBolt} />
                  </span>
                  <div>
                    <strong>AI Reply Preferences</strong>
                    <small>Tone, auto-send behavior, and reply template</small>
                  </div>
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
