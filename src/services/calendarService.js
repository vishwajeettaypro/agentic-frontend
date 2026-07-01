import api from '../config/api';

const pickFirstNonEmptyInviteeList = (...candidates) => {
  for (const value of candidates) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim()) return value;
    if (Array.isArray(value) && value.length > 0) return value;
  }
  return [];
};

const resolveInviteeSource = (eventDetails = {}, extras = {}) =>
  pickFirstNonEmptyInviteeList(
    eventDetails.attendees,
    extras.attendees,
    eventDetails.guestList,
    extras.guestList,
    eventDetails.invitees,
    extras.invitees,
    eventDetails.guests,
    eventDetails.guestEmails,
  );

const normalizeInviteeList = (items = []) => {
  const list = Array.isArray(items) ? items : [items];

  return list
    .map((person) => {
      if (typeof person === 'string') {
        const email = person.trim().toLowerCase();
        if (!email.includes('@')) return null;
        return { email, name: email.split('@')[0] };
      }

      const email = String(
        person?.email ||
          person?.emailAddress?.address ||
          person?.mail ||
          person?.address ||
          '',
      )
        .trim()
        .toLowerCase();

      if (!email.includes('@')) return null;

      return {
        email,
        name:
          person?.name ||
          person?.displayName ||
          person?.emailAddress?.name ||
          email.split('@')[0],
      };
    })
    .filter(Boolean);
};

const withInvitees = (eventDetails = {}, extras = {}) => {
  const raw = resolveInviteeSource(eventDetails, extras);
  const items =
    typeof raw === 'string'
      ? raw
          .split(/[,;\n]+/)
          .map((entry) => entry.trim())
          .filter(Boolean)
      : Array.isArray(raw)
        ? raw
        : [raw];
  const attendees = normalizeInviteeList(items);
  return {
    ...eventDetails,
    attendees,
    guestList: attendees,
    invitees: attendees,
  };
};

export const getCalendarEvents = (userEmail, startDate, endDate) =>
  api.post('/calendar/events/list', { userEmail, startDate, endDate }).then((r) => r.data);

export const getCalendarEvent = (userEmail, eventId, calendarId) =>
  api.post('/calendar/events/get', { userEmail, eventId, calendarId }).then((r) => r.data);

export const createCalendarEvent = (userEmail, eventDetails) => {
  const normalizedDetails = withInvitees(eventDetails);

  return api
    .post('/calendar/events/create', {
      userEmail,
      eventDetails: normalizedDetails,
      attendees: normalizedDetails.attendees,
    })
    .then((r) => r.data);
};

export const updateCalendarEvent = (userEmail, eventId, eventDetails, calendarId) => {
  const normalizedDetails = withInvitees(eventDetails);

  return api
    .post('/calendar/events/update', {
      userEmail,
      eventId,
      calendarId,
      eventDetails: normalizedDetails,
      attendees: normalizedDetails.attendees,
    })
    .then((r) => r.data);
};

export const cancelCalendarEvent = (userEmail, eventId, comment = '', calendarId) =>
  api.post('/calendar/events/cancel', { userEmail, eventId, comment, calendarId }).then((r) => r.data);

export const deleteCalendarEvent = (userEmail, eventId, calendarId) =>
  api.post('/calendar/events/delete', { userEmail, eventId, calendarId }).then((r) => r.data);

export const getOrganizationEmployees = (search = '', userEmail = '') =>
  api.post('/calendar/organization/employees', { search, userEmail }).then((r) => r.data);
