# Liquid Sort Puzzle

Small game using Capacitor for desktop-phone portability
Frontend: Vite+React+Capacitor
Backend/Server: Apollo Server+NodeJS

## Description

We finished producing the potions, but it seems we had a mixup when storing them.
Can you sort them out?
Only potions of the same color may be poured into the same bottle.
Empty bottles may get potions of any color.
Full bottles are ready for sale and thus shouldn't be reopened.

## Project Structure
```
liquid-sort-puzzle/
├── .gitignore                 (Root)
├── package.json               (Root workspace)
├── pnpm-workspace.yaml
├── packages/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts       (Pure logic + seeded PRNG)
└── apps/
    ├── frontend/
    │   ├── package.json
    │   ├── vite.config.ts
    │   ├── tsconfig.json
    │   ├── capacitor.config.ts (appId + native platform paths)
    │   ├── index.html
    │   ├── scripts/
    │   │   └── check-platforms.mjs
    │   ├── mobile/             (gitignored, see Mobile section)
    │   │   ├── android/        (npx cap add android)
    │   │   └── ios/            (npx cap add ios)
    │   └── src/
    │       ├── main.tsx
    │       ├── App.tsx
    │       ├── App.css
    │       ├── apollo/
    │       │   └── client.ts
    │       └── graphql/
    │           └── mutations.ts
    └── server/
        ├── package.json
        ├── tsconfig.json
        └── src/
            └── index.ts       (Apollo Server with real replay)
```

## Local Development

### Requirements

- pnpm
- node

### Getting started

```
pnpm install
pnpm run build
pnpm run dev
```

This starts the shared package in watch mode alongside the frontend and server:

- Frontend: http://localhost:5173
- GraphQL server: http://localhost:4000/graphql

### Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Runs `shared` (watch), `frontend` and `server` together |
| `pnpm dev:frontend` / `pnpm dev:server` | Run a single app in dev mode |
| `pnpm build` | Builds `shared`, `frontend` and `server`, in that order |
| `pnpm build:shared` / `pnpm build:frontend` / `pnpm build:server` | Build a single workspace |
| `pnpm cap:check` | Verifies at least one native platform is scaffolded under `mobile/` |
| `pnpm cap:assets` | Regenerates app icons/splash from `apps/frontend/assets/` into the native project |
| `pnpm cap:sync` | Runs `cap:check`, then copies the frontend's `dist/` build into the native Capacitor projects |
| `pnpm cap:run:android` | Builds, syncs, and launches the app on a connected Android device/emulator |

`shared` must be built (or running via `pnpm dev`/`build:shared`) before `frontend` or `server`, since both consume its compiled `dist/` output rather than the TypeScript source directly.

### Environment Variables

The frontend (`apps/frontend`) reads Vite-exposed env vars at build/dev time:

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_GRAPHQL_ENDPOINT` | `http://localhost:4000/graphql` | URL of the Apollo GraphQL server |

Copy `apps/frontend/.env.example` to `apps/frontend/.env.local` and adjust it to point the frontend at a non-default server.

### Mobile (Capacitor)

The frontend is wrapped with Capacitor (`appId: com.liquid.sort`) for Android/iOS packaging. Native platform folders (`apps/frontend/mobile/android/`, `apps/frontend/mobile/ios/`) are **gitignored and regenerated on demand rather than committed**, so a fresh clone has neither.

Capacitor defaults to `android/` and `ios/` at the project root; this repo groups them under `mobile/` via `android.path` / `ios.path` in `capacitor.config.ts`:

```ts
const config: CapacitorConfig = {
  appId: 'com.liquid.sort',
  appName: 'Liquid Sort',
  webDir: 'dist',
  android: { path: 'mobile/android' },
  ios: { path: 'mobile/ios' },
};
```

That grouping earns its keep three times over: all generated native code sits behind one gitignore rule (`apps/frontend/mobile/`), the platform check below reduces to "does `mobile/` contain anything?" with no platform list to keep in sync, and adding a future platform needs no script changes. Capacitor rewrites the generated `capacitor.settings.gradle` relative paths to match the nesting on every sync, so the extra directory level is transparent to Gradle.

#### First-time platform setup (required)

Because the native folders aren't in the repo, you must scaffold them once per clone, from `apps/frontend`:

```
npx cap add android     # creates apps/frontend/mobile/android/
npx cap add ios         # creates apps/frontend/mobile/ios/ (macOS + Xcode only)
```

Run this **before** any Gradle command. `npx cap add` needs the web build to exist, so run `pnpm build:frontend` first if you haven't.

Platform-targeted Capacitor commands fail loudly and point you here, which is what you want:

```
$ npx cap sync android
[error] android platform has not been added yet.
        See the docs for adding the android platform: https://capacitorjs.com/docs/android#adding-the-android-platform
```

