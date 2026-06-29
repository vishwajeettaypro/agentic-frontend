import api from '../config/api';

// POST /api/v1/calendar/events/list — body: { userEmail, startDate?, endDate? }
export const getCalendarEvents = (userEmail, startDate, endDate) =>
  api.post('/calendar/events/list', { userEmail, startDate, endDate }).then((r) => r.data);

// POST /api/v1/calendar/events/create — body: { userEmail, eventDetails }
export const createCalendarEvent = (userEmail, eventDetails) =>
  api.post('/calendar/events/create', { userEmail, eventDetails }).then((r) => r.data);
