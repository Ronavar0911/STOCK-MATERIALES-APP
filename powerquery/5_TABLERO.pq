// =====================================================================
// TABLERO  (Cargar en tabla)  — una fila por material
// Stock actual (MB52) + base histórica (tblBaseHistorica) + consumo temporada (MB51)
// + SOLPED pendientes + reservas OT + mínimo manual de críticos (tblCriticos).
// Mínimo = MAX(promedio mensual ajustado × MesesMin (solo Regular/Intermitente), Mínimo manual)
// =====================================================================
let
    MesesMin = Number.From(SAP[Valor]("MesesMin")),
    MesesMax = Number.From(SAP[Valor]("MesesMax")),
    FSob     = Number.From(SAP[Valor]("FactorSobrestock")),
    Ini      = SAP[InicioActual],
    Z        = (x) => if x = null then 0 else x,

    // ---- Stock por material ----
    S0   = SAP[MB52],
    Stk  = Table.Group(S0, {"Material"}, {
             {"Descripcion_MB52", each List.First([#"Texto breve de material"]), type text},
             {"UM_MB52", each List.First([#"Unidad medida base"]), type text},
             {"Grupo_articulos", each List.First([#"Grupo de artículos"]), type text},
             {"Stock", each List.Sum([#"Libre utilización"]), type number},
             {"Valor_stock", each List.Sum([#"Valor libre util."]), type number},
             {"Almacenes_con_stock", each Text.Combine(List.Sort(List.Distinct(Table.SelectRows(_, each [#"Libre utilización"] > 0)[#"Denominación-almacén"])), " / "), type text}}),

    // ---- Base histórica (estática, hoja BASE_HISTORICA) ----
    B    = Table.TransformColumnTypes(Excel.CurrentWorkbook(){[Name = "tblBaseHistorica"]}[Content], {{"Material", type text},
             {"Prom_mensual_ajustado", type number}, {"Prom_mensual_simple", type number}, {"Ultimo_consumo", type date}}),

    // ---- Críticos (mínimo manual) ----
    Cr0  = Excel.CurrentWorkbook(){[Name = "tblCriticos"]}[Content],
    Cr   = Table.SelectRows(Table.TransformColumnTypes(Table.SelectColumns(Cr0, {"Material", "Minimo_manual", "Motivo"}),
             {{"Material", type text}, {"Minimo_manual", type number}}), each [Material] <> null and [Minimo_manual] <> null),

    // ---- Movimientos de la temporada actual ----
    M    = Table.SelectRows(SAP[MB51], each [#"Fe.contabilización"] >= Ini),
    CT   = Table.Group(Table.SelectRows(M, each List.Contains({201, 202, 261, 262, 221, 222}, [#"Clase de movimiento"])), {"Material"},
             {{"Cons_temporada_actual", each -List.Sum([#"Ctd.en UM entrada"]), type number}}),
    EN   = Table.Group(Table.SelectRows(M, each List.Contains({101, 102}, [#"Clase de movimiento"])), {"Material"},
             {{"Entradas_temporada_actual", each List.Sum([#"Ctd.en UM entrada"]), type number}}),

    // ---- Precio unitario de respaldo (MB51: importe / cantidad, en valor absoluto) ----
    PMv  = Table.Group(Table.SelectRows(SAP[MB51], each List.Contains({101, 201, 261, 221}, [#"Clase de movimiento"]) and [#"Ctd.en UM entrada"] <> 0 and [#"Ctd.en UM entrada"] <> null),
             {"Material"}, {{"Precio_mov", each List.Sum(List.Transform([#"Impte.mon.local"], each Number.Abs(Z(_)))) / List.Sum(List.Transform([#"Ctd.en UM entrada"], Number.Abs)), type number}}),

    // ---- SOLPED pendientes ----
    SP   = Table.SelectRows(SOLPED_SEGUIMIENTO, each [Material] <> null),
    SPg  = Table.Group(SP, {"Material"}, {
             {"Pend_sin_OC", each List.Sum(Table.SelectRows(_, each [Estado] = "1 Solicitado sin OC")[Pendiente_llegar]), type number},
             {"Pend_en_transito", each List.Sum(Table.SelectRows(_, each [Estado] = "2 OC en tránsito" or [Estado] = "3 Recibido parcial")[Pendiente_llegar]), type number},
             {"Ultima_solped", each List.Max([#"Fecha de solicitud"]), type date}}),

    // ---- Reservas OT pendientes de retirar ----
    RS   = Table.Group(Table.SelectRows(RESERVAS_OT, each [Material] <> null), {"Material"}, {
             {"Reservado_OM01", each List.Sum(Table.SelectRows(_, each [Clase_OT] = "OM01")[Pendiente_retirar]), type number},
             {"Reservado_OM03", each List.Sum(Table.SelectRows(_, each [Clase_OT] = "OM03")[Pendiente_retirar]), type number},
             {"Reservado_otros", each List.Sum(Table.SelectRows(_, each [Clase_OT] <> "OM01" and [Clase_OT] <> "OM03")[Pendiente_retirar]), type number}}),

    // ---- Universo de materiales ----
    Mats = Table.FromColumns({List.Distinct(List.Combine({Stk[Material], B[Material], CT[Material]}))}, {"Material"}),
    Une  = (t as table, o as table, cols as list) as table =>
             Table.ExpandTableColumn(Table.NestedJoin(t, {"Material"}, o, {"Material"}, "x", JoinKind.LeftOuter), "x", cols),
    J1   = Une(Mats, Stk, List.RemoveItems(Table.ColumnNames(Stk), {"Material"})),
    J2   = Une(J1, B, List.RemoveItems(Table.ColumnNames(B), {"Material"})),
    J3   = Une(J2, CT, {"Cons_temporada_actual"}),
    J4   = Une(J3, EN, {"Entradas_temporada_actual"}),
    J5   = Une(J4, SPg, {"Pend_sin_OC", "Pend_en_transito", "Ultima_solped"}),
    J6   = Une(J5, RS, {"Reservado_OM01", "Reservado_OM03", "Reservado_otros"}),
    J7a  = Une(J6, Cr, {"Minimo_manual", "Motivo"}),
    J7   = Une(J7a, PMv, {"Precio_mov"}),

    // ---- Cálculos ----
    Fix  = Table.TransformColumns(J7, {{"Stock", Z, type number}, {"Cons_temporada_actual", Z, type number},
             {"Entradas_temporada_actual", Z, type number}, {"Pend_sin_OC", Z, type number}, {"Pend_en_transito", Z, type number},
             {"Prom_mensual_ajustado", Z, type number}, {"Reservado_OM01", Z, type number}, {"Reservado_OM03", Z, type number},
             {"Reservado_otros", Z, type number}, {"Tipo_demanda", each if _ = null then "Sin consumo" else _, type text}}),
    Desc = Table.AddColumn(Fix, "Desc", each if [Descripcion_MB52] <> null then [Descripcion_MB52] else [Descripcion], type text),
    UMc  = Table.AddColumn(Desc, "UMx", each if [UM_MB52] <> null then [UM_MB52] else [UM], type text),
    Pre  = Table.AddColumn(UMc, "Precio_unit", each if [Stock] > 0 and Z([Valor_stock]) > 0 then [Valor_stock] / [Stock] else [Precio_mov], type number),
    MinS = Table.AddColumn(Pre, "Minimo_sugerido", each
             if [Tipo_demanda] = "Regular" or [Tipo_demanda] = "Intermitente" then Number.RoundUp([Prom_mensual_ajustado] * MesesMin) else 0, type number),
    Min  = Table.AddColumn(MinS, "Minimo", each List.Max({[Minimo_sugerido], Z([Minimo_manual])}), type number),
    Max  = Table.AddColumn(Min, "Maximo", each List.Max({Number.RoundUp([Prom_mensual_ajustado] * MesesMax), [Minimo]}), type number),
    Cob  = Table.AddColumn(Max, "Cobertura_meses", each if [Prom_mensual_ajustado] > 0 then [Stock] / [Prom_mensual_ajustado] else null, type number),
    Disp = Table.AddColumn(Cob, "Disponible_proyectado", each [Stock] + [Pend_en_transito] + [Pend_sin_OC], type number),
    Ped  = Table.AddColumn(Disp, "Cant_sugerida_pedir", each
             if [Minimo] > 0 and [Disponible_proyectado] < [Minimo] then Number.RoundUp([Maximo] - [Disponible_proyectado]) else 0, type number),
    Est  = Table.AddColumn(Ped, "Estado", each
             if [Minimo] <= 0 then "Sin mínimo"
             else if [Stock] <= 0 and [Pend_en_transito] + [Pend_sin_OC] <= 0 then "Quiebre"
             else if [Stock] < [Minimo] and [Disponible_proyectado] < [Minimo] then "Pedir"
             else if [Stock] < [Minimo] then "En camino"
             else if [Stock] > [Maximo] * FSob then "Sobrestock"
             else "OK", type text),
    Out  = Table.SelectColumns(Est, {"Material", "Desc", "UMx", "Grupo_articulos", "Estado", "Tipo_demanda", "Stock", "Valor_stock",
             "Minimo", "Maximo", "Minimo_sugerido", "Minimo_manual", "Motivo", "Cobertura_meses", "Cant_sugerida_pedir",
             "Pend_sin_OC", "Pend_en_transito", "Ultima_solped", "Disponible_proyectado", "Cons_temporada_actual",
             "Entradas_temporada_actual", "Prom_mensual_ajustado", "Prom_mensual_simple", "Meses_con_consumo",
             "Temporadas_con_consumo", "Cons_2023_2024", "Cons_2024_2025", "Cons_2025_2026", "Pico_pct", "Pct_proyecto",
             "Ultimo_consumo", "Reservado_OM01", "Reservado_OM03", "Reservado_otros", "Almacenes_con_stock", "Precio_unit"}, MissingField.UseNull),
    Ren  = Table.RenameColumns(Out, {{"Desc", "Descripcion"}, {"UMx", "UM"}})
in
    Ren
