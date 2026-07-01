import api from '../config/api';

export const getMessagingStatus = (userId) =>
  api.get('/user-details/messaging/status', { params: { userId } }).then((r) => r.data);

export const generateTelegramLinkCode = (userId) =>
  api.post('/user-details/messaging/telegram/link-code', { userId }).then((r) => r.data);

export const unlinkTelegram = (userId) =>
  api.post('/user-details/messaging/telegram/unlink', { userId }).then((r) => r.data);

export const testTelegramMessage = (userId) =>
  api.post('/user-details/messaging/telegram/test', { userId }).then((r) => r.data);

export const testWhatsAppMessage = (userId) =>
  api.post('/user-details/messaging/whatsapp/test', { userId }).then((r) => r.data);
