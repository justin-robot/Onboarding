# Google Calendar/Meet Integration

**Status**: Not Started

---

## Scope

Google Calendar and Meet integration for TIME_BOOKING task type and workspace meetings.

**This spec covers**:
- Google OAuth 2.0 flow
- Refresh token storage (encrypted)
- Calendar event creation with Meet links
- Meeting list queries

**Out of scope**:
- Time booking UI → `15-task-ui-components.md`
- Calendly/Cal.com integration (deferred to v2)

---

## What's Done

| Item | Status |
|------|--------|
| Database tables (time_booking_config, booking) | ✅ |
| Kysely types | ✅ |
| Google APIs package | ⏳ (needs to be added) |
| Google OAuth flow | ⏳ |

---

## Suggested Tasks

| # | Task | Type | Done When |
|---|------|------|-----------|
| 1 | Add Google APIs package and create OAuth flow | infra | Package installed. OAuth consent screen works. Refresh token stored encrypted. Token refresh works. |
| 2 | Create calendar service for event creation with Meet links | actions | Unit tests pass (mocked API). Event created with auto-generated Meet link. Booking record updated with calendarEventId and meetLink. |
| 3 | Create meeting list query for workspace | actions | Queries Calendar API for workspace member events. Returns upcoming meetings. Handles pagination. |

---

## Technical Notes

- OAuth scopes: calendar.events, calendar.readonly
- Refresh token stored encrypted in database (workspace-level connection)
- Meet links auto-generated via conferenceData in Calendar API
- V1 time booking: manual link entry (admin pastes URL, assignee confirms booking externally)
- Google integration is optional enhancement

---

## References

- Technical spec: `docs/moxo-technical-spec-final.md` (Google Calendar/Meet Integration, Time Booking Task sections)
- Data model: `docs/moxo-data-model-final-v2.md` (TimeBookingConfig, Booking)
