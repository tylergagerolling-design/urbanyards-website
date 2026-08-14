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

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hwnd);

    [DllImport("user32.dll", CharSet=CharSet.Unicode)]
    public static extern IntPtr FindWindow(string className, string windowName);

    [DllImport("user32.dll", CharSet=CharSet.Unicode)]
    public static extern IntPtr FindWindowEx(IntPtr parent, IntPtr childAfter, string className, string windowName);

    [DllImport("user32.dll", SetLastError=true)]
    public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);

    [DllImport("user32.dll", SetLastError=true)]
    public static extern bool SetWindowPos(IntPtr hwnd, IntPtr insertAfter, int x, int y, int width, int height, uint flags);

    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hwnd, int command);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hwnd);

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

function Get-UyVisibleProcessWindowCount {
    $currentProcessId = [uint32][System.Diagnostics.Process]::GetCurrentProcess().Id
    $script:UyVisibleProcessWindowCount = 0
    $callback = [UrbanYardsDesktopLayer+EnumWindowsProc]{
        param([IntPtr]$candidate, [IntPtr]$parameter)
        $windowProcessId = [uint32]0
        [void][UrbanYardsDesktopLayer]::GetWindowThreadProcessId($candidate, [ref]$windowProcessId)
        if ($windowProcessId -eq $currentProcessId -and [UrbanYardsDesktopLayer]::IsWindowVisible($candidate)) {
            $script:UyVisibleProcessWindowCount++
        }
        return $true
    }
    [void][UrbanYardsDesktopLayer]::EnumWindows($callback, [IntPtr]::Zero)
    return $script:UyVisibleProcessWindowCount
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

function Get-UyShelfSpritePath {
    param([Parameter(Mandatory = $true)][System.Windows.Window]$Window)
    $petImage = $Window.FindName("PetImage")
    if ($null -eq $petImage -or $null -eq $petImage.Source -or $null -eq $petImage.Source.UriSource) {
        throw "The Lawnmower Man sprite is not ready for shelf mode."
    }
    return $petImage.Source.UriSource.LocalPath
}

function Set-UyShelfMirrorFrame {
    param(
        [Parameter(Mandatory = $true)]$Mirror,
        [Parameter(Mandatory = $true)][string]$Path
    )
    if ($Mirror.LastPath -eq $Path -or -not (Test-Path -LiteralPath $Path -PathType Leaf)) { return }

    $source = [System.Drawing.Image]::FromFile($Path)
    try { $frame = [System.Drawing.Bitmap]::new($source) }
    finally { $source.Dispose() }

    $offsetX = [Math]::Max(0, [Math]::Floor(($Mirror.Form.ClientSize.Width - $frame.Width) / 2))
    $offsetY = [Math]::Max(0, $Mirror.Form.ClientSize.Height - $frame.Height)
    $region = [System.Drawing.Region]::new()
    $region.MakeEmpty()
    for ($y = 0; $y -lt $frame.Height; $y++) {
        $runStart = -1
        for ($x = 0; $x -le $frame.Width; $x++) {
            $opaque = $x -lt $frame.Width -and $frame.GetPixel($x, $y).A -gt 8
            if ($opaque -and $runStart -lt 0) { $runStart = $x }
            elseif (-not $opaque -and $runStart -ge 0) {
                $region.Union([System.Drawing.Rectangle]::new($offsetX + $runStart, $offsetY + $y, $x - $runStart, 1))
                $runStart = -1
            }
        }
    }

    $previous = $Mirror.Picture.Image
    $previousRegion = $Mirror.Form.Region
    $Mirror.Picture.Location = [System.Drawing.Point]::new($offsetX, $offsetY)
    $Mirror.Picture.Size = [System.Drawing.Size]::new($frame.Width, $frame.Height)
    $Mirror.Picture.Image = $frame
    $Mirror.Form.Region = $region
    $Mirror.LastPath = $Path
    if ($null -ne $previous) { $previous.Dispose() }
    if ($null -ne $previousRegion) { $previousRegion.Dispose() }
    if ($Mirror.Form.WindowState -ne [System.Windows.Forms.FormWindowState]::Normal) {
        $Mirror.Form.WindowState = [System.Windows.Forms.FormWindowState]::Normal
    }
    [void][UrbanYardsDesktopLayer]::SetWindowPos($Mirror.Form.Handle, $Mirror.Host, 0, 0, 0, 0, 0x0053)
    $Mirror.Form.Refresh()
}

function New-UyDesktopShelfMirror {
    param([Parameter(Mandatory = $true)][System.Windows.Window]$Window)
    $shelfHost = Get-UyDesktopShelfHost
    if ($shelfHost -eq [IntPtr]::Zero) { throw "The Windows desktop shelf could not be found." }

    $windowHandle = Get-UyPetNativeHandle -Window $Window
    $rect = [UrbanYardsDesktopLayer+RECT]::new()
    if ($windowHandle -eq [IntPtr]::Zero -or -not [UrbanYardsDesktopLayer]::GetWindowRect($windowHandle, [ref]$rect)) {
        throw "The Lawnmower Man window position is not available for shelf mode."
    }

    # A transparent WPF window is a layered top-level HWND and Windows stops
    # drawing it when SetParent turns it into an Explorer child. Shelf mode uses
    # a region-shaped WinForms mirror in desktop z-order while the full WPF pet
    # stays hidden and ready to restore.
    $width = [Math]::Max(1, $rect.Right - $rect.Left)
    $height = [Math]::Max(1, $rect.Bottom - $rect.Top)
    $form = [System.Windows.Forms.Form]::new()
    $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
    $form.ShowInTaskbar = $false
    $form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
    $form.BackColor = [System.Drawing.Color]::Black
    $form.ClientSize = [System.Drawing.Size]::new($width, $height)
    $form.Location = [System.Drawing.Point]::new($rect.Left, $rect.Top)

    $picture = [System.Windows.Forms.PictureBox]::new()
    $picture.BackColor = [System.Drawing.Color]::Transparent
    $picture.SizeMode = [System.Windows.Forms.PictureBoxSizeMode]::Normal
    $picture.Cursor = [System.Windows.Forms.Cursors]::Hand
    $picture.Add_Click({
        try { $script:UyPetRuntimeState.DesktopLayer.BringForward($true) }
        catch { try { Write-UyPetLog "Shelf pet click could not bring the pet forward: $($_.Exception.Message)" "ERROR" } catch {} }
    })
    $form.Controls.Add($picture)
    $form.Show()

    # Keep the region-shaped mirror as a top-level window and place it directly
    # above the desktop host in native z-order. Unlike a layered WPF/WinForms
    # child, this remains paintable while still sitting below application windows.
    [void][UrbanYardsDesktopLayer]::SetWindowPos($form.Handle, $shelfHost, $rect.Left, $rect.Top, $width, $height, 0x0050)
    [void][UrbanYardsDesktopLayer]::ShowWindowAsync($form.Handle, 5)

    $mirror = [pscustomobject]@{
        Form = $form
        Picture = $picture
        Host = $shelfHost
        Timer = $null
        LastPath = ""
    }
    Set-UyShelfMirrorFrame -Mirror $mirror -Path (Get-UyShelfSpritePath -Window $Window)
    $mirrorRect = [UrbanYardsDesktopLayer+RECT]::new()
    [void][UrbanYardsDesktopLayer]::GetWindowRect($form.Handle, [ref]$mirrorRect)
    Write-UyPetLog ("Shelf mirror attached to {0} at {1},{2}-{3},{4}; visible={5}." -f $shelfHost, $mirrorRect.Left, $mirrorRect.Top, $mirrorRect.Right, $mirrorRect.Bottom, [UrbanYardsDesktopLayer]::IsWindowVisible($form.Handle))
    return $mirror
}

function Remove-UyDesktopShelfMirror {
    param($Mirror)
    if ($null -eq $Mirror) { return }
    if ($null -ne $Mirror.Timer) { $Mirror.Timer.Stop() }
    if ($null -ne $Mirror.Picture.Image) {
        $Mirror.Picture.Image.Dispose()
        $Mirror.Picture.Image = $null
    }
    if (-not $Mirror.Form.IsDisposed) {
        $Mirror.Form.Close()
        $Mirror.Form.Dispose()
    }
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
        ShelfMirror = $null
        IsReady = $false
    }
    $controller | Add-Member -MemberType ScriptMethod -Name PersistMode -Value {
        param([string]$Mode)
        $this.Config.displayMode = $Mode
        Save-UyPetConfig -Config $this.Config
    }
    $controller | Add-Member -MemberType ScriptMethod -Name ReturnToShelf -Value {
        param([bool]$Persist = $true)
        if ($null -ne $this.ShelfMirror) { Remove-UyDesktopShelfMirror -Mirror $this.ShelfMirror }
        $this.Window.Visibility = [System.Windows.Visibility]::Visible
        if (-not $this.Window.IsVisible) { $this.Window.Show() }
        $this.Window.Topmost = $false
        Set-UyWindowWithinScreens -Window $this.Window
        $this.ShelfMirror = New-UyDesktopShelfMirror -Window $this.Window
        $this.ShelfHost = $this.ShelfMirror.Host
        $shelfController = $this
        $timer = [System.Windows.Threading.DispatcherTimer]::new()
        $timer.Interval = [TimeSpan]::FromMilliseconds(140)
        $timer.Add_Tick({
            try {
                if ($shelfController.Mode -ne "shelf" -or $null -eq $shelfController.ShelfMirror) { return }
                Set-UyShelfMirrorFrame -Mirror $shelfController.ShelfMirror -Path (Get-UyShelfSpritePath -Window $shelfController.Window)
            }
            catch { try { Write-UyPetLog "Shelf animation frame was skipped: $($_.Exception.Message)" "WARN" } catch {} }
        }.GetNewClosure())
        $this.ShelfMirror.Timer = $timer
        $timer.Start()
        $menuPopup = $this.Window.FindName("MenuPopup")
        $speechPopup = $this.Window.FindName("SpeechPopup")
        if ($null -ne $menuPopup) {
            $menuPopup.PopupAnimation = [System.Windows.Controls.Primitives.PopupAnimation]::None
            $menuPopup.IsOpen = $false
        }
        if ($null -ne $speechPopup) {
            $speechPopup.PopupAnimation = [System.Windows.Controls.Primitives.PopupAnimation]::None
            $speechPopup.IsOpen = $false
        }
        $this.Window.Hide()
        $this.Mode = "shelf"
        $this.IsReady = $true
        if ($Persist) { $this.PersistMode("shelf") }
        Write-UyPetLog "The Lawnmower Man returned to the desktop shelf."
    }
    $controller | Add-Member -MemberType ScriptMethod -Name BringForward -Value {
        param([bool]$Persist = $true)
        if ($null -ne $this.ShelfMirror) {
            Remove-UyDesktopShelfMirror -Mirror $this.ShelfMirror
            $this.ShelfMirror = $null
        }
        $this.Window.Visibility = [System.Windows.Visibility]::Visible
        if (-not $this.Window.IsVisible) { $this.Window.Show() }
        $menuPopup = $this.Window.FindName("MenuPopup")
        $speechPopup = $this.Window.FindName("SpeechPopup")
        if ($null -ne $menuPopup) { $menuPopup.PopupAnimation = [System.Windows.Controls.Primitives.PopupAnimation]::Fade }
        if ($null -ne $speechPopup) { $speechPopup.PopupAnimation = [System.Windows.Controls.Primitives.PopupAnimation]::Fade }
        if ($this.Window.WindowState -eq [System.Windows.WindowState]::Minimized) { $this.Window.WindowState = [System.Windows.WindowState]::Normal }
        $this.Mode = "floating"
        $this.ShelfHost = [IntPtr]::Zero
        $this.IsReady = $true
        Set-UyWindowWithinScreens -Window $this.Window
        $this.Window.Topmost = $false
        $this.Window.Topmost = [bool]$this.Config.alwaysOnTop
        $this.Window.Activate()
        $this.Window.Focus()
        $handle = Get-UyPetNativeHandle -Window $this.Window
        if ($handle -ne [IntPtr]::Zero) {
            [void][UrbanYardsDesktopLayer]::ShowWindowAsync($handle, 9)
            [void][UrbanYardsDesktopLayer]::SetForegroundWindow($handle)
        }
        if ($Persist) { $this.PersistMode("floating") }
        Write-UyPetLog "The Lawnmower Man was brought forward."
    }
    $controller | Add-Member -MemberType ScriptMethod -Name ApplySavedMode -Value {
        $mode = if ([string]$this.Config.displayMode -eq "shelf") { "shelf" } else { "floating" }
        if ($mode -eq "shelf") { $this.ReturnToShelf($false) } else { $this.BringForward($false) }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name DetachForExit -Value {
        if ($null -ne $this.ShelfMirror) { try { Remove-UyDesktopShelfMirror -Mirror $this.ShelfMirror } catch {} }
        $this.ShelfMirror = $null
        $this.IsReady = $false
        $this.ShelfHost = [IntPtr]::Zero
    }
    return $controller
}
