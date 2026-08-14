# The Lawnmower Man — Urban Yards Windows Desktop Pet

The Lawnmower Man desktop pet is a lightweight PowerShell/WPF companion for the existing Urban Yards dashboard. It uses the approved painted/chibi Sprout character, stays useful offline, and connects to the same authenticated Urban Yards backend when a signed-in user token is provided.

It is not a second assistant and it is not a Tamagotchi. The visual pet is an interface for the existing Lawnmower Man AI and deterministic Urban Yards operational events.

## Requirements

- Windows 10 or Windows 11.
- PowerShell 7 or newer is recommended. Windows PowerShell 5.1 is supported as a compatibility fallback on this computer.
- WPF and the .NET desktop assemblies included with Windows.
- Internet access is optional. Offline animations, dragging, menus, settings, tray behavior, and dashboard links continue to work.
- A short-lived signed-in Urban Yards user access token is optional and is needed only for compact desktop chat and live operational polling.

## Installation

No package installation is required. Keep the `UrbanYardsPet` directory together because the scripts load XAML and sprite assets by relative path.

For a normal per-user Windows installation with Desktop and Start Menu shortcuts, run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Install-UrbanYardsPet.ps1
```

Add `-Launch` to start it after installation, or `-EnableStartup` to opt in to launching with Windows. The installer uses `%LOCALAPPDATA%\Programs\UrbanYardsPet`, needs no administrator access, preserves the prior installed version as a rollback copy, and never overwrites the source checkout.

If a portable PowerShell 7 zip is supplied with `-RuntimeArchive`, it is installed privately inside the application. Otherwise the app prefers system PowerShell 7 and safely falls back to Windows PowerShell 5.1.

The approved source-of-truth pack is preserved at `assets/source/sprout-6-animation-pack/`. It contains the supplied README, source manifest, validation results, QA contact sheet, and six-animation previews. The active runtime uses the 48 individual alpha-enabled production frames copied into `assets/sprites/`.

The Desktop shortcut, Start Menu shortcut, system tray, and native app windows use the approved Sprout master artwork stored at `assets/icons/lawnmower-man-app-icon.png`. The generated `assets/icons/lawnmower-man-app.ico` includes Windows-ready sizes from 16×16 through 256×256. To rebuild the Windows icon after intentionally replacing the master PNG, run:

```powershell
pwsh -NoProfile -File .\tools\Build-AppIcon.ps1
```

## Launching

Double-click:

```text
Launch Urban Yards Pet.cmd
```

Or run:

```powershell
.\Start-UrbanYardsPet.ps1
```

The launcher selects PowerShell 7 when available and starts it in STA mode, which WPF requires. If PowerShell 7 is unavailable, it reports the fallback and uses Windows PowerShell 5.1.

## Interactions

- **Drag:** hold the left mouse button and move the pet. Its position is saved under `%LOCALAPPDATA%\UrbanYardsPet`.
- **Single click:** compact Lawnmower Man menu.
- **Double click:** compact chat backed by the existing Lawnmower Man endpoint.
- **Right click:** full context menu with Urban Yards routes, pause, settings, tray, and exit.
- **Close:** minimizes to the system tray. Use `Exit` from the context/tray menu to terminate.
- **Tray double-click:** restores the pet.
- **Bring Forward:** detaches the pet from the Windows desktop layer and displays it above regular windows. Available from the pet menu, right-click menu, and tray.
- **Return to Desktop Shelf:** attaches the pet to the Windows desktop layer so normal application windows appear above it. The selected display mode is saved between launches.

## Configuration

Defaults are in `config.example.json`. User changes from Settings are written to:

```text
%LOCALAPPDATA%\UrbanYardsPet\config.json
```

The optional project-local `config/config.json` is ignored by Git. Never put service-role keys or provider API keys in either file.

Important fields:

- `dashboardUrl`: known live dashboard URL, currently `https://urbanyards.us/dashboard`.
- `apiBaseUrl`: backend origin, currently `https://urbanyards.us`.
- `pollIntervalSeconds`: live operational polling interval, constrained to 30–300 seconds.
- `accessTokenEnvironmentVariable`: name of the environment variable that supplies a short-lived signed-in user token.
- `alwaysOnTop`, `speechEnabled`, `soundsEnabled`.

Sounds default to off. Launch-with-Windows is opt-in.

The installed app continues to run under its bundled PowerShell 7 runtime. Its shortcut uses a silent Windows Script Host launcher, so no console or pet window appears at startup: only the branded tray icon is created. From that icon use **SHOW ALERTS**, **BRING FORWARD**, or **SEND TO SHELF**. Windows receives the stable `UrbanYards.TheLawnmowerMan` app identity, while shortcuts, tray controls, and native windows use the Lawnmower Man logo instead of the generic PowerShell icon.

## Adding API configuration

The desktop pet does not store passwords, provider keys, Supabase anon keys, or service-role keys. It reuses the existing Netlify backend, which validates the same signed-in user permissions as the dashboard.

For the current PowerShell session:

```powershell
$env:URBAN_YARDS_ACCESS_TOKEN = "<short-lived signed-in user access token>"
.\Start-UrbanYardsPet.ps1
```

For a persistent setup, use a secure per-user credential handoff or a session-token broker in a future build. Do not paste a service-role credential into Windows environment variables. Tokens expire by design; when one expires the pet enters reconnecting/offline mode rather than crashing.

