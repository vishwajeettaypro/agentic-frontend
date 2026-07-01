import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CButton, CCard, CCardBody } from "@coreui/react";
import PageHeader from "../../components/PageHeader";
import { getAgentFromPathname } from "../../config/agents";

export default function AgentComingSoonPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const agent = getAgentFromPathname(pathname);

  if (!agent) {
    return (
      <PageHeader
        title="Agent not found"
        subtitle="Return to the agents hub and pick an available agent."
        showMailbox={false}
      />
    );
  }

  return (
    <>
      <PageHeader
        title={agent.name}
        subtitle={agent.description}
        showMailbox={false}
      />

      <CCard className="saas-card">
        <CCardBody className="agent-coming-soon-body text-center py-5">
          <span className="agent-coming-soon-icon" aria-hidden="true">
            {agent.icon}
          </span>
          <h4 className="mb-2">Coming soon</h4>
          <p className="text-muted mb-4" style={{ maxWidth: 480, margin: "0 auto" }}>
            {agent.name} will get its own workspace with department-specific
            tools and workflows. For now, use Email Agent for inbox and calendar
            tasks.
          </p>
          <div className="d-flex gap-2 justify-content-center flex-wrap">
            <CButton color="primary" onClick={() => navigate("/agents/email")}>
              Open Email Agent
            </CButton>
            <CButton color="light" onClick={() => navigate("/agents")}>
              All Agents
            </CButton>
          </div>
        </CCardBody>
      </CCard>
    </>
  );
}
