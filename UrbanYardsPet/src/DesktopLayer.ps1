Set-StrictMode -Version Latest

if (-not ("UrbanYardsDesktopLayer" -as [type])) {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class UrbanYardsDesktopLayer {
    public delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [DllImport("user32.dll", SetLastError=true)]
    public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);

    [DllImport("user32.dll", CharSet=CharSet.Unicode)]
    public static extern IntPtr FindWindow(string className, string windowName);

    [DllImport("user32.dll", CharSet=CharSet.Unicode)]
    public static extern IntPtr FindWindowEx(IntPtr parent, IntPtr childAfter, string className, string windowName);

    [DllImport("user32.dll", SetLastError=true)]
    public static extern IntPtr SetParent(IntPtr child, IntPtr parent);

    [DllImport("user32.dll")]
    public static extern IntPtr GetParent(IntPtr child);

    [DllImport("user32.dll", SetLastError=true)]
    public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);

    [DllImport("user32.dll", SetLastError=true)]
    public static extern bool SetWindowPos(IntPtr hwnd, IntPtr insertAfter, int x, int y, int width, int height, uint flags);

    [DllImport("user32.dll", SetLastError=true)]
    public static extern IntPtr SendMessageTimeout(IntPtr hwnd, uint message, IntPtr wParam, IntPtr lParam, uint flags, uint timeout, out IntPtr result);

    [DllImport("shell32.dll", CharSet=CharSet.Unicode)]
    public static extern int SetCurrentProcessExplicitAppUserModelID(string appID);
}
"@
}

function Set-UyProcessAppIdentity {
    [void][UrbanYardsDesktopLayer]::SetCurrentProcessExplicitAppUserModelID("UrbanYards.TheLawnmowerMan")
}

function Get-UyPetNativeHandle {
    param([Parameter(Mandatory = $true)][System.Windows.Window]$Window)
    return [System.Windows.Interop.WindowInteropHelper]::new($Window).Handle
}

function Get-UyDesktopShelfHost {
    $progman = [UrbanYardsDesktopLayer]::FindWindow("Progman", $null)
    $messageResult = [IntPtr]::Zero
    if ($progman -ne [IntPtr]::Zero) {
        [void][UrbanYardsDesktopLayer]::SendMessageTimeout($progman, 0x052C, [IntPtr]::Zero, [IntPtr]::Zero, 0, 1000, [ref]$messageResult)
    }

    $script:UyDesktopShelfHost = [IntPtr]::Zero
    $callback = [UrbanYardsDesktopLayer+EnumWindowsProc]{
        param([IntPtr]$candidate, [IntPtr]$parameter)
        $view = [UrbanYardsDesktopLayer]::FindWindowEx($candidate, [IntPtr]::Zero, "SHELLDLL_DefView", $null)
        if ($view -ne [IntPtr]::Zero) { $script:UyDesktopShelfHost = $candidate }
        return $true
    }
    [void][UrbanYardsDesktopLayer]::EnumWindows($callback, [IntPtr]::Zero)
    if ($script:UyDesktopShelfHost -eq [IntPtr]::Zero) { $script:UyDesktopShelfHost = $progman }
    return $script:UyDesktopShelfHost
}

