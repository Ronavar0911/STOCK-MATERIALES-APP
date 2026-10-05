/**
 * Apps Script: sirve el maestro APP_STOCK_MATERIALES.xlsx que está en Google Drive
 * para que la app web (GitHub Pages) lo lea al abrirse.
 * Implementar → Nueva implementación → Aplicación web → Ejecutar como: Yo → Acceso: Cualquier usuario.
 * Copiar la URL /exec en app/fuente.js (window.FUENTE_DATOS).
 */
const NOMBRE = 'APP_STOCK_MATERIALES.xlsx';
const CARPETA_ID = '';   // opcional: ID de la carpeta de Drive donde está el maestro (más rápido y evita homónimos)

function doGet() {
  try {
    const it = CARPETA_ID ? DriveApp.getFolderById(CARPETA_ID).getFilesByName(NOMBRE) : DriveApp.getFilesByName(NOMBRE);
    let f = null;
    while (it.hasNext()) { const x = it.next(); if (!x.isTrashed() && (!f || x.getLastUpdated() > f.getLastUpdated())) f = x; }
    if (!f) return json_({ error: 'No encontré ' + NOMBRE + ' en Google Drive.' });
    return json_({ nombre: f.getName(), actualizado: f.getLastUpdated().toISOString(),
                   b64: Utilities.base64Encode(f.getBlob().getBytes()) });
  } catch (e) {
    return json_({ error: 'Error en Apps Script: ' + e.message });
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
