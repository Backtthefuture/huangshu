# Skill Hub Windows Startup Manager
# Save as: skill-hub-startup.ps1

param(
    [Parameter(Position=0)]
    [ValidateSet("enable", "disable", "start", "stop", "status")]
    [string]$Action = "status"
)

$ServiceName = "skill-hub"
$StartupRegKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"

function Get-Status {
    $regValue = Get-ItemProperty -Path $StartupRegKey -Name $ServiceName -ErrorAction SilentlyContinue
    $running = Get-Process -Name "node" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like "*skill-hub*" } |
        Select-Object -First 1

    @{
        AutoStart = ($regValue -ne $null)
        Running = ($running -ne $null)
    }
}

switch ($Action) {
    "status" {
        $s = Get-Status
        Write-Host "Auto-start: $(if($s.AutoStart){'Enabled'}else{'Disabled'})"
        Write-Host "Running:    $(if($s.Running){'Yes'}else{'No'})"
    }
    "enable" {
        Set-ItemProperty -Path $StartupRegKey -Name $ServiceName -Value "skill-hub"
        Write-Host "Enabled auto-start"
    }
    "disable" {
        Remove-ItemProperty -Path $StartupRegKey -Name $ServiceName -ErrorAction SilentlyContinue
        Write-Host "Disabled auto-start"
    }
    "start" {
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c start skill-hub" -WindowStyle Hidden
        Write-Host "Started Skill Hub"
    }
    "stop" {
        Get-Process -Name "node" -ErrorAction SilentlyContinue |
            Where-Object { $_.CommandLine -like "*skill-hub*" } |
            Stop-Process -Force
        Write-Host "Stopped Skill Hub"
    }
}
