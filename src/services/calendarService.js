import api from '../config/api';

export const getCalendarEvents = (userEmail, startDate, endDate) =>
  api.post('/calendar/events/list', { userEmail, startDate, endDate }).then((r) => r.data);

export const getCalendarEvent = (userEmail, eventId) =>
  api.post('/calendar/events/get', { userEmail, eventId }).then((r) => r.data);

export const createCalendarEvent = (userEmail, eventDetails) =>
  api.post('/calendar/events/create', { userEmail, eventDetails }).then((r) => r.data);

export const updateCalendarEvent = (userEmail, eventId, eventDetails) =>
  api.post('/calendar/events/update', { userEmail, eventId, eventDetails }).then((r) => r.data);

export const cancelCalendarEvent = (userEmail, eventId, comment = '') =>
  api.post('/calendar/events/cancel', { userEmail, eventId, comment }).then((r) => r.data);

export const getOrganizationEmployees = (search = '') =>
  api.post('/calendar/organization/employees', { search }).then((r) => r.data);
