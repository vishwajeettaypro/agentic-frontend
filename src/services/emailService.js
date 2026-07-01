import api from '../config/api';

// POST /api/v1/email/emails — body: { userEmail }
export const getEmails = (userEmail) =>
  api.post('/email/emails', { userEmail }).then((r) => r.data);

export const downloadEmailAttachment = (
  userEmail,
  messageId,
  attachmentId,
  fileName,
  mimeType,
) =>
  api
    .post(
      '/email/attachments/download',
      { userEmail, messageId, attachmentId, fileName, mimeType },
      { responseType: 'blob' },
    )
    .then((response) => {
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'attachment';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return true;
    });

// POST /api/v1/email/generate-reply — body: { userEmail, messageId }
export const generateReply = (userEmail, messageId) =>
  api.post('/email/generate-reply', { userEmail, messageId }).then((r) => r.data);

// POST /api/v1/email/create-and-send — body: { userEmail, messageId, replyText, autoReply }
export const createAndSendEmail = (userEmail, messageId, replyText, autoReply = true) =>
  api.post('/email/create-and-send', { userEmail, messageId, replyText, autoReply }).then((r) => r.data);

// POST /api/v1/email/send-reply — body: { emailRecordId }
export const sendGeneratedReply = (emailRecordId) =>
  api.post('/email/send-reply', { emailRecordId }).then((r) => r.data);

// GET /api/v1/email/history?userEmail=...
export const getEmailHistory = (userEmail) =>
  api.get('/email/history', { params: { userEmail } }).then((r) => r.data);

// GET /api/v1/email/preferences?userEmail=...
export const getUserPreferences = (userEmail) =>
  api.get('/email/preferences', { params: { userEmail } }).then((r) => r.data);

// PUT /api/v1/email/preferences — body: { userEmail, replyTone, autoSend, customTemplate }
export const updateUserPreferences = (data) =>
  api.put('/email/preferences', data).then((r) => r.data);

// GET /api/v1/email/statistics?userEmail=...
export const getEmailStatistics = (userEmail) =>
  api.get('/email/statistics', { params: { userEmail } }).then((r) => r.data);

// DELETE /api/v1/email/record/:id
export const deleteEmailRecord = (emailRecordId) =>
  api.delete(`/email/record/${emailRecordId}`).then((r) => r.data);
