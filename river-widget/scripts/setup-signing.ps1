# Run on the owner's Windows PC. Never upload the backup folder to a public repository.
$ErrorActionPreference = 'Stop'
$repo = 'hihana-hue/neis-byte'
Get-Command gh -ErrorAction Stop | Out-Null
Get-Command keytool -ErrorAction Stop | Out-Null
gh auth status
if ($LASTEXITCODE -ne 0) { throw 'Run gh auth login first.' }
$folder = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'CHOI-RIVER-signing-private'
$key = Join-Path $folder 'river-release.p12'
$existing = gh secret list --repo $repo --json name --jq '.[].name'
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect repository secret names.' }
if (($existing -contains 'RIVER_SIGNING_KEY_B64') -and !(Test-Path $key)) { throw 'A signing key is already registered. Restore its backup; do not generate a replacement.' }
New-Item -ItemType Directory -Force $folder | Out-Null
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
icacls $folder /inheritance:r /grant:r "${identity}:(OI)(CI)F" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Cannot restrict backup folder permissions.' }
$secure = Read-Host 'Enter the signing-key password (12+ characters); retain it in your password manager' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
 $env:RIVER_KEY_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
 if ($env:RIVER_KEY_PASSWORD.Length -lt 12) { throw 'Use at least 12 characters.' }
 if (!(Test-Path $key)) {
  keytool -genkeypair -keystore $key -storetype PKCS12 -alias river -keyalg RSA -keysize 3072 -validity 12000 -dname 'CN=CHOI RIVER Android, O=MARI EDU LAB, C=KR' -storepass:env RIVER_KEY_PASSWORD -keypass:env RIVER_KEY_PASSWORD
  if ($LASTEXITCODE -ne 0) { throw 'Key generation failed.' }
 }
 $cert = Join-Path $folder 'river-public.cer'
 keytool -exportcert -keystore $key -alias river -file $cert -storepass:env RIVER_KEY_PASSWORD
 if ($LASTEXITCODE -ne 0) { throw 'Cannot read key. Check the password.' }
 $digest = [Security.Cryptography.SHA256]::Create().ComputeHash([IO.File]::ReadAllBytes($cert))
 $fingerprint = ([BitConverter]::ToString($digest)).Replace('-','').ToLowerInvariant()
 $values = @{RIVER_SIGNING_KEY_B64=[Convert]::ToBase64String([IO.File]::ReadAllBytes($key));RIVER_SIGNING_PASSWORD=$env:RIVER_KEY_PASSWORD;RIVER_SIGNING_ALIAS='river';RIVER_SIGNING_SHA256=$fingerprint}
 foreach ($name in $values.Keys) {
  $values[$name] | gh secret set $name --repo $repo
  if ($LASTEXITCODE -ne 0) { throw "Secret registration failed: $name. Re-run with the same backup key." }
 }
 Write-Host "Registered. Keep a second secure backup of $key and retain its password separately."
 gh workflow run river-widget-android.yml --repo $repo --ref main
 if ($LASTEXITCODE -ne 0) { throw 'Secrets saved. Start the widget workflow from GitHub Actions.' }
} finally {
 Remove-Item Env:RIVER_KEY_PASSWORD -ErrorAction SilentlyContinue
 if ($values) { $values.Clear() }
 [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}
