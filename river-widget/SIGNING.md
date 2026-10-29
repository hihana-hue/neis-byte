# CHOI RIVER release signing

The package remains `kr.co.marihome.riverwidget`. Version 1.23 is versionCode 24.
Old CI debug builds used different keys. An old debug installation normally needs a one-time uninstall before installing the first persistent-key release. Notion records are unaffected; local widget connection and appearance must be configured again.

## One-time owner setup on Windows

Install JDK 17 (keytool) and GitHub CLI (gh). Run `gh auth login` with the repository owner's account, then download and run `scripts/setup-signing.ps1`. Review the script before running it.

The script generates a password-protected PKCS12 key under Documents/CHOI-RIVER-signing-private, restricts folder permissions, registers four GitHub Actions secrets over stdin, and starts the build. It refuses to replace a registered key if its local backup is missing. The password is entered without echo and must be kept separately in a password manager. Keep a second encrypted backup outside this PC. Do not put the key/password in this public repository, release assets, chat, logs, or workflow artifacts.

Secrets: RIVER_SIGNING_KEY_B64, RIVER_SIGNING_PASSWORD, RIVER_SIGNING_ALIAS, RIVER_SIGNING_SHA256. Base64 is encoding, not encryption; GitHub Secrets protects the stored value. Workflow execution remains a trust boundary: protect main and the owner account, use 2FA, review workflow changes, and never run untrusted PR code with signing secrets.

The CI builds and tests without signing secrets, signs in a separate step, verifies the expected certificate fingerprint, and publishes only signed release APKs. Missing secrets skip publishing rather than creating another temporary key. Existing releases are immutable; increment versionCode, versionName and workflow asset/tag names for each update. The update button opens the official release list; it does not silently install packages or require additional installation permissions.

## Acceptance check before migration

Install the first signed APK on a test device, set appearance and connect. Build a higher-version APK with the same key. Confirm Android shows Update, local connection/settings remain, today uses Seoul dates for school and academy, and no notification/alarm permissions are added. APK signing and unit tests cannot replace this device test.

