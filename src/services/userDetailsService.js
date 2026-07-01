import api from '../config/api';

export const getUserDetails = (userId, mailboxEmail) =>
  api
    .get('/user-details', { params: { userId, ...(mailboxEmail && { mailboxEmail }) } })
    .then((r) => r.data);

export const getOnboardingStatus = (userId) =>
  api.get('/user-details/onboarding/status', { params: { userId } }).then((r) => r.data);

export const connectEmail = (payload) =>
  api.post('/user-details/onboarding/email', payload).then((r) => r.data);

export const completeMailboxSetup = (userId) =>
  api.post('/user-details/onboarding/email/complete', { userId }).then((r) => r.data);

export const saveProfile = (payload) =>
  api.post('/user-details/onboarding/profile', payload).then((r) => r.data);

export const enrichProfileFromCompany = (payload) =>
  api.post('/user-details/onboarding/profile/enrich', payload).then((r) => r.data);

export const updateMessaging = (payload) =>
  api.patch('/user-details/onboarding/messaging', payload).then((r) => r.data);

export const skipMessaging = (userId) =>
  api.post('/user-details/onboarding/messaging/skip', { userId }).then((r) => r.data);

export const listConnectedMailboxes = (userId) =>
  api.get('/user-details/mailboxes', { params: { userId } }).then((r) => r.data);

export const disconnectMailbox = (payload) =>
  api.delete('/user-details/mailboxes', { data: payload }).then((r) => r.data);

export const updateMailboxSettings = (payload) =>
  api.patch('/user-details/mailboxes/settings', payload).then((r) => r.data);

export const setPrimaryMailbox = (payload) =>
  api.patch('/user-details/mailboxes/primary', payload).then((r) => r.data);
