import React from "react";
import { useNavigate } from "react-router-dom";
import { CRow, CCol, CCard, CCardBody, CBadge } from "@coreui/react";
import { Toaster } from "react-hot-toast";
import PageHeader from "../../components/PageHeader";
import { AGENTS } from "../../config/agents";

export default function AgentsHubPage() {
  const navigate = useNavigate();

  return (
    <>
      <Toaster position="top-right" />
      <PageHeader
        title="Agents"
        subtitle="Choose a department agent. Email Agent includes your current inbox, calendar, and history tools."
        showMailbox={false}
      />

      <CRow className="g-3">
        {AGENTS.map((agent) => (
          <CCol key={agent.id} xs={12} md={6} xl={3}>
            <CCard
              className={`saas-card agent-hub-card h-100${
                agent.enabled ? " agent-hub-card--active" : ""
              }`}
              onClick={() => navigate(agent.basePath)}
              style={{ cursor: "pointer" }}
            >
              <CCardBody className="agent-hub-card-body">
                <div className="agent-hub-card-top">
                  <span
                    className="agent-hub-icon"
                    style={{ background: `${agent.color}18`, color: agent.color }}
                    aria-hidden="true"
                  >
                    {agent.icon}
                  </span>
                  {agent.comingSoon ? (
                    <CBadge color="secondary">Coming soon</CBadge>
                  ) : (
                    <CBadge color="success">Active</CBadge>
                  )}
                </div>
                <h5 className="agent-hub-title mb-2">{agent.name}</h5>
                <p className="agent-hub-desc mb-0">{agent.description}</p>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>
    </>
  );
}
