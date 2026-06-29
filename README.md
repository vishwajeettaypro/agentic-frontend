# Agentic AI Frontend

React + CoreUI frontend for the Agentic AI backend (Outlook email + calendar management with Gemini AI).

## Stack

- **React 18** + Create React App
- **CoreUI 5** for UI components & layout
- **react-router-dom v6** for routing
- **axios** for API calls
- **react-hot-toast** for notifications
- **date-fns** for calendar date handling

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure API URL (optional — defaults to http://localhost:5000/api/v1)
# Edit .env:
REACT_APP_API_URL=http://localhost:5000/api/v1

# 3. Start dev server
npm start
# Opens http://localhost:3000
```

## First Steps

1. Open http://localhost:3000
2. Go to **Settings** → enter your Outlook email address
3. Go to **Email** → click "Fetch Inbox" to load emails
4. Click an email → click "Generate AI Reply" → review → Send

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard` | Stats overview + quick actions |
| Email | `/email` | Fetch inbox, generate AI replies, send |
| Calendar | `/calendar` | Month view, create events |
| History | `/history` | All AI-processed email records |
| Settings | `/settings` | Email address + AI preferences |

## API Endpoints Used

```
POST /api/v1/email/emails              — fetch inbox
POST /api/v1/email/generate-reply      — generate AI reply
POST /api/v1/email/create-and-send     — send reply
POST /api/v1/email/send-reply          — send saved reply
GET  /api/v1/email/history             — email history
GET  /api/v1/email/preferences         — user preferences
PUT  /api/v1/email/preferences         — update preferences
GET  /api/v1/email/statistics          — dashboard stats
DEL  /api/v1/email/record/:id          — delete record

POST /api/v1/calendar/events/list      — list events
POST /api/v1/calendar/events/create    — create event
```

## Build for Production

```bash
npm run build
```
Outputs to `/build` folder — deploy to any static host (Vercel, Netlify, Nginx, etc.)
