# Personal schedules and compact settings — build 43

Display version: 1.30. Internal update version: 43. Package and persistent signing certificate unchanged.

## Notion migration

| Previous | Current |
| --- | --- |
| 학원 수업 기록 | 개인 일정 |
| 수업명 | 일정명 |
| 수업일시 | 일정일시 |
| 학원 | 과목·모임명 |
| 학생 관리표: 학원 DB 링크 | 개인 일정 DB 링크 |
| 디자인: 학원 접두어 | 개인 일정 접두어 |

Add 일정 분류 (학원/교회/약속/기타), 학교 오늘 강조색. Add missing 회차 기준 in Siwon/template. Keep original date property IDs/default reminders by renaming rather than copying dates. Preserve 21 Kang and one Siwon record; common template has no schedule records. Assign TEEN to 교회, actual 약속 to 약속, other existing named classes to 학원. Map 정규 to 수업 before removing the redundant select option. Keep actual subjects, attendance states, anchors, original dates, payment/history fields and formulas.

Update existing views to show categories and correct copied Siwon view names (수학/국어). All-schedule views have no stale empty-subject filter. Default templates use 학원/수업/예정. Academy-only round and attendance flows are separate from personal completion/cancellation.

## Behavior

- Same Seoul date, time changed: PATCH only 일정일시; preserve title, original date, attendance, charge, anchor, history. No next row. Different-date academy makeup remains intact. Other categories date changes do not rename as makeup.
- Feed includes actual title and category, date-only schedules remain visible with 시간 미정.
- School unfinished today/overdue: subject pill → flame → title → date. School accent separate from personal accent; original Notion subject colors unchanged.
- Setup has compact connection/appearance/display/update panels; sliders right of labels without unit captions. Default title18/body14/opacity100 retained. Existing download-list flow and INTERNET-only permission preserved.
- No new periodic design/schema query: renamed property compatibility uses responses already fetched. Design still only initial connection/manual template update.

## Verification

Server regression suites including rename read/write and time-only two-request contract pass. Web DOM tests verify actual personal title/category, flame, no rounds, successful-save close/completion. GitHub run41313243097 passed Android unit tests, release lint/build, only-INTERNET permission check and persistent signing. Compatibility deployment run41313243061 succeeded before Notion renames. One-time migration workflow removed after success; normal server deployment remains manual.

APK SHA-256: 1147caa1a93fd98dedb99d2c195eb746c22ebcceb13df9f167e65ac867d3db2e
Signer SHA-256: af27ec75006a120f029ab21406f08d3796c13d37ac126862f1584f8b59c92292
Direct download: https://www.marihome.co.kr/river/downloads/MARI-EDU-Widget-1.30.43.apk