Open **Settings**, then use **Connect to Urban Yards** with the same email and password used by the owner dashboard. The password is sent directly to the existing Supabase Auth endpoint and is never stored. Access and refresh tokens are encrypted with Windows Data Protection for the current Windows user. **Disconnect** removes the saved session.

The `URBAN_YARDS_ACCESS_TOKEN` environment variable remains available as a developer override. If neither an encrypted session nor that override is present, double-click chat explains the configuration requirement and the **Open full dashboard AI** button opens the authenticated web experience.

## Connecting to Urban Yards

The integration layer calls existing backend functions; it does not access Supabase directly and does not introduce a duplicate backend:

- `/.netlify/functions/lawnmower-man-chat` for authenticated AI requests.
- `/.netlify/functions/dashboard-tickets` for deterministic ticket status.
- `/.netlify/functions/dashboard-records` for quote requests, reminders, and scheduled work.
- `/.netlify/functions/dashboard-financial` for payment events.
- `/.netlify/functions/nws-alerts` for public Portland weather alerts.

Polls use 30–60+ second intervals and exponential backoff. No periodic LLM request is made. AI is called only when the user sends a chat message.

The pet uses the existing hash routes discovered in `dashboard.js`: `overview`, `tickets`, `calendar`, `route-planner`, `outreach`, `contacts`, `call-queue`, `documents`, `settings`, `equipment`, `documentation`, `import-export`, `groundskeeper-ai`, and `ai-memory`.

## Sprite architecture

`config/sprite-manifest.json` is the rendering contract. The animation controller reads the frame names, supplied timing, and loop behavior from the manifest. The original pack metadata remains unchanged in `assets/source/sprout-6-animation-pack/sprite-manifest.source.json`.

All final sprite PNGs:

- are 512×512 transparent RGBA PNGs;
- use the common Sprout body anchor at `(256,256)` and one global scale across all frames;
- retain at least the supplied 32-pixel safe margin;
- use high-quality interpolation because the artwork is painted/chibi rather than hard-edged pixel art.

## Animation states

Registered and validated states are:

```text
idle_blink, thinking, working, attention, celebrate, sleep
```

Severity is separately constrained to `normal`, `attention`, or `urgent`. Business events such as weather, overdue work, new leads, busy days, and payments map into `attention` or `celebrate`; they do not add animations. Unknown AI state names are rejected and arbitrary AI-returned commands are never executed.

## Event architecture and a future dashboard pet

`Send-PetEvent` publishes a portable event with `type`, `severity`, `message`, entity metadata, an allow-listed route action, and timestamp. `EventController` handles validation, de-duplication, and cooldown. `PetController` knows animation behavior but has no business-table logic. `UrbanYardsClient` converts deterministic backend data into events.

The same JSON event contract can later be consumed by a web animation controller:

```json
{
  "type": "overdue",
  "severity": "attention",
  "message": "Three follow-ups are waiting.",
  "entityType": "lead",
  "action": { "label": "VIEW LEADS", "route": "leads" }
}
```

That dashboard controller would subscribe to the existing application state/event source and map the validated `type` to the same manifest state. It would not change Supabase, AI, or business workflows.

## Debugging and QA

Open **Settings → Developer animation QA**, choose any registered state, and run it. Or launch a state directly:

```powershell
.\Start-UrbanYardsPet.ps1 -TestState attention
```

Run the structural, sprite, parser, XAML, route, and security tests:

```powershell
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File .\tests\Test-UrbanYardsPet.ps1
```

Run a three-second WPF smoke test:

```powershell
.\Start-UrbanYardsPet.ps1 -SmokeTest
```

Logs rotate locally at 512 KB under `%LOCALAPPDATA%\UrbanYardsPet\logs`. Tokens and likely secrets are redacted. Logs record startup, state changes, events, connectivity, and errors.

## Windows startup

Enable **Launch with Windows** in Settings. This creates only a per-user launcher at:

```text
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Urban Yards Pet.cmd
```

It is never enabled automatically and requires no administrator privileges.

## Uninstalling / removing startup

1. Disable **Launch with Windows** in Settings, or delete the per-user startup file above.
2. Exit the pet from its context/tray menu.
3. Delete the `UrbanYardsPet` project directory if you no longer want the application.
4. Optionally delete `%LOCALAPPDATA%\UrbanYardsPet` to remove settings, position, and logs.

No database migrations, services, scheduled tasks, machine-level registry keys, or global packages are installed.

The installed copy can also be removed with:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Uninstall-UrbanYardsPet.ps1
```

Use `-RemoveUserData` only when you also want to remove saved settings, position, and logs.

## Troubleshooting

### The pet does not launch

- Run `Start-UrbanYardsPet.ps1` from a PowerShell window to see the useful error.
- Confirm Windows desktop/WPF components are available.
- Prefer PowerShell 7. The launcher uses Windows PowerShell 5.1 only as a fallback.
- Run the automated tests above.

### The pet says local mode

That is expected without `URBAN_YARDS_ACCESS_TOKEN`. Local behavior remains functional. Use the full dashboard AI or supply a short-lived signed-in user token.

### Urban Yards shows reconnecting

The token may be expired or the network/backend unavailable. The pet backs off and retries automatically. Restart it after refreshing the short-lived user token.

### Pet appears off-screen after monitor changes

Open Settings from the tray/context menu and choose **Reset pet position**. Every move is also clamped to a monitor working area, excluding the taskbar.

### DPI/scaling

WPF uses device-independent pixels and the sprites use a common fixed canvas. `UseLayoutRounding`, pixel snapping, and high-quality interpolation preserve the painted Sprout artwork at Windows scaling levels.
