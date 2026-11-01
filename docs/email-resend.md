# Transactional email with Resend

The application uses an `EmailProvider` behind `EmailService`. In development set `EMAIL_PROVIDER=console`; delivery is logged without requiring a domain or API key. Production uses `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`, and `RESEND_WEBHOOK_SECRET`. Business notifications remain in-app; email failures are recorded in `email_outbox` and do not roll back unrelated business work.

## Resend setup

1. Create a Resend account and project, then add the system domain (for example `notify.example.edu.vn`).
2. Add every DNS record shown by Resend: SPF and DKIM records are mandatory. Publish a DMARC TXT record such as `v=DMARC1; p=quarantine; rua=mailto:dmarc@example.edu.vn` after confirming the reporting mailbox.
3. Wait for domain verification and create a restricted API key for the production environment.
4. Set `EMAIL_FROM="MeritTrack <noreply@notify.example.edu.vn>"` and `EMAIL_PROVIDER=resend` in the host's secret manager, never in Git.
5. Add a Resend webhook pointing to `https://your-domain/api/webhooks/resend`; subscribe to sent, delivered, bounced, complained, opened, and clicked. Copy its signing secret to `RESEND_WEBHOOK_SECRET`.
6. Request a password-reset code and verify the Resend dashboard plus `email_outbox`. The webhook signature is verified with Svix before any status is written.
