import {
  cilSpeedometer,
  cilEnvelopeClosed,
  cilCalendar,
  cilHistory,
} from "@coreui/icons";

export const AGENTS = [
  {
    id: "email",
    name: "Email Agent",
    shortName: "Email",
    icon: "📧",
    color: "#321fdb",
    description:
      "Fetch inbox, AI-label messages, generate replies, manage calendar from mail.",
    enabled: true,
    comingSoon: false,
    basePath: "/agents/email",
    nav: [
      {
        to: "/agents/email",
        label: "Dashboard",
        icon: cilSpeedometer,
        end: true,
      },
      {
        to: "/agents/email/inbox",
        label: "Inbox",
        icon: cilEnvelopeClosed,
      },
      {
        to: "/agents/email/calendar",
        label: "Calendar",
        icon: cilCalendar,
      },
      {
        to: "/agents/email/history",
        label: "History",
        icon: cilHistory,
      },
    ],
  },
  {
    id: "sales",
    name: "Sales Agent",
    shortName: "Sales",
    icon: "💼",
    color: "#2eb85c",
    description:
      "Lead follow-ups, quotes, pipeline updates, and customer communication.",
    enabled: false,
    comingSoon: true,
    basePath: "/agents/sales",
    nav: [],
  },
  {
    id: "procurement",
    name: "Procurement Agent",
    shortName: "Procurement",
    icon: "📦",
    color: "#f9b115",
    description:
      "Vendor emails, RFQs, purchase orders, and delivery follow-ups.",
    enabled: false,
    comingSoon: true,
    basePath: "/agents/procurement",
    nav: [],
  },
  {
    id: "production",
    name: "Production Agent",
    shortName: "Production",
    icon: "🏭",
    color: "#6366f1",
    description:
      "Schedules, work orders, delays, and shop-floor coordination.",
    enabled: false,
    comingSoon: true,
    basePath: "/agents/production",
    nav: [],
  },
];

export const getAgentById = (id) => AGENTS.find((agent) => agent.id === id);

export const getAgentFromPathname = (pathname = "") => {
  const normalized = pathname.toLowerCase();
  return (
    AGENTS.find((agent) => normalized.startsWith(agent.basePath.toLowerCase())) ||
    null
  );
};

export const EMAIL_AGENT_PATHS = {
  dashboard: "/agents/email",
  inbox: "/agents/email/inbox",
  calendar: "/agents/email/calendar",
  history: "/agents/email/history",
};
