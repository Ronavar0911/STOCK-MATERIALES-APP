// =====================================================================
// SAP  (Solo conexión)  — lee el archivo .xlsx MÁS RECIENTE de cada carpeta
// Rutas en la tabla tblCarpetas (hoja PARAMETROS). Excluye almacenes de tblParametros.
// =====================================================================
let
    Par      = Excel.CurrentWorkbook(){[Name="tblParametros"]}[Content],
    xValor    = (n as text) => Par{[Parametro = n]}[Valor],
    Carp     = Excel.CurrentWorkbook(){[Name="tblCarpetas"]}[Content],
    Ruta     = (f as text) as text => Carp{[Fuente = f]}[Carpeta],
    Excluir  = List.Transform(Text.Split(Text.From(xValor("AlmacenesExcluidos")), ","), Text.Trim),

    // ---- Último archivo de una carpeta ----
    Ultimo = (f as text) as table =>
        let
            Archivos = Folder.Files(Ruta(f)),
            Xlsx     = Table.SelectRows(Archivos, each Text.Lower([Extension]) = ".xlsx" and not Text.StartsWith([Name], "~$")),
            Ord      = Table.Sort(Xlsx, {{"Date modified", Order.Descending}}),
            Libro    = Excel.Workbook(Ord{0}[Content], null, true),
            Hojas    = Table.SelectRows(Libro, each [Kind] = "Sheet"),
            Hoja     = try Hojas{[Item = "Sheet1"]}[Data] otherwise Hojas{0}[Data],
            Tabla    = Table.PromoteHeaders(Hoja, [PromoteAllScalars = true]),
            SinVac   = Table.TransformColumns(Tabla, List.Transform(Table.ColumnNames(Tabla), (c) => {c, (v) => if v is text and Text.Trim(v) = "" then null else v}))
        in
            SinVac,

    // ---- Temporada: inicia el lunes de la semana ISO 27 ----
    InicioTemp = (y as number) as date =>
        let j4 = #date(y, 1, 4), lunes = Date.AddDays(j4, -Date.DayOfWeek(j4, Day.Monday))
        in Date.AddDays(lunes, 26 * 7),
    xTemporada = (d as nullable date) as nullable text =>
        if d = null then null else
        let y = Date.Year(d), a = if d >= InicioTemp(y) then y else y - 1
        in Text.From(a) & "/" & Text.From(a + 1),
    xHoy          = Date.From(DateTime.LocalNow()),
    xInicioActual = if xHoy >= InicioTemp(Date.Year(xHoy)) then InicioTemp(Date.Year(xHoy)) else InicioTemp(Date.Year(xHoy) - 1),

    // ---- Clase de OT por prefijo de número de orden ----
    xClasePorOrden = (o as any) as nullable text =>
        if o = null then null else
        let p = Text.Start(Text.From(o), 3)
        in if p = "600" then "OM01" else if p = "630" then "OM03" else if p = "640" then "OM04" else if p = "620" then "OM02" else "Otro",

    // ---- xMB51 (movimientos) ----
    xMB51 =
        let
            T  = Ultimo("MB51"),
            S  = Table.SelectColumns(T, {"Fe.contabilización", "Clase de movimiento", "Material", "Texto breve de material",
                    "Ctd.en UM entrada", "Un.medida de entrada", "Impte.mon.local", "Almacén", "Referencia", "Nombre del usuario",
                    "Pedido", "Dest.mercancía", "Documento material", "Orden"}, MissingField.UseNull),
            Ty = Table.TransformColumnTypes(S, {{"Fe.contabilización", type date}, {"Clase de movimiento", Int64.Type},
                    {"Material", type text}, {"Ctd.en UM entrada", type number}, {"Impte.mon.local", type number},
                    {"Almacén", type text}, {"Pedido", type text}, {"Documento material", type text}, {"Referencia", type text}, {"Orden", type text}}),
            F  = Table.SelectRows(Ty, each [Material] <> null and [#"Fe.contabilización"] <> null and not List.Contains(Excluir, [Almacén]))
        in F,

    // ---- xMB52 (stock) ----
    xMB52 =
        let
            T  = Ultimo("MB52"),
            Ty = Table.TransformColumnTypes(T, {{"Material", type text}, {"Libre utilización", type number},
                    {"Valor libre util.", type number}, {"Almacén", type text}}),
            F  = Table.SelectRows(Ty, each [Material] <> null and not List.Contains(Excluir, [Almacén]))
        in F,

    // ---- xME5A (solicitudes de pedido) ----
    xME5A =
        let
            T  = Ultimo("ME5A"),
            Ty = Table.TransformColumnTypes(T, {{"Fecha de solicitud", type date}, {"Solicitud de pedido", type text},
                    {"Pos.solicitud pedido", Int64.Type}, {"Material", type text}, {"Cantidad solicitada", type number},
                    {"Cantidad pedida", type number}, {"Pedido", type text}, {"Fecha orden compra", type date},
                    {"Fecha de liberación", type date}, {"Valor total", type number}})
        in Ty,

    // ---- IW13 / IW39 / IH08 ----
    xIW13 = Table.TransformColumnTypes(Ultimo("IW13"), {{"Material", type text}, {"Orden", type text}, {"Equipo", type text},
                {"Reservado", type number}, {"Tomados", type number}}),
    xIW39 = Table.TransformColumnTypes(Ultimo("IW39"), {{"Orden", type text}, {"Equipo", type text}, {"Fecha de creación", type date}}),
    xIH08 = Table.TransformColumnTypes(Ultimo("IH08"), {{"Equipo", type text}}),

    Resultado = [
        MB51 = xMB51, MB52 = xMB52, ME5A = xME5A, IW13 = xIW13, IW39 = xIW39, IH08 = xIH08,
        InicioActual = xInicioActual, Temporada = xTemporada, ClasePorOrden = xClasePorOrden, Valor = xValor, Hoy = xHoy
    ]
in
    Resultado