function Set-UyDesktopShelfParent {
    param(
        [Parameter(Mandatory = $true)][System.Windows.Window]$Window,
        [Parameter(Mandatory = $true)][bool]$Attach
    )
    $handle = Get-UyPetNativeHandle -Window $Window
    if ($handle -eq [IntPtr]::Zero) { throw "The Lawnmower Man window is not ready for a display-mode change." }

    $rect = [UrbanYardsDesktopLayer+RECT]::new()
    [void][UrbanYardsDesktopLayer]::GetWindowRect($handle, [ref]$rect)
    if ($Attach) {
        $shelfHost = Get-UyDesktopShelfHost
        if ($shelfHost -eq [IntPtr]::Zero) { throw "The Windows desktop shelf could not be found." }
        $hostRect = [UrbanYardsDesktopLayer+RECT]::new()
        [void][UrbanYardsDesktopLayer]::GetWindowRect($shelfHost, [ref]$hostRect)
        [void][UrbanYardsDesktopLayer]::SetParent($handle, $shelfHost)
        [void][UrbanYardsDesktopLayer]::SetWindowPos(
            $handle,
            [IntPtr]::Zero,
            $rect.Left - $hostRect.Left,
            $rect.Top - $hostRect.Top,
            $rect.Right - $rect.Left,
            $rect.Bottom - $rect.Top,
            0x0010
        )
        return $shelfHost
    }

    [void][UrbanYardsDesktopLayer]::SetParent($handle, [IntPtr]::Zero)
    [void][UrbanYardsDesktopLayer]::SetWindowPos(
        $handle,
        [IntPtr]::Zero,
        $rect.Left,
        $rect.Top,
        $rect.Right - $rect.Left,
        $rect.Bottom - $rect.Top,
        0x0010
    )
    return [IntPtr]::Zero
}

function New-UyDesktopLayerController {
    param(
        [Parameter(Mandatory = $true)][System.Windows.Window]$Window,
        [Parameter(Mandatory = $true)]$Config
    )
    $controller = [pscustomobject]@{
        Window = $Window
        Config = $Config
        Mode = "floating"
        ShelfHost = [IntPtr]::Zero
        IsReady = $false
    }
    $controller | Add-Member -MemberType ScriptMethod -Name PersistMode -Value {
        param([string]$Mode)
        $this.Config.displayMode = $Mode
        Save-UyPetConfig -Config $this.Config
    }
    $controller | Add-Member -MemberType ScriptMethod -Name ReturnToShelf -Value {
        param([bool]$Persist = $true)
        if (-not $this.Window.IsVisible) { $this.Window.Show() }
        $this.Window.Topmost = $false
        $this.ShelfHost = Set-UyDesktopShelfParent -Window $this.Window -Attach $true
        $this.Mode = "shelf"
        $this.IsReady = $true
        if ($Persist) { $this.PersistMode("shelf") }
        Write-UyPetLog "The Lawnmower Man returned to the desktop shelf."
    }
    $controller | Add-Member -MemberType ScriptMethod -Name BringForward -Value {
        param([bool]$Persist = $true)
        if ((Get-UyPetNativeHandle -Window $this.Window) -ne [IntPtr]::Zero -and [UrbanYardsDesktopLayer]::GetParent((Get-UyPetNativeHandle -Window $this.Window)) -ne [IntPtr]::Zero) {
            [void](Set-UyDesktopShelfParent -Window $this.Window -Attach $false)
        }
        if (-not $this.Window.IsVisible) { $this.Window.Show() }
        $this.Mode = "floating"
        $this.ShelfHost = [IntPtr]::Zero
        $this.IsReady = $true
        $this.Window.Topmost = [bool]$this.Config.alwaysOnTop
        Set-UyWindowWithinScreens -Window $this.Window
        $this.Window.Activate()
        if ($Persist) { $this.PersistMode("floating") }
        Write-UyPetLog "The Lawnmower Man was brought forward."
    }
    $controller | Add-Member -MemberType ScriptMethod -Name ApplySavedMode -Value {
        $mode = if ([string]$this.Config.displayMode -eq "shelf") { "shelf" } else { "floating" }
        if ($mode -eq "shelf") { $this.ReturnToShelf($false) } else { $this.BringForward($false) }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name DetachForExit -Value {
        if ($this.IsReady -and $this.Mode -eq "shelf") {
            try { [void](Set-UyDesktopShelfParent -Window $this.Window -Attach $false) } catch {}
        }
        $this.IsReady = $false
        $this.ShelfHost = [IntPtr]::Zero
    }
    return $controller
}
