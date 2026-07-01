import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CSpinner,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormInput,
  CFormTextarea,
  CFormLabel,
  CFormSelect,
  CFormCheck,
  CBadge,
  CAlert,
} from "@coreui/react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import {
  getCalendarEvents,
  getCalendarEvent,
  createCalendarEvent,
  updateCalendarEvent,
  cancelCalendarEvent,
  deleteCalendarEvent,
  getOrganizationEmployees,
} from "../services/calendarService";
import { useApp } from "../context/AppContext";
import toast, { Toaster } from "react-hot-toast";
import PageHeader from "../components/PageHeader";

const DEFAULT_TIME_ZONE = "India Standard Time";

const TIME_ZONE_OPTIONS = [
  { value: "India Standard Time", label: "IST — India Standard Time" },
  { value: "UTC", label: "UTC" },
  { value: "Pacific Standard Time", label: "PT — Pacific Time" },
  { value: "Eastern Standard Time", label: "ET — Eastern Time" },
  { value: "GMT Standard Time", label: "GMT/BST — London" },
  { value: "Arabian Standard Time", label: "GST — Gulf Standard Time" },
  { value: "Singapore Standard Time", label: "SGT — Singapore" },
];

const toGraphDateTime = (datetimeLocal) => {
  if (!datetimeLocal) return "";
  return datetimeLocal.length === 16 ? `${datetimeLocal}:00` : datetimeLocal;
};

