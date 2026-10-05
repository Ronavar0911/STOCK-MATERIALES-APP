// =====================================================================
// OTS  (Cargar en tabla)
// Órdenes de IW39 con su equipo, costo real y si el equipo está en la lista de riego (IH08).
// Alimenta la pestaña "Equipos" de la app web.
// =====================================================================
let
    O    = SAP[IW39],
    Eq   = List.Buffer(List.Distinct(SAP[IH08][Equipo])),
    R    = Table.AddColumn(O, "Equipo_riego", each if List.Contains(Eq, [Equipo]) then "Sí" else "No", type text),
    Ty   = Table.TransformColumnTypes(R, {{"Costes tot.reales", type number}}),
    Sel  = Table.SelectColumns(Ty, {"Orden", "Clase de orden", "Texto breve", "Fecha de creación", "Equipo",
             "Denominación de objeto técnico", "Ubicación técnica", "Denominación de la ubicación técnica", "Status de usuario",
             "Costes tot.reales", "Pto.tbjo.responsable", "Grupo planificación", "Equipo_riego"}, MissingField.UseNull)
in
    Sel
