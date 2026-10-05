# =====================================================================
# ACTUALIZAR_APP.ps1  -  Actualiza el maestro y la app del equipo (todo dentro de SharePoint)
# 1) Abre APP_STOCK_MATERIALES.xlsx (02_MAESTRO), ejecuta "Actualizar todo" y guarda
# 2) Genera datos.js junto a la app (03_REPORTES\APP_STOCK)  ->  OneDrive/SharePoint lo sincroniza
#    y quien abra index.html desde esa carpeta ve los datos nuevos.
# IMPORTANTE: cierra el maestro en Excel antes de ejecutar.
# =====================================================================
$Base    = "C:\Users\srosales\Hortifrut Chile SA\HFBP-AGR-PMA - Documentos\PM - C&G T2627\PM - RIEGO\MAESTRO_MANTENIMIENTO_RIEGO"
$Maestro = Join-Path $Base "02_MAESTRO\APP_STOCK_MATERIALES.xlsx"
$AppDir  = Join-Path $Base "03_REPORTES\APP_STOCK"
$SoloDatos = $false   # $true = no ejecuta "Actualizar todo" (usa el maestro tal como está guardado)

$ErrorActionPreference = "Stop"
function Paso($t) { Write-Host ""; Write-Host ">> $t" -ForegroundColor Cyan }
if (-not (Test-Path $Maestro)) { throw "No encuentro el maestro: $Maestro" }

if (-not $SoloDatos) {
    Paso "1/2 Actualizando el maestro en Excel (puede tardar varios minutos)..."
    $xl = New-Object -ComObject Excel.Application
    $xl.Visible = $false
    $xl.DisplayAlerts = $false
    try {
        $wb = $xl.Workbooks.Open($Maestro)
        if ($wb.ReadOnly) { throw "El maestro está abierto en Excel. Ciérralo y vuelve a ejecutar." }
        foreach ($c in $wb.Connections) { try { $c.OLEDBConnection.BackgroundQuery = $false } catch {} }
        $wb.RefreshAll()
        $xl.CalculateUntilAsyncQueriesDone()
        $wb.Save()
        $wb.Close($false)
    } finally {
        $xl.Quit()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
    }
    Write-Host "   Maestro actualizado y guardado." -ForegroundColor Green
}

Paso "2/2 Generando datos.js para la app..."
New-Item -ItemType Directory -Force -Path $AppDir | Out-Null
$b64   = [Convert]::ToBase64String([IO.File]::ReadAllBytes($Maestro))
$fecha = (Get-Item $Maestro).LastWriteTime.ToString("yyyy-MM-ddTHH:mm:ss")
$js    = "window.DATOS_FECHA=`"$fecha`";`nwindow.DATOS_XLSX_B64=`"$b64`";`n"
$tmp   = Join-Path $AppDir "datos.tmp"
[IO.File]::WriteAllText($tmp, $js, (New-Object System.Text.UTF8Encoding $false))
Move-Item $tmp (Join-Path $AppDir "datos.js") -Force
Write-Host "   Listo: $AppDir\datos.js  (OneDrive lo sincroniza en segundos)" -ForegroundColor Green
Read-Host "Pulsa Enter para cerrar"
