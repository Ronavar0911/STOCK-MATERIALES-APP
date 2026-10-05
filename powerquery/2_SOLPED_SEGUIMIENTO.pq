// =====================================================================
// SOLPED_SEGUIMIENTO  (Cargar en tabla)
// Estado de cada posición de SOLPED: sin OC / OC en tránsito / recibido parcial / recibido.
// La recepción se obtiene de MB51 (mov. 101 - 102) por Pedido + Material.
// =====================================================================
let
    S   = SAP[ME5A],
    GR  = Table.SelectRows(SAP[MB51], each ([#"Clase de movimiento"] = 101 or [#"Clase de movimiento"] = 102) and [Pedido] <> null),
    GRg = Table.Group(GR, {"Pedido", "Material"}, {
            {"Cant_recibida", each List.Sum([#"Ctd.en UM entrada"]), type number},
            {"Fecha_recepcion", each List.Max([#"Fe.contabilización"]), type date}}),
    J   = Table.NestedJoin(S, {"Pedido", "Material"}, GRg, {"Pedido", "Material"}, "R", JoinKind.LeftOuter),
    E   = Table.ExpandTableColumn(J, "R", {"Cant_recibida", "Fecha_recepcion"}),
    Rec = Table.TransformColumns(E, {{"Cant_recibida", each if _ = null or _ < 0 then 0 else _, type number}}),
    Est = Table.AddColumn(Rec, "Estado", each
            if [Pedido] = null then "1 Solicitado sin OC"
            else if [Material] = null then "5 Servicio con OC"
            else if [Cant_recibida] >= [#"Cantidad pedida"] then "4 Recibido"
            else if [Cant_recibida] > 0 then "3 Recibido parcial"
            else "2 OC en tránsito", type text),
    Pen = Table.AddColumn(Est, "Pendiente_llegar", each
            if [Material] = null then 0
            else if [Pedido] = null then [#"Cantidad solicitada"]
            else List.Max({0, [#"Cantidad pedida"] - [Cant_recibida]}), type number),
    Dia = Table.AddColumn(Pen, "Dias_desde_solicitud", each Duration.Days(SAP[Hoy] - [#"Fecha de solicitud"]), Int64.Type),
    Sel = Table.SelectColumns(Dia, {"Fecha de solicitud", "Solicitud de pedido", "Pos.solicitud pedido", "Material", "Texto breve",
            "Cantidad solicitada", "Unidad de medida", "Cantidad pedida", "Pedido", "Fecha orden compra", "Nombre de proveedor",
            "Cant_recibida", "Fecha_recepcion", "Pendiente_llegar", "Estado", "Dias_desde_solicitud", "Solicitante",
            "Valor total", "Moneda"}, MissingField.UseNull)
in
    Sel
