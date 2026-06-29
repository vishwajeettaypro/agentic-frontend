import React, { useState, useEffect, useCallback } from 'react';
import {
  CRow, CCol, CCard, CCardBody, CCardHeader, CButton, CSpinner,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CFormInput, CFormTextarea, CFormLabel,
} from '@coreui/react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday, isSameDay,
  addMonths, subMonths
} from 'date-fns';
import { getCalendarEvents, createCalendarEvent } from '../services/calendarService';
import { useApp } from '../context/AppContext';
import toast, { Toaster } from 'react-hot-toast';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const { userEmail } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    startTime: '',
    endTime: '',
    location: '',
    description: '',
  });

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

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate)),
  });

  const getEventsForDay = (day) =>
    events.filter((e) => {
      const start = new Date(e.start?.dateTime || e.start);
      return isSameDay(start, day);
    });

  const openCreateModal = (day) => {
    setSelectedDay(day);
    const startDT = new Date(day);
    startDT.setHours(9, 0, 0);
    const endDT = new Date(day);
    endDT.setHours(10, 0, 0);
    setForm({
      subject: '',
      startTime: format(startDT, "yyyy-MM-dd'T'HH:mm"),
      endTime: format(endDT, "yyyy-MM-dd'T'HH:mm"),
      location: '',
      description: '',
    });
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (!form.subject || !form.startTime || !form.endTime)
      return toast.error('Subject, start time and end time are required');
    setCreating(true);
    try {
      await createCalendarEvent(userEmail, {
        subject: form.subject,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        location: form.location,
        description: form.description,
        isReminderOn: true,
      });
      toast.success('Event created!');
      setShowModal(false);
      fetchEvents();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-700 mb-1" style={{ color: '#1a1f36' }}>Calendar</h4>
          <p className="text-muted mb-0" style={{ fontSize: '0.88rem' }}>View and manage Outlook calendar events</p>
        </div>
        <div className="d-flex gap-2">
          <CButton color="light" size="sm" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>‹</CButton>
          <div className="fw-600 px-2 d-flex align-items-center" style={{ minWidth: 130, justifyContent: 'center' }}>
            {format(currentDate, 'MMMM yyyy')}
          </div>
          <CButton color="light" size="sm" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>›</CButton>
          <CButton className="btn-ai" size="sm" onClick={fetchEvents} disabled={loading || !userEmail}>
            {loading ? <CSpinner size="sm" /> : '🔄 Refresh'}
          </CButton>
        </div>
      </div>

      {!userEmail && (
        <div className="alert alert-warning mb-4" style={{ borderRadius: 10 }}>
          ⚠️ Set your email in Settings to load calendar events.
        </div>
      )}

      <CCard>
        <CCardBody className="p-0">
          {/* Day headers */}
          <div className="calendar-grid" style={{ background: 'transparent', gap: 0, marginBottom: 1 }}>
            {DAYS.map((d) => (
              <div key={d} className="calendar-header-cell">{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div className="calendar-grid" style={{ gap: 1 }}>
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              return (
                <div
                  key={day.toString()}
                  className={`calendar-day${!isSameMonth(day, currentDate) ? ' other-month' : ''}${isToday(day) ? ' today' : ''}`}
                  onClick={() => userEmail && openCreateModal(day)}
                >
                  <div className="day-number">{format(day, 'd')}</div>
                  {dayEvents.slice(0, 3).map((ev, i) => (
                    <div key={i} className="calendar-event" title={ev.subject}>
                      {ev.subject}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div style={{ fontSize: '0.65rem', color: '#6c757d' }}>+{dayEvents.length - 3} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </CCardBody>
      </CCard>

      {/* Upcoming events list */}
      {events.length > 0 && (
        <CCard className="mt-3">
          <CCardHeader>Upcoming Events This Month</CCardHeader>
          <CCardBody className="p-0">
            {events.slice(0, 8).map((ev, i) => {
              const start = new Date(ev.start?.dateTime || ev.start);
              return (
                <div key={i} className="d-flex align-items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #f0f2f5' }}>
                  <div style={{
                    minWidth: 44, height: 44, borderRadius: 10,
                    background: 'linear-gradient(135deg, #321fdb, #5b5ea6)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', color: '#fff'
                  }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 600, lineHeight: 1 }}>{format(start, 'MMM').toUpperCase()}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1 }}>{format(start, 'd')}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="fw-600" style={{ fontSize: '0.88rem', color: '#1a1f36' }}>{ev.subject}</div>
                    <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                      {format(start, 'h:mm a')} · {ev.location || 'No location'}
                    </div>
                  </div>
                </div>
              );
            })}
          </CCardBody>
        </CCard>
      )}

      {/* Create Event Modal */}
      <CModal visible={showModal} onClose={() => setShowModal(false)}>
        <CModalHeader>
          <CModalTitle>Create Event {selectedDay && `· ${format(selectedDay, 'MMM d, yyyy')}`}</CModalTitle>
        </CModalHeader>
        <CModalBody>
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
              <CFormInput type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </CCol>
            <CCol>
              <CFormLabel>End Time *</CFormLabel>
              <CFormInput type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </CCol>
          </CRow>
          <div className="mb-3">
            <CFormLabel>Location</CFormLabel>
            <CFormInput value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Conference room, Teams link, etc." />
          </div>
          <div className="mb-3">
            <CFormLabel>Description</CFormLabel>
            <CFormTextarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional agenda or notes" />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="light" onClick={() => setShowModal(false)}>Cancel</CButton>
          <CButton className="btn-ai" onClick={handleCreate} disabled={creating}>
            {creating ? <CSpinner size="sm" /> : '📅 Create Event'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  );
}
