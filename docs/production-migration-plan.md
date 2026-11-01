# Production cutover

1. Provision MySQL 8.4 with backups, UTF8MB4, strict SQL modes, encrypted transport, and least-privilege application credentials.
2. Back up SQLite and existing evidence, stop writes, initialize a fresh MySQL database, run the import, and verify the count/checksum report before proceeding.
3. Keep storage local during the first deployment or configure the private OneDrive/SharePoint drive as described in [storage architecture](storage-architecture.md). Test authorized and unauthorized downloads before setting `STORAGE_PROVIDER=onedrive`.
4. Configure Resend as described in [email setup](email-resend.md), including its signed webhook.
5. Set all production secrets in the host secret manager, deploy with `compose.production.yaml`, then smoke-test every role, review round, file upload/replacement/deletion, QR attendance, imports, exports, and role-scoped notifications.
6. Retain the verified backups and local evidence copies through a recovery period.
