import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { getAgentFromPathname } from "../config/agents";

export default function AgentShell() {
  const { pathname } = useLocation();
  const agent = getAgentFromPathname(pathname);

  return (
    <div className="agent-shell" data-agent={agent?.id || "unknown"}>
      {agent ? (
        <div
          className="agent-shell-banner mb-4"
          style={{ borderColor: `${agent.color}40`, background: `${agent.color}0a` }}
        >
          <span className="agent-shell-banner-icon" aria-hidden="true">
            {agent.icon}
          </span>
          <div>
            <div className="agent-shell-banner-title">{agent.name}</div>
            <div className="agent-shell-banner-desc">{agent.description}</div>
          </div>
        </div>
      ) : null}
      <Outlet />
    </div>
  );
}
