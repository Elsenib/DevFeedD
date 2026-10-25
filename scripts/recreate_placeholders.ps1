#!/usr/bin/env pwsh
# Bu skript uploads/avatars qovluğunda bəzi önəmli avatar fayllarının placeholderlarını yaradır.
$avatars = @(
    '1781297240149-193589668.jpg',
    '1781297782267-531077861.png',
    '1781297922374-920281766.png',
    '1781298096964-564818174.png',
    '1781298197672-632217116.png',
    '1781298471094-751463305.jpg',
    '1781298605163-215357985.jpg',
    '1781301862459-953659258.jpg'
)

$avatarsDir = Join-Path -Path (Get-Location) -ChildPath 'server\uploads\avatars'
if (-not (Test-Path $avatarsDir)) {
    New-Item -ItemType Directory -Path $avatarsDir -Force | Out-Null
}

foreach ($a in $avatars) {
    $path = Join-Path $avatarsDir $a
    if (-not (Test-Path $path)) {
        # Yarat: boş fayl placeholder olaraq
        New-Item -ItemType File -Path $path -Force | Out-Null
        Write-Host "Placeholder created: $path"
    } else {
        Write-Host "Exists: $path"
    }
}

Write-Host 'Done. Review placeholders at server\uploads\avatars.'

# Əlavə: əgər Git-də silinmiş izlər varsa, onları geri qaytarmağa çalışın (şərh olaraq):
# git restore --source=HEAD -- server/uploads/avatars/*
