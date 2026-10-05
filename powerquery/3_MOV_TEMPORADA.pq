// =====================================================================
// MOV_TEMPORADA  (Cargar en tabla)
// Todos los movimientos MB51 desde el inicio de la temporada actual (semana 27),
// con etiqueta de movimiento, consumo neto y costo del consumo (S/) con signo positivo.
// Si el export MB51 incluye la columna "Orden", se clasifica OM01 / OM03 / OM04.
// =====================================================================
let
    Ini  = SAP[InicioActual],
    M    = Table.SelectRows(SAP[MB51], each [#"Fe.contabilización"] >= Ini),
    Etq  = [#"101" = "Entrada mercancía", #"102" = "Anul. entrada", #"122" = "Devolución a proveedor",
            #"201" = "Consumo CeCo", #"202" = "Anul. consumo CeCo", #"221" = "Consumo proyecto",
            #"222" = "Anul. consumo proyecto", #"261" = "Consumo OT", #"262" = "Anul. consumo OT",
            #"301" = "Traslado entre centros", #"309" = "Traslado mat. a mat.", #"311" = "Traslado entre almacenes",
            #"312" = "Anul. traslado", #"321" = "Calidad a libre", #"322" = "Anul. calidad a libre",
            #"561" = "Carga inicial", #"601" = "Salida por entrega", #"602" = "Anul. salida entrega"],
    A1   = Table.AddColumn(M, "Tipo_movimiento", each Record.FieldOrDefault(Etq, Text.From([#"Clase de movimiento"]), "Otro (" & Text.From([#"Clase de movimiento"]) & ")"), type text),
    A2   = Table.AddColumn(A1, "Grupo", each
             if List.Contains({201, 202, 261, 262, 221, 222}, [#"Clase de movimiento"]) then "Consumo"
             else if List.Contains({101, 102, 122}, [#"Clase de movimiento"]) then "Entrada"
             else "Traslado/Otro", type text),
    A3   = Table.AddColumn(A2, "Consumo_neto", each if [Grupo] = "Consumo" then -[#"Ctd.en UM entrada"] else null, type number),
    A3b  = Table.AddColumn(A3, "Costo_consumo", each if [Grupo] = "Consumo" then -[#"Impte.mon.local"] else null, type number),
    A4   = Table.AddColumn(A3b, "Clase_OT", each SAP[ClasePorOrden]([Orden]), type text),
    A5   = Table.AddColumn(A4, "Temporada", each SAP[Temporada]([#"Fe.contabilización"]), type text),
    Ord  = Table.Sort(A5, {{"Fe.contabilización", Order.Descending}})
in
    Ord