const parseEventDateTime = (eventStart) => {
  const raw = eventStart?.dateTime || eventStart;
  if (!raw) return new Date();

  if (eventStart?.isAllDay) {
    const [year, month, day] = String(raw).split("T")[0].split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const clean = String(raw).split(".")[0];
  const timeZone = eventStart?.timeZone || "UTC";

  if (timeZone === "UTC" || timeZone === "Etc/UTC" || timeZone === "Etc/GMT") {
    return new Date(`${clean}Z`);
  }

  return new Date(clean);
};

const formatEventTime = (eventStart) =>
  format(parseEventDateTime(eventStart), "h:mm a");

const stripHtml = (html) => (html || "").replace(/<[^>]+>/g, "").trim();

const eventToForm = (event) => {
  const startDate = parseEventDateTime(event.start);
  const endDate = parseEventDateTime(event.end);

  return {
    subject: event.subject || "",
    startTime: format(startDate, "yyyy-MM-dd'T'HH:mm"),
    endTime: format(endDate, "yyyy-MM-dd'T'HH:mm"),
    location: event.location?.displayName || "",
    description: stripHtml(event.body?.content) || event.bodyPreview || "",
    manualAttendees: "",
    timeZone: DEFAULT_TIME_ZONE,
  };
};

const resolvePersonEmail = (person = {}) => {
  if (!person) return "";

  if (typeof person.email === "string") {
    return person.email.trim();
  }

  if (person.email && typeof person.email === "object") {
    return String(person.email.address || person.email.mail || "").trim();
  }

  if (typeof person.emailAddress === "string") {
    return person.emailAddress.trim();
  }

  return String(
    person.emailAddress?.address || person.mail || person.address || "",
  ).trim();
};

const resolvePersonName = (person = {}, email = "") =>
  person.name ||
  person.displayName ||
  person.emailAddress?.name ||
  email.split("@")[0] ||
  "";

const getAttendeeEmail = (attendee = {}) =>
  String(
    attendee.emailAddress?.address ||
      attendee.email ||
      (typeof attendee.emailAddress === "string"
        ? attendee.emailAddress
        : "") ||
      attendee.mail ||
      attendee.address ||
      "",
  ).trim();

const getAttendeeName = (attendee = {}) => {
  const email = getAttendeeEmail(attendee);
  return (
    attendee.emailAddress?.name ||
    attendee.name ||
    attendee.displayName ||
    email.split("@")[0] ||
    email
  );
};

const normalizeInvitee = (person = {}) => {
  const email = String(resolvePersonEmail(person) || getAttendeeEmail(person))
    .trim()
    .toLowerCase();

  if (!email.includes("@")) return null;

  return {
    email,
    name: resolvePersonName(person, email) || getAttendeeName(person),
  };
};

const eventToAttendees = (event, organizerEmail = "") => {
  if (!event) return [];

  const organizer = (
    organizerEmail ||
    event.organizer?.emailAddress?.address ||
    event.organizer?.email ||
    ""
  )
    .trim()
    .toLowerCase();

  return (event.attendees || [])
    .map((attendee) => normalizeInvitee(attendee))
    .filter(
      (attendee) => attendee && attendee.email.toLowerCase() !== organizer,
    );
};

const extractEmailToken = (value = "") => {
  const trimmed = String(value).trim();
  if (!trimmed) return "";

  const bracketMatch = trimmed.match(/<([^>]+)>/);
  if (bracketMatch?.[1]?.includes("@")) {
    return bracketMatch[1].trim();
  }

  const emailMatch = trimmed.match(/[^\s,;<>]+@[^\s,;<>]+\.[^\s,;<>]+/);
  return emailMatch ? emailMatch[0].trim() : trimmed;
};

const parseAttendees = (value) => {
  if (!value || typeof value !== "string") return [];

  return value
    .split(/[,;\n]+/)
    .map((entry) => extractEmailToken(entry))
    .filter(Boolean)
    .map((email) => ({ email }));
};

const mergeAttendees = (selected = [], manualText = "") => {
  const map = new Map();

  (Array.isArray(selected) ? selected : []).forEach((person) => {
    const invitee = normalizeInvitee(person);
    if (invitee) {
      map.set(invitee.email, invitee);
    }
  });

  parseAttendees(manualText).forEach((person) => {
    const invitee = normalizeInvitee(person);
    if (invitee) {
      map.set(invitee.email, invitee);
    }
  });

  return Array.from(map.values());
};

const getEmployeeEmail = (employee = {}) =>
  String(
    employee.email ||
      employee.mail ||
      employee.userPrincipalName ||
      getAttendeeEmail(employee) ||
      "",
  ).trim();

const getEmployeeName = (employee = {}) =>
  employee.name ||
  employee.displayName ||
  getEmployeeEmail(employee).split("@")[0] ||
  "";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const isValidEmail = (value = "") => {
  const email = extractEmailToken(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export default function CalendarPage() {
  const { userEmail, connectedMailboxes } = useApp();
  const activeMailbox = connectedMailboxes.find(
    (mailbox) => mailbox.mailboxEmail === userEmail,
  );
  const isGmailMailbox = activeMailbox?.emailProvider === "gmail";
  const needsGmailOAuth = isGmailMailbox && !activeMailbox?.isOAuthConnected;
  const calendarLabel = isGmailMailbox
    ? "Google Calendar"
    : "Microsoft Outlook calendar";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [eventLoading, setEventLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [form, setForm] = useState({
    subject: "",
    startTime: "",
    endTime: "",
    location: "",
    description: "",
    manualAttendees: "",
    timeZone: DEFAULT_TIME_ZONE,
  });
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const selectedAttendeesRef = useRef([]);
  const formRef = useRef(form);
  const activeEventRef = useRef(null);
  const modalModeRef = useRef(null);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    activeEventRef.current = activeEvent;
  }, [activeEvent]);

  useEffect(() => {
    modalModeRef.current = modalMode;
  }, [modalMode]);

  const updateForm = useCallback((updates) => {
    const next = { ...formRef.current, ...updates };
    formRef.current = next;
    setForm(next);
  }, []);

  const syncSelectedAttendees = useCallback((next) => {
    const list = Array.isArray(next) ? next : [];
    selectedAttendeesRef.current = list;
    setSelectedAttendees(list);
  }, []);

  const loadEmployees = useCallback(
    async (search = "") => {
      setEmployeesLoading(true);
      try {
        const data = await getOrganizationEmployees(search, userEmail);
        const directoryEmployees = (data.employees || [])
          .map((employee) => ({
            ...employee,
            email: getEmployeeEmail(employee),
            name: getEmployeeName(employee),
          }))
          .filter((employee) => employee.email);

        const mailboxInvitees = connectedMailboxes
          .filter(
            (mailbox) =>
              mailbox.mailboxEmail &&
              mailbox.mailboxEmail.toLowerCase() !== userEmail?.toLowerCase(),
          )
          .map((mailbox) => ({
            id: mailbox.id || mailbox.mailboxEmail,
            email: mailbox.mailboxEmail,
            name: mailbox.displayName || mailbox.mailboxEmail.split("@")[0],
            source: "connected_mailbox",
          }));

        const merged = new Map();
        [...mailboxInvitees, ...directoryEmployees].forEach((employee) => {
          const email = employee.email.trim().toLowerCase();
          if (!email.includes("@")) return;
          if (email === userEmail?.toLowerCase()) return;
          if (!merged.has(email)) {
            merged.set(email, {
              ...employee,
              email,
              name: employee.name || email.split("@")[0],
            });
          }
        });

        const searchTerm = search.trim().toLowerCase();
        const list = Array.from(merged.values()).filter((employee) => {
          if (!searchTerm) return true;
          return (
            employee.email.includes(searchTerm) ||
            (employee.name || "").toLowerCase().includes(searchTerm)
          );
        });

        setEmployees(list);
      } catch (err) {
        toast.error(err.message || "Failed to load employees");
        setEmployees([]);
      } finally {
        setEmployeesLoading(false);
      }
    },
    [userEmail, connectedMailboxes],
  );

  const fetchEvents = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    try {
      const start = startOfWeek(startOfMonth(currentDate)).toISOString();
      const end = endOfWeek(endOfMonth(currentDate)).toISOString();
      const data = await getCalendarEvents(userEmail, start, end);
      setEvents(data.events || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [userEmail, currentDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (modalMode !== "create" && modalMode !== "edit") return undefined;

    const timer = setTimeout(() => {
      loadEmployees(employeeSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [modalMode, employeeSearch, loadEmployees]);

  const closeModal = () => {
    setModalMode(null);
    setActiveEvent(null);
    setSelectedDay(null);
    setEmployeeSearch("");
  };

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate)),
  });

  const getEventsForDay = (day) =>
    events.filter((e) => {
      const start = parseEventDateTime(e.start);
      return isSameDay(start, day);
    });

  const openCreateModal = (day) => {
    setSelectedDay(day);
    const startDT = new Date(day);
    startDT.setHours(9, 0, 0);
    const endDT = new Date(day);
    endDT.setHours(10, 0, 0);
    const emptyForm = {
      subject: "",
      startTime: format(startDT, "yyyy-MM-dd'T'HH:mm"),
      endTime: format(endDT, "yyyy-MM-dd'T'HH:mm"),
      location: "",
      description: "",
      manualAttendees: "",
      timeZone: DEFAULT_TIME_ZONE,
    };
    setActiveEvent(null);
    activeEventRef.current = null;
    formRef.current = emptyForm;
    setForm(emptyForm);
    setSelectedAttendees([]);
    selectedAttendeesRef.current = [];
    setEmployeeSearch("");
    modalModeRef.current = "create";
    setModalMode("create");
  };

  const openViewModal = async (event, e) => {
    e?.stopPropagation();
    if (!event?.id || !userEmail) return;

    setModalMode("view");
    setActiveEvent(event);
    setEventLoading(true);

    try {
      const data = await getCalendarEvent(
        userEmail,
        event.id,
        event.calendarId,
      );
      setActiveEvent(data.event || event);
    } catch (err) {
      toast.error(err.message || "Failed to load event details");
    } finally {
      setEventLoading(false);
    }
  };

  const openEditModal = (event = activeEvent) => {
    if (!event) return;
    activeEventRef.current = event;
    setActiveEvent(event);
    const formData = eventToForm(event);
    formRef.current = formData;
    setForm(formData);
    syncSelectedAttendees(eventToAttendees(event, userEmail));
    setEmployeeSearch("");
    modalModeRef.current = "edit";
    setModalMode("edit");
  };

  const openEditModalFromEvent = async (event) => {
    if (!event?.id || !userEmail) return;

    setEventLoading(true);
    try {
      const data = await getCalendarEvent(
        userEmail,
        event.id,
        event.calendarId,
      );
      const fullEvent = data.event || event;
      openEditModal(fullEvent);
    } catch (err) {
      toast.error(err.message || "Failed to load event details");
    } finally {
      setEventLoading(false);
    }
  };

  const toggleAttendee = (employee) => {
    const email = getEmployeeEmail(employee).toLowerCase();
    if (!email.includes("@")) {
      toast.error("This employee does not have an email address");
      return;
    }

    const name =
      getEmployeeName(employee) || getAttendeeName(employee) || email;
    const invitee = { email, name };
    const prev = selectedAttendeesRef.current;
    const exists = prev.some((item) => item.email.toLowerCase() === email);
    const next = exists
      ? prev.filter((item) => item.email.toLowerCase() !== email)
      : [...prev, invitee];

    syncSelectedAttendees(next);
  };

  const isAttendeeSelected = (email) =>
    selectedAttendeesRef.current.some(
      (item) => item.email.toLowerCase() === String(email || "").toLowerCase(),
    );

  const collectInvitees = useCallback(() => {
    const manualText = String(formRef.current.manualAttendees || "").trim();
    return mergeAttendees(selectedAttendeesRef.current, manualText);
  }, []);

  const addExternalGuest = (emailInput) => {
    const email = extractEmailToken(emailInput).toLowerCase();
    if (!isValidEmail(email)) {
      toast.error("Enter a valid email address");
      return;
    }

    toggleAttendee({ email, name: email.split("@")[0] });
    setEmployeeSearch("");
  };

  const searchEmailCandidate = extractEmailToken(employeeSearch).toLowerCase();
  const canAddExternalGuest =
    isValidEmail(searchEmailCandidate) &&
    !employees.some(
      (employee) => employee.email.toLowerCase() === searchEmailCandidate,
    ) &&
    !isAttendeeSelected(searchEmailCandidate);

  const inviteeHelpText = isGmailMailbox
    ? "Pick someone from your organization, connected mailboxes, or type any email below (including external Gmail addresses)."
    : "Select employees from your organization or add extra emails below.";

  const buildEventPayload = (invitees) => ({
    subject: formRef.current.subject,
    startTime: toGraphDateTime(formRef.current.startTime),
    endTime: toGraphDateTime(formRef.current.endTime),
    timeZone: formRef.current.timeZone,
    location: formRef.current.location,
    description: formRef.current.description,
    attendees: invitees,
    guestList: invitees,
    invitees: invitees,
    isReminderOn: true,
  });

  const handleSave = async () => {
    if (
      !formRef.current.subject ||
      !formRef.current.startTime ||
      !formRef.current.endTime
    ) {
      return toast.error("Subject, start time and end time are required");
    }

    setSubmitting(true);
    try {
      const manualText = String(formRef.current.manualAttendees || "").trim();
      const invitees = collectInvitees();
      const parsedManualOnly = mergeAttendees([], manualText);

      if (
        manualText &&
        parsedManualOnly.length === 0 &&
        invitees.length === 0
      ) {
        toast.error(
          "Could not parse invitee emails. Use comma-separated addresses.",
        );
        return;
      }

      const payload = buildEventPayload(invitees);
      const event = activeEventRef.current;
      const mode = modalModeRef.current;

      if (mode === "edit" && event?.id) {
        await updateCalendarEvent(
          userEmail,
          event.id,
          payload,
          event.calendarId,
        );
        toast.success("Event updated!");
      } else {
        const result = await createCalendarEvent(userEmail, payload);
        if (result?.warning) {
          toast(result.warning, { icon: "⚠️" });
        }
        toast.success("Event created!");
      }

      closeModal();
      fetchEvents();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEvent = async () => {
    if (!activeEvent?.id) return;

    if (
      !window.confirm(
        `Cancel "${activeEvent.subject}"? All invitees will be notified.`,
      )
    ) {
      return;
    }

    setSubmitting(true);
    try {
      await cancelCalendarEvent(
        userEmail,
        activeEvent.id,
        "",
        activeEvent.calendarId,
      );
      toast.success("Event cancelled");
      closeModal();
      fetchEvents();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!activeEvent?.id) return;

    if (
      !window.confirm(
        `Permanently delete "${activeEvent.subject}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    setSubmitting(true);
    try {
      await deleteCalendarEvent(
        userEmail,
        activeEvent.id,
        activeEvent.calendarId,
      );
      toast.success("Event deleted");
      closeModal();
      fetchEvents();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <PageHeader
        title="Calendar"
        subtitle={`Email Agent — view and manage ${calendarLabel} events`}
        actions={
          <>
            <CButton
              className="btn btn-light"
              size="sm"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              ‹
            </CButton>
            <div
              className="fw-600 px-2 d-flex align-items-center"
              style={{ minWidth: 130, justifyContent: "center" }}
            >
              {format(currentDate, "MMMM yyyy")}
            </div>
            <CButton
              className="btn btn-light"
              size="sm"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              ›
            </CButton>
            <CButton
              className="btn btn-primary"
              size="sm"
              onClick={fetchEvents}
              disabled={loading || !userEmail}
            >
              {loading ? <CSpinner size="sm" /> : "🔄 Refresh"}
            </CButton>
          </>
        }
      />

      {!userEmail && (
        <div className="alert alert-warning mb-4" style={{ borderRadius: 10 }}>
          Connect a mailbox in Settings to load calendar events.
        </div>
      )}

      {needsGmailOAuth && (
        <CAlert color="warning" className="mb-4" style={{ borderRadius: 10 }}>
          This Gmail mailbox must be connected via Google sign-in in Settings
          before calendar events can load. If you connected earlier, reconnect
          to grant calendar access.
        </CAlert>
      )}

      <CCard>
        <CCardBody className="p-0">
          {/* Day headers */}
          <div
            className="calendar-grid"
            style={{ background: "transparent", gap: 0, marginBottom: 1 }}
          >
            {DAYS.map((d) => (
              <div key={d} className="calendar-header-cell">
                {d}
              </div>
            ))}
          </div>
          {/* Day cells */}
          <div className="calendar-grid" style={{ gap: 1 }}>
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              return (
                <div
                  key={day.toString()}
                  className={`calendar-day${!isSameMonth(day, currentDate) ? " other-month" : ""}${isToday(day) ? " today" : ""}`}
                  onClick={() => userEmail && openCreateModal(day)}
                >
                  <div className="day-number">{format(day, "d")}</div>
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className="calendar-event calendar-event-clickable"
                      title={ev.subject}
                      onClick={(e) => openViewModal(ev, e)}
                    >
                      {ev.subject}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div style={{ fontSize: "0.65rem", color: "#6c757d" }}>
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CCardBody>
      </CCard>

      {/* Upcoming events list */}
      {events && events.length > 0 && (
        <CCard className="mt-3">
          <CCardHeader>Upcoming Events This Month</CCardHeader>
          <CCardBody className="p-0">
            {events.slice(0, 8).map((ev) => {
              const start = parseEventDateTime(ev.start);
              const attendeeNames =
                ev.attendees
                  ?.map((a) => getAttendeeName(a) || getAttendeeEmail(a))
                  .filter(Boolean)
                  .join(", ") || "";
              return (
                <div
                  key={ev.id}
                  className="d-flex align-items-center gap-3 px-4 py-3"
                  style={{ borderBottom: "1px solid #f0f2f5" }}
                >
                  <div
                    style={{
                      minWidth: 44,
                      height: 44,
                      borderRadius: 10,
                      background: "linear-gradient(135deg, #321fdb, #5b5ea6)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.62rem",
                        fontWeight: 600,
                        lineHeight: 1,
                      }}
                    >
                      {format(start, "MMM").toUpperCase()}
                    </div>
                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      {format(start, "d")}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      className="fw-600"
                      style={{ fontSize: "0.88rem", color: "#1a1f36" }}
                    >
                      {ev.subject}
                    </div>
                    <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                      {formatEventTime(ev.start)} ·{" "}
                      {ev.location?.displayName || "No location"}
                      {attendeeNames ? ` · ${attendeeNames}` : ""}
                    </div>
                  </div>
                  <div className="d-flex gap-1 flex-wrap">
                    <CButton
                      color="light"
                      size="sm"
                      onClick={() => openViewModal(ev)}
                    >
                      View
                    </CButton>
                    <CButton
                      color="primary"
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModalFromEvent(ev)}
                    >
                      Edit
                    </CButton>
                  </div>
                </div>
              );
            })}
          </CCardBody>
        </CCard>
      )}

      {/* Event modal — create / view / edit */}
      <CModal
        backdrop="static"
        visible={Boolean(modalMode)}
        onClose={closeModal}
        size="xl"
        scrollable
      >
        <CModalHeader>
          <CModalTitle>
            {modalMode === "create" && (
              <>
                Create Event{" "}
                {selectedDay && `· ${format(selectedDay, "MMM d, yyyy")}`}
              </>
            )}
            {modalMode === "view" && "Event Details"}
            {modalMode === "edit" && "Edit Event"}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {eventLoading && modalMode === "view" ? (
            <div className="text-center py-4">
              <CSpinner />
            </div>
          ) : modalMode === "view" && activeEvent ? (
            <>
              {activeEvent.isCancelled && (
                <CAlert color="warning" className="mb-3">
                  This event has been cancelled.
                </CAlert>
              )}
              <div className="mb-3">
                <div
                  className="text-muted mb-1"
                  style={{ fontSize: "0.78rem" }}
                >
                  Subject
                </div>
                <div className="fw-600" style={{ fontSize: "1rem" }}>
                  {activeEvent.subject}
                </div>
              </div>
              <div className="mb-3">
                <div
                  className="text-muted mb-1"
                  style={{ fontSize: "0.78rem" }}
                >
                  When
                </div>
                <div style={{ fontSize: "0.92rem" }}>
                  {format(parseEventDateTime(activeEvent.start), "PPP")} ·{" "}
                  {formatEventTime(activeEvent.start)} –{" "}
                  {formatEventTime(activeEvent.end)}
                </div>
              </div>
              <div className="mb-3">
                <div
                  className="text-muted mb-1"
                  style={{ fontSize: "0.78rem" }}
                >
                  Location
                </div>
                <div style={{ fontSize: "0.92rem" }}>
                  {activeEvent.location?.displayName || "No location"}
                </div>
              </div>
              {activeEvent.attendees?.length > 0 && (
                <div className="mb-3">
                  <div
                    className="text-muted mb-1"
                    style={{ fontSize: "0.78rem" }}
                  >
                    Invitees
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {activeEvent.attendees.map((attendee) => {
                      const email = getAttendeeEmail(attendee);
                      return (
                        <CBadge
                          key={email || getAttendeeName(attendee)}
                          color="secondary"
                        >
                          {getAttendeeName(attendee) || email}
                        </CBadge>
                      );
                    })}
                  </div>
                </div>
              )}
              {(activeEvent.body?.content || activeEvent.bodyPreview) && (
                <div className="mb-3">
                  <div
                    className="text-muted mb-1"
                    style={{ fontSize: "0.78rem" }}
                  >
                    Description
                  </div>
                  <div style={{ fontSize: "0.92rem", whiteSpace: "pre-wrap" }}>
                    {stripHtml(activeEvent.body?.content) ||
                      activeEvent.bodyPreview}
                  </div>
                </div>
              )}
              {activeEvent.onlineMeeting?.joinUrl && (
                <div className="mb-3">
                  <div
                    className="text-muted mb-1"
                    style={{ fontSize: "0.78rem" }}
                  >
                    Teams meeting
                  </div>
                  <a
                    href={activeEvent.onlineMeeting.joinUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Join meeting
                  </a>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-3">
                <CFormLabel>Subject *</CFormLabel>
                <CFormInput
                  value={form.subject}
                  onChange={(e) => updateForm({ subject: e.target.value })}
                  placeholder="Meeting title"
                />
              </div>
              <CRow className="g-2 mb-3">
                <CCol>
                  <CFormLabel>Start Time *</CFormLabel>
                  <CFormInput
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => updateForm({ startTime: e.target.value })}
                  />
                </CCol>
                <CCol>
                  <CFormLabel>End Time *</CFormLabel>
                  <CFormInput
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => updateForm({ endTime: e.target.value })}
                  />
                </CCol>
              </CRow>
              <div className="mb-3">
                <CFormLabel>Time Zone</CFormLabel>
                <CFormSelect
                  value={form.timeZone}
                  onChange={(e) => updateForm({ timeZone: e.target.value })}
                >
                  {TIME_ZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </CFormSelect>
                <div
                  className="text-muted mt-1"
                  style={{ fontSize: "0.78rem" }}
                >
                  Times above are saved in the selected timezone (default IST).
                </div>
              </div>
              <div className="mb-3">
                <CFormLabel>Invitees</CFormLabel>
                <div
                  className="text-muted mb-2"
                  style={{ fontSize: "0.78rem" }}
                >
                  {inviteeHelpText}
                </div>

                {selectedAttendees.length > 0 && (
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    {selectedAttendees.map((person) => (
                      <CBadge
                        key={person.email}
                        color="primary"
                        className="employee-chip"
                        style={{ cursor: "pointer" }}
                        onClick={() => toggleAttendee(person)}
                        title="Click to remove"
                      >
                        {person.name || person.email} ×
                      </CBadge>
                    ))}
                  </div>
                )}

                <CFormInput
                  className="mb-2"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canAddExternalGuest) {
                      e.preventDefault();
                      addExternalGuest(searchEmailCandidate);
                    }
                  }}
                  placeholder={
                    isGmailMailbox
                      ? "Search org users or type an email to invite..."
                      : "Search by name or email..."
                  }
                />

                <div className="employee-picker-list">
                  {canAddExternalGuest && (
                    <div
                      className="employee-picker-item"
                      role="button"
                      tabIndex={0}
                      onClick={() => addExternalGuest(searchEmailCandidate)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          addExternalGuest(searchEmailCandidate);
                        }
                      }}
                    >
                      <CFormCheck checked={false} readOnly tabIndex={-1} />
                      <div className="employee-picker-meta">
                        <div className="fw-600" style={{ fontSize: "0.86rem" }}>
                          Invite {searchEmailCandidate}
                        </div>
                        <div
                          className="text-muted"
                          style={{ fontSize: "0.76rem" }}
                        >
                          External guest (not in organization directory)
                        </div>
                      </div>
                    </div>
                  )}
                  {employeesLoading ? (
                    <div className="text-center py-3">
                      <CSpinner size="sm" />
                    </div>
                  ) : employees.length === 0 && !canAddExternalGuest ? (
                    <div
                      className="text-muted text-center py-3"
                      style={{ fontSize: "0.84rem" }}
                    >
                      {isGmailMailbox
                        ? "No matches. Type a full email address above to invite an external guest."
                        : "No employees found"}
                    </div>
                  ) : (
                    employees.map((employee) => (
                      <div
                        key={employee.id || employee.email}
                        className="employee-picker-item"
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleAttendee(employee)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleAttendee(employee);
                          }
                        }}
                      >
                        <CFormCheck
                          checked={isAttendeeSelected(employee.email)}
                          readOnly
                          tabIndex={-1}
                          style={{ pointerEvents: "none" }}
                        />
                        <div className="employee-picker-meta">
                          <div
                            className="fw-600"
                            style={{ fontSize: "0.86rem" }}
                          >
                            {employee.name}
                          </div>
                          <div
                            className="text-muted"
                            style={{ fontSize: "0.76rem" }}
                          >
                            {employee.email}
                            {employee.jobTitle ? ` · ${employee.jobTitle}` : ""}
                            {employee.department
                              ? ` · ${employee.department}`
                              : ""}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <CFormInput
                  className="mt-2"
                  value={form.manualAttendees}
                  onChange={(e) =>
                    updateForm({ manualAttendees: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isValidEmail(e.target.value)) {
                      e.preventDefault();
                      addExternalGuest(e.target.value);
                      updateForm({ manualAttendees: "" });
                    }
                  }}
                  placeholder="Or add emails (comma-separated), e.g. vishwajeettaypro@gmail.com"
                />
              </div>
              <div className="mb-3">
                <CFormLabel>Location</CFormLabel>
                <CFormInput
                  value={form.location}
                  onChange={(e) => updateForm({ location: e.target.value })}
                  placeholder="Conference room, Teams link, etc."
                />
              </div>
              <div className="mb-3">
                <CFormLabel>Description</CFormLabel>
                <CFormTextarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => updateForm({ description: e.target.value })}
                  placeholder="Optional agenda or notes"
                />
              </div>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            className="btn btn-light"
            size="sm"
            onClick={closeModal}
            disabled={submitting}
          >
            Close
          </CButton>

          {modalMode === "view" && activeEvent && (
            <>
              {!activeEvent.isCancelled && (
                <>
                  <CButton
                    className="btn btn-warning"
                    size="sm"
                    onClick={() => openEditModal()}
                    disabled={submitting || eventLoading}
                  >
                    Edit
                  </CButton>
                  <CButton
                    className="btn btn-danger text-white"
                    size="sm"
                    onClick={handleDeleteEvent}
                    disabled={submitting}
                  >
                    {submitting ? <CSpinner size="sm" /> : "Delete Event"}
                  </CButton>
                  <CButton
                    className="btn btn-danger text-white"
                    size="sm"
                    onClick={handleCancelEvent}
                    disabled={submitting}
                  >
                    {submitting ? <CSpinner size="sm" /> : "Cancel Event"}
                  </CButton>
                </>
              )}
            </>
          )}
          {(modalMode === "create" || modalMode === "edit") && (
            <CButton
              className="btn btn-primary"
              size="sm"
              onClick={handleSave}
              disabled={submitting}
            >
              {submitting ? (
                <CSpinner size="sm" />
              ) : modalMode === "edit" ? (
                "Save Changes"
              ) : (
                "📅 Create Event"
              )}
            </CButton>
          )}
        </CModalFooter>
      </CModal>
    </>
  );
}
