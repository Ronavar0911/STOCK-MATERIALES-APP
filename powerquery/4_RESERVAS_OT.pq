// =====================================================================
// RESERVAS_OT  (Cargar en tabla)
// Materiales reservados en OTs (IW13) con clase de orden (IW39 o prefijo),
// datos de la OT y si el equipo pertenece a la lista de riego (IH08).
// =====================================================================
let
    R    = SAP[IW13],
    OT   = Table.Distinct(Table.SelectColumns(SAP[IW39], {"Orden", "Clase de orden", "Texto breve", "Fecha de creación",
             "Status de usuario", "Denominación de objeto técnico", "Pto.tbjo.responsable"}, MissingField.UseNull), {"Orden"}),
    J    = Table.NestedJoin(R, {"Orden"}, OT, {"Orden"}, "OT", JoinKind.LeftOuter),
    E    = Table.ExpandTableColumn(J, "OT", {"Clase de orden", "Texto breve", "Fecha de creación", "Status de usuario",
             "Denominación de objeto técnico", "Pto.tbjo.responsable"}, {"Clase_IW39", "Texto_OT", "Fecha_creacion_OT",
             "Status_usuario_OT", "Equipo_denominacion", "Pto_trabajo_resp"}),
    C    = Table.AddColumn(E, "Clase_OT", each if [Clase_IW39] <> null then [Clase_IW39] else SAP[ClasePorOrden]([Orden]), type text),
    Eq   = List.Buffer(List.Distinct(SAP[IH08][Equipo])),
    R1   = Table.AddColumn(C, "Equipo_riego", each if List.Contains(Eq, [Equipo]) then "Sí" else "No", type text),
    P    = Table.AddColumn(R1, "Pendiente_retirar", each List.Max({0, (if [Reservado] = null then 0 else [Reservado]) - (if [Tomados] = null then 0 else [Tomados])}), type number),
    Sel  = Table.SelectColumns(P, {"Orden", "Clase_OT", "Texto_OT", "Fecha_creacion_OT", "Status_usuario_OT", "Material",
             "Texto breve de material", "Reservado", "Tomados", "Pendiente_retirar", "UM", "Equipo", "Equipo_denominacion",
             "Equipo_riego", "Ubicación técnica", "Puesto de trabajo", "Pto_trabajo_resp"}, MissingField.UseNull)
in
    Sel