Bare `npx cap sync` is the exception, and it used to be the trap here: it syncs *whatever platforms exist*, so with none added it prints a green `✔ copy web` / `Sync finished` and **exits 0** while doing no native work — the failure only surfaced later at the Gradle step. `pnpm cap:sync` now runs `cap:check` first (`apps/frontend/scripts/check-platforms.mjs`), which lists the directories inside `mobile/` and fails with an actionable message when it finds none:

```
$ pnpm cap:sync
No Capacitor platform has been added yet, so there is nothing to sync.

Native platform folders are gitignored and regenerated on demand, so a
fresh clone has none. Scaffold at least one from apps/frontend:

  npx cap add android     # creates mobile/android/
  npx cap add ios         # creates mobile/ios/ (macOS + Xcode)
```

Run `pnpm cap:check` on its own any time you want to know which platforms are scaffolded — it prints e.g. `Capacitor platforms present: android`. An empty `mobile/` counts as none, so deleting a platform folder by hand still fails the check rather than slipping through.

**Regenerate the app icons after every `npx cap add`.** `cap add` rebuilds the native project from the Capacitor template, which replaces the generated launcher icons with the default ones — the app will appear with Capacitor's icon rather than this project's. The sources live in `apps/frontend/assets/` (`icon.png`, `icon-foreground.png`, `icon-background.png`) and are committed; only the generated output is disposable:

```
pnpm cap:assets
```

That wraps `capacitor-assets generate --android --androidProject mobile/android`. The `--androidProject` flag is required: `@capacitor/assets` v3 does **not** read `android.path` from `capacitor.config.ts` and otherwise looks for a top-level `android/`, warning `Android platform not found ... skipping android generation` and exiting successfully — a silent no-op in the same family as the `cap sync` one above.

Re-run `npx cap add` any time you delete the folder; it's safe to regenerate. Anything you hand-edit inside `mobile/android/` or `mobile/ios/` is lost on regeneration — which is why the keystore advice below deliberately keeps changes *outside* those folders.

#### Android toolchain requirements

- **JDK 21** — the native `capacitor-android` module (Capacitor 8.x) compiles with `--release 21`, so JDK 17 is not enough even though Gradle itself would run on it.
- **Android SDK** with `platform-tools`, `platforms;android-36`, and `build-tools;36.0.0` (matching `compileSdkVersion`/`targetSdkVersion` in `apps/frontend/mobile/android/variables.gradle`).
- `apps/frontend/mobile/android/local.properties` (gitignored, not committed) pointing at your SDK:
  ```
  sdk.dir=/home/you/Android/Sdk        # or C:/path/to/Android/Sdk on Windows
  ```

You have three ways to get the SDK:

1. **Android Studio's SDK Manager** — easiest if you already use the IDE.
2. **Google's [`android` CLI](https://developer.android.com/tools/agents/android-cli)** — `android sdk install platform-tools platforms/android-36 build-tools/36.0.0`.
3. **`sdkmanager` from cmdline-tools** — fully headless, no IDE, works well on Linux/WSL and CI. This is what a from-scratch setup looks like:

   ```bash
   # 1. Download and unpack the command-line tools
   curl -fsSL -o cmdtools.zip \
     https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip
   mkdir -p ~/Android/Sdk/cmdline-tools
   unzip -q cmdtools.zip -d /tmp/cmdout
   mv /tmp/cmdout/cmdline-tools ~/Android/Sdk/cmdline-tools/latest

   # 2. Point the environment at it
   export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
   export ANDROID_HOME="$HOME/Android/Sdk"
   export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

   # 3. Accept licenses and install exactly what the build needs
   yes | sdkmanager --licenses
   sdkmanager --install "platform-tools" "platforms;android-36" "build-tools;36.0.0"

   # 4. Record the SDK location for Gradle
   echo "sdk.dir=$HOME/Android/Sdk" > apps/frontend/mobile/android/local.properties
   ```

   The nested `cmdline-tools/latest/` directory name matters — `sdkmanager` refuses to run if the tools sit directly in `cmdline-tools/`. Add the three `export` lines to your `~/.bashrc` so new shells inherit them.

#### Building and installing

```
pnpm build:frontend
pnpm cap:sync
pnpm cap:run:android
```

`pnpm cap:run:android` is the happy path, but it fails on two common setups:

- **On Windows** (`'gradlew' is not recognized...`) — the Capacitor CLI spawns `gradlew` without going through a shell, so Windows can't resolve the `.bat` extension.
- **On WSL2** — it shells out to the Linux `adb`, which cannot see a phone plugged into the Windows host (see below), so it reports no devices.

In both cases, drive Gradle directly from `apps/frontend/mobile/android` with `JAVA_HOME`/`ANDROID_HOME` set:

```
./gradlew installDebug          # Linux/macOS
.\gradlew.bat installDebug      # Windows
```

