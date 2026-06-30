import React, { useState, useEffect, useCallback } from "react";
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
  getOrganizationEmployees,
} from "../services/calendarService";
import { useApp } from "../context/AppContext";
import toast, { Toaster } from "react-hot-toast";
import MailboxSelector from "../components/MailboxSelector";

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

  const clean = String(raw).split(".")[0];
  const timeZone = eventStart?.timeZone || "UTC";

  if (
    timeZone === "UTC" ||
    timeZone === "Etc/UTC" ||
    timeZone === "Etc/GMT"
  ) {
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

const eventToAttendees = (event) =>
  (event.attendees || [])
    .map((attendee) => ({
      email: attendee.emailAddress?.address,
      name: attendee.emailAddress?.name || attendee.emailAddress?.address,
    }))
    .filter((attendee) => attendee.email);

const parseAttendees = (value) =>
  value
    .split(/[,;\n]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((email) => ({ email }));

const mergeAttendees = (selected, manualText) => {
  const map = new Map();

  selected.forEach((person) => {
    if (person.email) {
      map.set(person.email.toLowerCase(), {
        email: person.email,
        name: person.name || person.email.split("@")[0],
      });
    }
  });

  parseAttendees(manualText).forEach((person) => {
    map.set(person.email.toLowerCase(), person);
  });

  return Array.from(map.values());
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const { userEmail } = useApp();
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
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [form, setForm] = useState({
    subject: "",
    startTime: "",
    endTime: "",
    location: "",
    description: "",
    manualAttendees: "",
    timeZone: DEFAULT_TIME_ZONE,
  });

  const loadEmployees = useCallback(async (search = "") => {
    setEmployeesLoading(true);
    try {
      const data = await getOrganizationEmployees(search);
      const list = (data.employees || []).filter(
        (employee) =>
          employee.email?.toLowerCase() !== userEmail?.toLowerCase(),
      );
      setEmployees(list);
    } catch (err) {
      toast.error(err.message || "Failed to load employees");
      setEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  }, [userEmail]);

  const fetchEvents = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    try {
      const start = startOfMonth(currentDate).toISOString();
      const end = endOfMonth(currentDate).toISOString();
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
    setActiveEvent(null);
    setForm({
      subject: "",
      startTime: format(startDT, "yyyy-MM-dd'T'HH:mm"),
      endTime: format(endDT, "yyyy-MM-dd'T'HH:mm"),
      location: "",
      description: "",
      manualAttendees: "",
      timeZone: DEFAULT_TIME_ZONE,
    });
    setSelectedAttendees([]);
    setEmployeeSearch("");
    setModalMode("create");
  };

  const openViewModal = async (event, e) => {
    e?.stopPropagation();
    if (!event?.id || !userEmail) return;

    setModalMode("view");
    setActiveEvent(event);
    setEventLoading(true);

    try {
      const data = await getCalendarEvent(userEmail, event.id);
      setActiveEvent(data.event || event);
    } catch (err) {
      toast.error(err.message || "Failed to load event details");
    } finally {
      setEventLoading(false);
    }
  };

  const openEditModal = (event = activeEvent) => {
    if (!event) return;
    setActiveEvent(event);
    setForm(eventToForm(event));
    setSelectedAttendees(eventToAttendees(event));
    setEmployeeSearch("");
    setModalMode("edit");
  };

  const openEditModalFromEvent = async (event) => {
    if (!event?.id || !userEmail) return;

    setEventLoading(true);
    try {
      const data = await getCalendarEvent(userEmail, event.id);
      const fullEvent = data.event || event;
      openEditModal(fullEvent);
    } catch (err) {
      toast.error(err.message || "Failed to load event details");
    } finally {
      setEventLoading(false);
    }
  };

  const toggleAttendee = (employee) => {
    setSelectedAttendees((prev) => {
      const exists = prev.some(
        (item) => item.email.toLowerCase() === employee.email.toLowerCase(),
      );
      if (exists) {
        return prev.filter(
          (item) => item.email.toLowerCase() !== employee.email.toLowerCase(),
        );
      }
      return [
        ...prev,
        { email: employee.email, name: employee.name || employee.email },
      ];
    });
  };

  const isAttendeeSelected = (email) =>
    selectedAttendees.some(
      (item) => item.email.toLowerCase() === email.toLowerCase(),
    );

  const buildEventPayload = () => {
    const attendees = mergeAttendees(selectedAttendees, form.manualAttendees);
    return {
      subject: form.subject,
      startTime: toGraphDateTime(form.startTime),
      endTime: toGraphDateTime(form.endTime),
      timeZone: form.timeZone,
      location: form.location,
      description: form.description,
      attendees,
      isReminderOn: true,
    };
  };

  const handleSave = async () => {
    if (!form.subject || !form.startTime || !form.endTime) {
      return toast.error("Subject, start time and end time are required");
    }

    setSubmitting(true);
    try {
      const payload = buildEventPayload();

      if (modalMode === "edit" && activeEvent?.id) {
        await updateCalendarEvent(userEmail, activeEvent.id, payload);
        toast.success("Event updated!");
      } else {
        await createCalendarEvent(userEmail, payload);
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
      await cancelCalendarEvent(userEmail, activeEvent.id);
      toast.success("Event cancelled");
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
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h4 className="fw-700 mb-1" style={{ color: "#1a1f36" }}>
            Calendar
          </h4>
          <p className="text-muted mb-0" style={{ fontSize: "0.88rem" }}>
            View and manage Outlook calendar events
          </p>
          <MailboxSelector className="mt-2" showLabel={false} />
        </div>
        <div className="d-flex gap-2">
          <CButton
            color="light"
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
            color="light"
            size="sm"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            ›
          </CButton>
          <CButton
            className="btn-ai"
            size="sm"
            onClick={fetchEvents}
            disabled={loading || !userEmail}
          >
            {loading ? <CSpinner size="sm" /> : "🔄 Refresh"}
          </CButton>
        </div>
      </div>

      {!userEmail && (
        <div className="alert alert-warning mb-4" style={{ borderRadius: 10 }}>
          ⚠️ Connect a mailbox in Settings to load calendar events.
        </div>
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
                  ?.map((a) => a.emailAddress?.name || a.emailAddress?.address)
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
      <CModal visible={Boolean(modalMode)} onClose={closeModal} size="lg">
        <CModalHeader>
          <CModalTitle>
            {modalMode === "create" && (
              <>Create Event {selectedDay && `· ${format(selectedDay, "MMM d, yyyy")}`}</>
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
                <div className="text-muted mb-1" style={{ fontSize: "0.78rem" }}>
                  Subject
                </div>
                <div className="fw-600" style={{ fontSize: "1rem" }}>
                  {activeEvent.subject}
                </div>
              </div>
              <div className="mb-3">
                <div className="text-muted mb-1" style={{ fontSize: "0.78rem" }}>
                  When
                </div>
                <div style={{ fontSize: "0.92rem" }}>
                  {format(parseEventDateTime(activeEvent.start), "PPP")} ·{" "}
                  {formatEventTime(activeEvent.start)} –{" "}
                  {formatEventTime(activeEvent.end)}
                </div>
              </div>
              <div className="mb-3">
                <div className="text-muted mb-1" style={{ fontSize: "0.78rem" }}>
                  Location
                </div>
                <div style={{ fontSize: "0.92rem" }}>
                  {activeEvent.location?.displayName || "No location"}
                </div>
              </div>
              {activeEvent.attendees?.length > 0 && (
                <div className="mb-3">
                  <div className="text-muted mb-1" style={{ fontSize: "0.78rem" }}>
                    Invitees
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {activeEvent.attendees.map((attendee) => (
                      <CBadge key={attendee.emailAddress?.address} color="secondary">
                        {attendee.emailAddress?.name || attendee.emailAddress?.address}
                      </CBadge>
                    ))}
                  </div>
                </div>
              )}
              {(activeEvent.body?.content || activeEvent.bodyPreview) && (
                <div className="mb-3">
                  <div className="text-muted mb-1" style={{ fontSize: "0.78rem" }}>
                    Description
                  </div>
                  <div style={{ fontSize: "0.92rem", whiteSpace: "pre-wrap" }}>
                    {stripHtml(activeEvent.body?.content) || activeEvent.bodyPreview}
                  </div>
                </div>
              )}
              {activeEvent.onlineMeeting?.joinUrl && (
                <div className="mb-3">
                  <div className="text-muted mb-1" style={{ fontSize: "0.78rem" }}>
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
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Meeting title"
            />
          </div>
          <CRow className="g-2 mb-3">
            <CCol>
              <CFormLabel>Start Time *</CFormLabel>
              <CFormInput
                type="datetime-local"
                value={form.startTime}
                onChange={(e) =>
                  setForm({ ...form, startTime: e.target.value })
                }
              />
            </CCol>
            <CCol>
              <CFormLabel>End Time *</CFormLabel>
              <CFormInput
                type="datetime-local"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </CCol>
          </CRow>
          <div className="mb-3">
            <CFormLabel>Time Zone</CFormLabel>
            <CFormSelect
              value={form.timeZone}
              onChange={(e) => setForm({ ...form, timeZone: e.target.value })}
            >
              {TIME_ZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </CFormSelect>
            <div className="text-muted mt-1" style={{ fontSize: "0.78rem" }}>
              Times above are saved in the selected timezone (default IST).
            </div>
          </div>
          <div className="mb-3">
            <CFormLabel>Invitees</CFormLabel>
            <div className="text-muted mb-2" style={{ fontSize: "0.78rem" }}>
              Select employees from your organization. Invites are sent to their
              work email.
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
              placeholder="Search by name or email..."
            />

            <div className="employee-picker-list">
              {employeesLoading ? (
                <div className="text-center py-3">
                  <CSpinner size="sm" />
                </div>
              ) : employees.length === 0 ? (
                <div className="text-muted text-center py-3" style={{ fontSize: "0.84rem" }}>
                  No employees found
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
                    />
                    <div className="employee-picker-meta">
                      <div className="fw-600" style={{ fontSize: "0.86rem" }}>
                        {employee.name}
                      </div>
                      <div className="text-muted" style={{ fontSize: "0.76rem" }}>
                        {employee.email}
                        {employee.jobTitle ? ` · ${employee.jobTitle}` : ""}
                        {employee.department ? ` · ${employee.department}` : ""}
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
                setForm({ ...form, manualAttendees: e.target.value })
              }
              placeholder="Or add extra emails (comma-separated)"
            />
          </div>
          <div className="mb-3">
            <CFormLabel>Location</CFormLabel>
            <CFormInput
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Conference room, Teams link, etc."
            />
          </div>
          <div className="mb-3">
            <CFormLabel>Description</CFormLabel>
            <CFormTextarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Optional agenda or notes"
            />
          </div>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="light" onClick={closeModal} disabled={submitting}>
            Close
          </CButton>
          {modalMode === "view" && activeEvent && !activeEvent.isCancelled && (
            <>
              <CButton
                color="danger"
                variant="outline"
                onClick={handleCancelEvent}
                disabled={submitting}
              >
                {submitting ? <CSpinner size="sm" /> : "Cancel Event"}
              </CButton>
              <CButton color="primary" onClick={() => openEditModal()} disabled={submitting}>
                Edit
              </CButton>
            </>
          )}
          {(modalMode === "create" || modalMode === "edit") && (
            <CButton className="btn-ai" onClick={handleSave} disabled={submitting}>
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
