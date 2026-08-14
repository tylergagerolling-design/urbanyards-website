# The Lawnmower Man — Urban Yards Windows Desktop Pet

The Lawnmower Man is a lightweight, offline PowerShell/WPF desktop mascot featuring Sprout, the approved Urban Yards character. It does not connect to the Urban Yards dashboard, Supabase, or any AI provider. It stores no credentials and makes no network requests.

## What it does

- Plays the six approved Sprout animations: `idle_blink`, `thinking`, `working`, `attention`, `celebrate`, and `sleep`.
- Stays where the user places it; there is no autonomous walking or wandering.
- Supports manual dragging and remembers its screen position.
- Switches between floating mode and the Windows desktop shelf.
- Runs quietly from the Windows notification area with bring-forward, shelf, hide, settings, pause, and exit controls.
- Can optionally launch with Windows for the current user.

## Requirements

- Windows 10 or Windows 11.
- PowerShell 7 or newer is recommended. Windows PowerShell 5.1 remains a compatibility fallback.
- WPF and the .NET desktop assemblies included with Windows.

No internet connection, dashboard login, API token, database connection, or package installation is required.

## Installation

From the `UrbanYardsPet` directory, run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Install-UrbanYardsPet.ps1
```

Add `-Launch` to start it after installation or `-EnableStartup` to opt into launching with Windows. The per-user installation is placed at `%LOCALAPPDATA%\Programs\UrbanYardsPet` and the prior installed version is retained as a rollback copy.

The Desktop shortcut, Start Menu shortcut, notification-area icon, and native windows use the approved Sprout artwork in `assets/icons/lawnmower-man-app-icon.png`. The generated `assets/icons/lawnmower-man-app.ico` contains Windows-ready sizes from 16×16 through 256×256.

## Interactions

- **Drag:** move Sprout manually; the position is saved locally.
- **Single click:** open the small pet-control menu.
- **Double click:** play the celebrate animation.
- **Right click:** open the full local control menu.
- **Close:** hide Sprout to the notification area.
- **Notification-area double click:** bring Sprout forward.
- **Bring Forward:** show Sprout above ordinary application windows.
- **Send to Desktop Shelf:** place Sprout behind ordinary application windows.

Sprout never moves around the desktop on its own.

## Local settings

Defaults are in `config.example.json`. User changes are saved to `%LOCALAPPDATA%\UrbanYardsPet\config.json`.

Available settings are:

- launch with Windows;
- always on top;
- floating or desktop-shelf display mode;
- animations on or off;
- animation speed;
- reset saved position;
- preview any of the six approved animations.

Legacy connection, AI, polling, speech, and dashboard settings from older versions are ignored and removed the next time settings are saved.

## Sprite source of truth

The approved source pack is preserved at `assets/source/sprout-6-animation-pack/`. The active runtime uses exactly 48 transparent 512×512 PNG files under `assets/sprites/`: eight frames for each of the six approved animations.

The animation controller uses high-quality scaling for both floating and shelf rendering. The mascot artwork, icon, and source validation files are kept local to the application.

## Testing

Run the structural, sprite, parser, XAML, and offline-safety checks:

```powershell
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File .\tests\Test-UrbanYardsPet.ps1
```

Run the real WPF/tray smoke test:

```powershell
.\Start-UrbanYardsPet.ps1 -SmokeTest
```

Logs rotate locally under `%LOCALAPPDATA%\UrbanYardsPet\logs`.

## Uninstall

Exit Sprout from the notification-area menu, then run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Uninstall-UrbanYardsPet.ps1
```

Use `-RemoveUserData` only when you also want to remove local settings, position, and logs. The pet installs no services, scheduled tasks, machine-level registry entries, database objects, or global packages.
