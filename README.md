# RideSphere

RideSphere is a static MVP prototype for a Japanese map-based dispatch management PWA.

## App separation

The product is intentionally split into **three separate PWA entry points**. The administrator, driver, and customer do not share one role-switching screen.

- `admin.html` — 管理者アプリ: reservation registration, map monitoring, nearby available driver search, dispatch notification, audit log
- `driver.html` — ドライバーアプリ: driver login, current-location sharing, assignment review, dispatch acceptance, ride completion, emergency reporting
- `customer.html` — 顧客アプリ: customer login, ride request, own reservation status, current-location sharing, emergency reporting
- `index.html` — app selector used only as a launcher during the MVP

The static MVP still stores demo data in browser `localStorage` so that the three apps can demonstrate one shared dispatch flow without a backend. In production, these apps should be deployed as independent frontends or independent PWA scopes backed by authenticated APIs.

## MVP scope

The first release intentionally focuses on a **地図付き配車管理PWA** instead of trying to build every requested back-office function at once.

Implemented MVP flow:

1. 顧客アプリまたは管理者アプリで予約・依頼を登録する
2. ドライバーがドライバー専用PWAでログイン状態を確認する
3. ドライバーまたは管理者が現在地を共有する
4. 管理者が管理者専用PWAの地図で空きドライバー、乗車場所、目的地、ルートを確認する
5. 管理者が近い空きドライバー候補を確認して通知する
6. ドライバーがドライバー専用PWAで配車を承認する
7. ドライバーが運行完了にする
8. 顧客アプリで自分の予約ステータスを確認する

## Included PWA features

- Separate web app manifests for admin, driver, and customer installability
- Service worker asset cache for basic offline display of all three app entry points
- Responsive mobile-first layouts for admin, driver, and customer apps
- Browser geolocation integration with demo fallback locations
- Notification permission flow and service-worker notifications
- Driver and customer emergency notification log prototypes

## Later roadmap

Next recommended milestones:

- Separate production deployment origins or URL scopes for admin, driver, and customer apps
- Authenticated API and database using the proposed tables (`users`, `drivers`, `customers`, `vehicles`, `reservations`, `dispatches`, `driver_locations`, etc.)
- Automatic dispatch assignment using distance, ETA, shift status, vehicle status, nominated booking rules, service area, and break/off-duty status
- Calendar views for reservations, drivers, vehicles, leave, inspections, billing, and tasks
- Task management for administrators and drivers
- Auditable customer, driver, and administrator messaging
- Vehicle trouble and maintenance workflow
- Salary calculation, traffic information alerts, Q&A, PDF export, invoice management

## Local development

```bash
npm run check
npm start
```

Then open <http://localhost:4173> and choose an app.
