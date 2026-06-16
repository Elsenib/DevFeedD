# DevFeed əməliyyat kitabçası

Bu fayl DevFeed layihəsində update, deploy, test, Play Store hazırlığı və problem həlli üçün gündəlik komandaları bir yerə yığır.

## Əsas qayda

- `.env`, `server/.env`, API key, database URL, OAuth secret və mail key-ləri heç vaxt GitHub-a push etmə.
- Dəyişiklik etməzdən əvvəl statusa bax:

```powershell
git status --short
```

- Windows PowerShell-də `npm`, `npx` bəzən policy xətası verə bilər. Onda həmişə bunlardan istifadə et:

```powershell
npm.cmd install
npx.cmd expo install --check
npx.cmd eas-cli whoami
```

## Backend

Backend Railway-də işləyir:

```text
https://devfeedd-backend-production.up.railway.app
```

Health yoxlama:

```powershell
Invoke-WebRequest -Uri "https://devfeedd-backend-production.up.railway.app/health" -UseBasicParsing
```

Local backend run:

```powershell
npm.cmd install
npm.cmd run dev
```

Server default olaraq `http://localhost:4000` gözləyir.

## Frontend

Web preview:

```powershell
npm.cmd run web
```

Cache təmizləyərək web:

```powershell
npm.cmd run web:clear
```

Expo telefon test:

```powershell
npx.cmd expo start --tunnel
```

Dependency uyğunluğunu yoxla:

```powershell
npx.cmd expo install --check
```

Uyğunsuz dependency varsa:

```powershell
npx.cmd expo install --fix
```

## Android telefon install

Telefonun qoşulub-qoşulmadığını yoxla:

```powershell
adb devices
```

APK build:

```powershell
cd android
.\gradlew.bat assembleRelease
```

APK install:

```powershell
adb install -r "android\app\build\outputs\apk\release\app-release.apk"
```

Əgər `INSTALL_FAILED_VERIFICATION_FAILURE` çıxsa:

- Telefonda `Security and privacy > Auto Blocker` söndür.
- `Install unknown apps` icazəsində `Files` və ya `My Files` üçün icazə ver.
- `Developer options > Install via USB` aktiv olsun.

Köhnə test app-i silmək:

```powershell
adb uninstall com.yourdomain.devfeedmobile
```

Yeni real package app-i silmək:

```powershell
adb uninstall com.elsenib.devfeed
```

## Play Store build

Play Store üçün APK yox, AAB lazımdır.

Cari package name:

```text
com.elsenib.devfeed
```

EAS hesabını yoxla:

```powershell
npx.cmd eas-cli whoami
```

Production AAB build başlat:

```powershell
npx.cmd eas-cli build --platform android --profile production --non-interactive --no-wait
```

Build statusuna bax:

```powershell
npx.cmd eas-cli build:view BUILD_ID
```

Son lokal AAB faylı:

```text
dist\DevFeed-1.0.0-1.aab
```

Yeni Play Store update üçün:

1. `app.json` içində `expo.version` artır.
2. `app.json` içində `expo.android.versionCode` mütləq artır.
3. Build al:

```powershell
npx.cmd eas-cli build --platform android --profile production --non-interactive --no-wait
```

4. Yeni `.aab` faylını Play Console release-ə yüklə.

## Git və deploy

Yoxlama:

```powershell
git status --short
git diff --check
```

Commit:

```powershell
git add -- fayl1 fayl2
git commit -m "feat: qisa izah"
```

Push:

```powershell
git push origin main
```

Railway GitHub push-dan sonra avtomatik deploy edir. Deploy problemində Railway dashboard-da:

- Deploy logs
- HTTP logs
- Variables
- Custom Start Command

yoxlanmalıdır.

Railway start command:

```text
node index.js
```

## Vacib environment variable-lar

Railway backend:

```text
DATABASE_URL
JWT_SECRET
NODE_ENV=production
PGSSLMODE=require
PUBLIC_BACKEND_URL
GOOGLE_CLIENT_ID_WEB
GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
RESEND_API_KEY
EMAIL_FROM
SUPPORT_ACCOUNT_NUMBER
SUPPORT_RECEIVER_NAME
```

