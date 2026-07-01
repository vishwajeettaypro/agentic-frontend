import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilEnvelopeClosed,
  cilSend,
  cilPencil,
  cilBolt,
  cilInbox,
  cilCalendar,
  cilHistory,
} from "@coreui/icons";
import { getEmailStatistics } from "../services/emailService";
import { useApp } from "../context/AppContext";
import PageHeader from "../components/PageHeader";
import { EMAIL_AGENT_PATHS } from "../config/agents";
import { Toaster } from "react-hot-toast";

export default function Dashboard() {
  const { userEmail, onboarding, connectedMailboxes, authEmail } = useApp();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userEmail) return;
    setLoading(true);
    getEmailStatistics(userEmail)
      .then((data) => setStats(data.statistics))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userEmail]);

  const statCards = [
    {
      label: "Total Processed",
      value: stats?.totalEmails ?? "—",
      variant: "primary",
      icon: cilEnvelopeClosed,
    },
    {
      label: "Emails Sent",
      value: stats?.sentEmails ?? "—",
      variant: "success",
      icon: cilSend,
    },
    {
      label: "Drafts",
      value: stats?.draftEmails ?? "—",
      variant: "warning",
      icon: cilPencil,
    },
    {
      label: "AI Generated",
      value: stats?.generatedEmails ?? "—",
      variant: "info",
      icon: cilBolt,
    },
  ];

  const quickActions = [
    {
      title: "Check Inbox",
      desc: "Fetch and AI-reply to emails",
      icon: cilInbox,
      path: EMAIL_AGENT_PATHS.inbox,
    },
    {
      title: "Calendar",
      desc: "View and create events",
      icon: cilCalendar,
      path: EMAIL_AGENT_PATHS.calendar,
    },
    {
      title: "Email History",
      desc: "View AI-processed emails",
      icon: cilHistory,
      path: EMAIL_AGENT_PATHS.history,
    },
  ];

  const steps = [
    {
      step: "1",
      title: "Fetch Emails",
      desc: "Pull inbox messages from Gmail or Outlook",
    },
    {
      step: "2",
      title: "AI Generates Reply",
      desc: "AI reads the email and drafts a professional response",
    },
    {
      step: "3",
      title: "Review & Edit",
      desc: "Review the draft and adjust before sending",
    },
    {
      step: "4",
      title: "Send",
      desc: "Approve and send with one click",
    },
  ];

  return (
    <>
      <Toaster position="top-right" />
      <PageHeader
        title="Email Agent Dashboard"
        subtitle={
          userEmail
            ? "Overview of AI email activity for the selected mailbox"
            : connectedMailboxes?.length
              ? "Complete mailbox setup in Settings to activate features"
              : "Connect mailboxes in Settings to get started"
        }
      />

      {authEmail && userEmail && userEmail !== authEmail && (
        <p className="saas-text-muted mb-4">
          Signed in as {authEmail}
        </p>
      )}

      {!userEmail && (
        <div className="saas-alert">
          <div className="flex-grow-1">
            <strong>Mailbox not ready.</strong>{" "}
            {onboarding?.canCompleteMailboxSetup
              ? "Complete mailbox setup in Settings."
              : "Connect at least one Outlook or Gmail mailbox in Settings."}
          </div>
          <button
            type="button"
            className="saas-btn-primary ms-auto flex-shrink-0"
            onClick={() => navigate("/settings")}
          >
            Open Settings
          </button>
        </div>
      )}

      <CRow className="g-3 mb-4">
        {statCards.map((s) => (
          <CCol key={s.label} xs={6} lg={3}>
            <div className={`saas-stat-card saas-stat-card--${s.variant}`}>
              <div className="saas-stat-icon">
                <CIcon icon={s.icon} />
              </div>
              <div className="saas-stat-value">
                {loading ? <CSpinner size="sm" /> : s.value}
              </div>
              <div className="saas-stat-label">{s.label}</div>
            </div>
          </CCol>
        ))}
      </CRow>

      <CRow className="g-3 mb-4">
        {quickActions.map((action) => (
          <CCol key={action.path} md={4}>
            <CCard
              className="saas-card saas-card--interactive h-100"
              onClick={() => navigate(action.path)}
            >
              <CCardBody className="saas-action-card">
                <div className="saas-action-icon">
                  <CIcon icon={action.icon} />
                </div>
                <div className="saas-action-title">{action.title}</div>
                <div className="saas-action-desc">{action.desc}</div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>

      <CCard className="saas-card">
        <CCardHeader>How it works</CCardHeader>
        <CCardBody>
          <CRow className="g-3">
            {steps.map((item) => (
              <CCol key={item.step} sm={6} lg={3}>
                <div className="saas-step-card">
                  <span className="saas-step-number">{item.step}</span>
                  <div className="saas-step-title">{item.title}</div>
                  <div className="saas-step-desc">{item.desc}</div>
                </div>
              </CCol>
            ))}
          </CRow>
        </CCardBody>
      </CCard>
    </>
  );
}
