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
    │   ├── index.html
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
| `pnpm cap:sync` | Copies the frontend's `dist/` build into the native Capacitor projects |
| `pnpm cap:run:android` | Builds, syncs, and launches the app on a connected Android device/emulator |

`shared` must be built (or running via `pnpm dev`/`build:shared`) before `frontend` or `server`, since both consume its compiled `dist/` output rather than the TypeScript source directly.

### Environment Variables

The frontend (`apps/frontend`) reads Vite-exposed env vars at build/dev time:

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_GRAPHQL_ENDPOINT` | `http://localhost:4000/graphql` | URL of the Apollo GraphQL server |

Copy `apps/frontend/.env.example` to `apps/frontend/.env.local` and adjust it to point the frontend at a non-default server.

### Mobile (Capacitor)

The frontend is wrapped with Capacitor (`appId: com.liquid.sort`) for Android/iOS packaging. Native platform folders (`apps/frontend/android/`, `apps/frontend/ios/`) are gitignored and regenerated on demand rather than committed. An Android project is already scaffolded (`apps/frontend/android/`); to target iOS, add the platform first with `npx cap add ios` from `apps/frontend`.

#### Android toolchain requirements

- **JDK 21** — the native `capacitor-android` module (Capacitor 8.x) compiles with `--release 21`, so JDK 17 is not enough even though Gradle itself would run on it.
- **Android SDK** with `platform-tools`, `platforms;android-36`, and `build-tools;36.0.0` (matching `compileSdkVersion`/`targetSdkVersion` in `apps/frontend/android/variables.gradle`) — installable via Android Studio's SDK Manager, or headlessly with Google's [`android` CLI](https://developer.android.com/tools/agents/android-cli) (`android sdk install platform-tools platforms/android-36 build-tools/36.0.0`).
- `apps/frontend/android/local.properties` (gitignored, not committed) pointing at your SDK:
  ```
  sdk.dir=C:/path/to/Android/Sdk
  ```

#### Building and installing

```
pnpm build:frontend
pnpm cap:sync
pnpm cap:run:android
```

**On Windows, `cap:run:android` currently fails** (`'gradlew' is not recognized...`) — the Capacitor CLI spawns `gradlew` without going through a shell, so Windows can't resolve the `.bat` extension. Until that's fixed upstream, drive Gradle directly instead, from `apps/frontend/android` with `JAVA_HOME`/`ANDROID_HOME` set:

```
.\gradlew.bat installDebug
```

This builds the debug APK and installs it on whatever device `adb devices` currently sees.

#### Testing against a local server on a real device

A phone connected over USB doesn't share `localhost` with your dev machine, so the default `VITE_GRAPHQL_ENDPOINT` (`http://localhost:4000/graphql`) would otherwise point at the phone itself. Rather than reconfiguring the endpoint and dealing with LAN/firewall issues, tunnel the port over the existing USB connection:

```
adb reverse tcp:4000 tcp:4000
```

With that in place, the installed app's `localhost:4000` transparently reaches the Apollo server running on your PC.
