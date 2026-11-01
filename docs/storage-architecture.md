# Private evidence storage

MeritTrack stores only file metadata and logical object keys in MySQL. Evidence is never public and is always read through `/api/submissions/files/[id]`, where MeritTrack first checks the owner, administrator, correct class officer, or assigned faculty officer.

`STORAGE_PROVIDER=local` is the development default and writes UUID-named objects outside `public/`. `STORAGE_PROVIDER=onedrive` uses Microsoft Graph with an application identity and a private OneDrive for Business or SharePoint document-library drive. Neither provider creates sharing links or persists a public URL.

## Microsoft Graph / OneDrive setup

1. In Microsoft Entra admin center, create an App registration and copy **Directory (tenant) ID** and **Application (client) ID**.
2. Create a client secret, copy its value once, and store it only in the hosting environment.
3. In API permissions add Microsoft Graph **Application** permission `Sites.Selected`, then grant admin consent. For a simpler initial test, `Files.ReadWrite.All` works but is broader than necessary.
4. Grant the app write access to the selected SharePoint site (preferred) with Microsoft Graph/PowerShell, then find the site ID using `GET /sites/{hostname}:/sites/{path}` and its document-library drive ID using `GET /sites/{site-id}/drives`.
5. Create a `MeritTrack/evidence` folder in that drive. Set `MICROSOFT_DRIVE_ID` and optionally `MICROSOFT_STORAGE_ROOT`.
6. Set `STORAGE_PROVIDER=onedrive`, `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_SITE_ID`, and `MICROSOFT_DRIVE_ID` in hosting secrets. Only `DRIVE_ID` is used by the provider; `SITE_ID` documents the permission boundary.
7. Upload and download evidence through MeritTrack, then test each permitted role and an unauthorized account. Run `npm run storage:migrate-onedrive` only after those checks; it verifies remote size and retains every local copy.

Microsoft variables are validated only when OneDrive is selected, so local development and builds require no Microsoft credentials.