`installDebug` builds the debug APK and installs it on whatever device `adb devices` currently sees. Use `assembleDebug` instead if you want to build the APK without installing — it lands at `apps/frontend/mobile/android/app/build/outputs/apk/debug/app-debug.apk`.

#### Connecting an Android device from WSL2

**WSL2 has no USB passthrough by default.** A phone plugged into the Windows host is invisible to Linux — there's no `/dev/bus/usb`, and `adb devices` inside WSL will always come back empty no matter how the SDK is configured. This is the single most confusing failure in this setup, because every tool reports "no devices" rather than anything explaining why.

Two ways around it.

**Option A — drive the Windows-side `adb` (no admin required).** Build in WSL, install through Windows. This is the route this project has actually been set up with:

```bash
# 1. One-time: install Google's platform-tools on the WINDOWS side
curl -fsSL -o pt-win.zip \
  https://dl.google.com/android/repository/platform-tools-latest-windows.zip
unzip -q pt-win.zip -d /mnt/c/Users/<you>/

# 2. Convenience alias — add to ~/.bashrc
alias wadb='/mnt/c/Users/<you>/platform-tools/adb.exe'

# 3. Confirm the phone is visible, then ACCEPT the "Allow USB debugging?"
#    prompt on the device (it shows as `unauthorized` until you do)
wadb devices

# 4. Build in WSL, then hand the APK to Windows adb via a Windows-visible path
cd apps/frontend/mobile/android && ./gradlew assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk /mnt/c/Users/<you>/
wadb install -r 'C:\Users\<you>\app-debug.apk'
```

`adb.exe` is a Windows binary, so it needs a **Windows** path (`C:\...`) for the APK — it cannot read `/home/...`. Copying the APK under `/mnt/c/` first is the simplest fix.

If `wadb devices` shows nothing at all, check that Windows itself sees the phone before blaming adb:

```powershell
Get-PnpDevice -PresentOnly | Where-Object { $_.FriendlyName -match 'ADB|Android' }
```

An `ADB Interface` entry with status `OK` means the driver is fine and the problem is elsewhere.

**Option B — `usbipd-win` USB passthrough (needs admin).** Attaches the physical device into WSL so everything works exactly as documented, including `pnpm cap:run:android` and the Linux `adb`. From an **administrator** PowerShell:

```powershell
winget install usbipd
usbipd list                        # find the phone's BUSID
usbipd bind --busid <BUSID>        # one-time, persists
usbipd attach --wsl --busid <BUSID>
```

The `attach` step must be repeated after each reboot or `wsl --shutdown`. This is the cleaner long-term option if you're willing to install it; Option A is the faster one if you aren't.

#### Signature clash when the app was built on another machine

Android generates `~/.android/debug.keystore` **per machine**, with a random key. Two computers building this app therefore produce APKs that cannot replace each other, and installing across them fails with:

```
INSTALL_FAILED_UPDATE_INCOMPATIBLE: Existing package com.liquid.sort
signatures do not match newer version; ignoring!
```

The quick fix is to remove the other machine's copy first — note this **deletes the app's on-device data**:

```
adb uninstall com.liquid.sort
adb install -r path/to/app-debug.apk
```

To stop it recurring, copy a single `~/.android/debug.keystore` from whichever machine you treat as canonical to the others. That file lives *outside* the project, so it survives `npx cap add android` regenerating the `mobile/android/` folder — unlike a `signingConfig` in `app/build.gradle`, which would be wiped every time.

#### Testing against a local server on a real device

A phone connected over USB doesn't share `localhost` with your dev machine, so the default `VITE_GRAPHQL_ENDPOINT` (`http://localhost:4000/graphql`) would otherwise point at the phone itself. Rather than reconfiguring the endpoint and dealing with LAN/firewall issues, tunnel the port over the existing USB connection:

```
adb reverse tcp:4000 tcp:4000     # or `wadb reverse ...` on WSL2
```

With that in place, the installed app's `localhost:4000` transparently reaches the Apollo server running on your PC. The tunnel is not persistent — re-run it after replugging the device or restarting the adb server.

**Why the server binds `0.0.0.0`.** `apps/server/src/index.ts` listens on `0.0.0.0` rather than Node's default. This matters specifically on WSL2: Windows mirrors a WSL listener onto its own loopback using the *same address family*, so a dual-stack (`::`) bind is exposed only as `[::1]:4000` — IPv6. `adb reverse` connects over IPv4 `127.0.0.1`, finds nothing, and closes the stream, which surfaces on the device as an empty reply (`curl` exit code 52) rather than a connection error. Binding IPv4 explicitly makes Windows expose `127.0.0.1:4000` and the tunnel work. To verify the mapping on your own machine:

```
ss -tln | grep 4000                          # from WSL
netstat.exe -ano | grep ":4000"              # what Windows actually exposes
```