`PUBLIC_BACKEND_URL` belə olmalıdır:

```text
https://devfeedd-backend-production.up.railway.app
```

Resend `EMAIL_FROM` nümunəsi:

```text
DevFeed <noreply@devfeed.xestexana.live>
```

## OAuth callback URL-ləri

Google Cloud və GitHub OAuth app ayarlarında backend callback URL-ləri:

```text
https://devfeedd-backend-production.up.railway.app/auth/oauth/callback/google
https://devfeedd-backend-production.up.railway.app/auth/oauth/callback/github
```

App redirect scheme:

```text
devfeed://oauth
```

Google-da `Access blocked` çıxsa:

- OAuth consent screen `Testing` rejimindədirsə, test email əlavə et.
- Production üçün app-i publish/verify et.
- Web client-də authorized redirect URI dəqiq backend callback URL olsun.

## Email problemləri

Mail spam-a düşürsə:

- Resend domain DNS record-ları verified olmalıdır.
- SPF, DKIM, MX record-ları düzgün olmalıdır.
- `EMAIL_FROM` verified domain-dən gəlməlidir.
- Yeni domainlərdə spam normal ola bilər; reputasiya zamanla düzəlir.

## Database və migration

Backend `index.js` startup zamanı əsas schema-ları yaradır və genişləndirir. SQL migration faylları `migrations/` içindədir.

Yeni DB dəyişikliyi edəndə:

- Əvvəl `index.js` schema init hissəsini yoxla.
- Lazımdırsa `migrations/00x_name.sql` əlavə et.
- Railway deploy sonrası logs-da SQL error olub-olmadığını yoxla.

## Content filter

Filter kodları:

```text
middleware/contentFilter.js
```

Filter genişləndirəndə bunları test et:

- post body
- comment
- DM message
- public chat message
- profile name/bio
- avatar upload
- job post
- job application cover letter

## Tez-tez çıxan problemlər

### `npx.ps1 cannot be loaded`

PowerShell policy problemidir. `npx` yerinə:

```powershell
npx.cmd ...
```

istifadə et.

### Kotlin `WARNİNG` xətası

Türk/Azərbaycan locale problemi ola bilər. `android/gradle.properties` içində bu qalmalıdır:

```text
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -Duser.language=en -Duser.country=US
```

### EAS `android.package is ignored`

Əgər repo-da `android/` native qovluğu varsa, EAS native `android/app/build.gradle` içindəki `applicationId` dəyərini istifadə edir.

Managed config üçün `app.json`, native config üçün:

```text
android/app/build.gradle
```

yoxlanmalıdır.

### Play Store target API error

Yeni app-lər üçün target API 35 və ya daha yuxarı olmalıdır. Cari config:

```text
targetSdkVersion 35
```

### App Play Store-da update olmur

Səbəblər:

- `versionCode` artırılmayıb.
- Package name əvvəlki release ilə eyni deyil.
- Fərqli signing key istifadə olunub.
- AAB yerinə APK yüklənib.

### Backend deploy olub, amma app login etmir

Yoxla:

```powershell
Invoke-WebRequest -Uri "https://devfeedd-backend-production.up.railway.app/health" -UseBasicParsing
```

Sonra app config:

```text
src/constants/config.js
```

burada production backend URL olmalıdır.

### Geri qaytarmaq lazımdırsa

Təhlükəsiz rollback:

```powershell
git revert COMMIT_HASH
git push origin main
```

`git reset --hard` istifadə etmə, çünki local dəyişiklikləri silə bilər.

## Release checklist

- `git status --short` yoxlandı.
- `npx.cmd expo install --check` təmizdir.
- Backend `node --check index.js` təmizdir.
- Railway health `200 OK` qaytarır.
- `app.json` version/versionCode düzgündür.
- EAS production build `FINISHED` olub.
- AAB faylı Play Console-a yüklənib.
- Play Console Data safety, Privacy policy, Ads declaration, Content rating doldurulub.
- Test account və app access məlumatı əlavə olunub.
