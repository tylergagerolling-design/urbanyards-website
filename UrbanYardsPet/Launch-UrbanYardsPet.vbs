Option Explicit

Dim shell, fileSystem, appRoot, runtimePath, scriptPath, command
Set shell = CreateObject("WScript.Shell")
Set fileSystem = CreateObject("Scripting.FileSystemObject")
appRoot = fileSystem.GetParentFolderName(WScript.ScriptFullName)
runtimePath = fileSystem.BuildPath(appRoot, "runtime\pwsh.exe")
scriptPath = fileSystem.BuildPath(appRoot, "Start-UrbanYardsPet.ps1")

If Not fileSystem.FileExists(runtimePath) Then runtimePath = "powershell.exe"
command = Chr(34) & runtimePath & Chr(34) & " -NoProfile -STA -WindowStyle Hidden -ExecutionPolicy Bypass -File " & Chr(34) & scriptPath & Chr(34) & " -TrayOnly"
shell.Run command, 0, False
