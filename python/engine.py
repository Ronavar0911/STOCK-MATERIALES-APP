"""Motor de referencia (Python) — misma lógica que las consultas Power Query.
Sirve para generar la BASE_HISTORICA y validar los resultados del Excel."""
import pandas as pd, numpy as np

CONS_MOV = {201: 'Consumo CeCo', 202: 'Anul. consumo CeCo', 261: 'Consumo OT', 262: 'Anul. consumo OT',
            221: 'Consumo proyecto', 222: 'Anul. consumo proyecto'}
ENT_MOV = {101: 'Entrada mercancía', 102: 'Anul. entrada'}
EXCL_ALM = {'1030'}
HIST_INI, HIST_FIN = pd.Timestamp('2023-07-03'), pd.Timestamp('2026-06-28')   # sem27-2023 .. sem26-2026
TEMP_INI = pd.Timestamp('2026-06-29')                                        # inicio temporada 2026/2027
N_MESES = 36
HOY = pd.Timestamp('2026-10-04')
P = dict(MesesMin=2, MesesMax=4, FactorPico=3)


def temporada(fechas):
    iso = fechas.dt.isocalendar()
    y = np.where(iso.week.astype(int) >= 27, iso.year.astype(int), iso.year.astype(int) - 1)
    return pd.Series(y, index=fechas.index).astype(str) + '/' + (pd.Series(y, index=fechas.index) + 1).astype(str)


def load_mb51(path_or_pkl):
    m = pd.read_pickle(path_or_pkl) if str(path_or_pkl).endswith('.pkl') else pd.read_excel(path_or_pkl)
    m = m[m['Fe.contabilización'].notna() & m['Material'].notna() & ~m['Almacén'].isin(EXCL_ALM)].copy()
    m['Clase de movimiento'] = m['Clase de movimiento'].astype(int)
    m['Temporada'] = temporada(m['Fe.contabilización'])
    return m


def base_historica(m, stock_desc):
    c = m[m['Clase de movimiento'].isin(CONS_MOV) & m['Fe.contabilización'].between(HIST_INI, HIST_FIN)].copy()
    c['Cons'] = -c['Ctd.en UM entrada']
    c['Mes'] = c['Fe.contabilización'].dt.to_period('M')
    c['Proy'] = np.where(c['Clase de movimiento'].isin([221, 222]), c['Cons'], 0)
    mens = c.groupby(['Material', 'Mes'])['Cons'].sum()
    mens = mens[mens > 0]
    rows = []
    for mat, s in mens.groupby(level=0):
        v = s.values
        med = np.median(v)
        cap = P['FactorPico'] * med if len(v) >= 3 else np.inf
        adj = np.minimum(v, cap).sum() / N_MESES
        rows.append(dict(Material=mat, Meses_con_consumo=len(v), Mes_pico=v.max(),
                         Pico_pct=v.max() / v.sum(), Prom_mensual_simple=v.sum() / N_MESES,
                         Prom_mensual_ajustado=adj, Meses_recortados=int((v > cap).sum())))
    b = pd.DataFrame(rows)
    t = c.pivot_table(index='Material', columns='Temporada', values='Cons', aggfunc='sum').reset_index()
    t.columns = ['Material'] + ['Cons_' + x.replace('/', '_') for x in t.columns[1:]]
    pr = c.groupby('Material').agg(Cons_total=('Cons', 'sum'), Cons_proy=('Proy', 'sum')).reset_index()
    ult = m[m['Clase de movimiento'].isin([201, 261, 221])].groupby('Material')['Fe.contabilización'].max().rename('Ultimo_consumo')
    b = b.merge(t, on='Material', how='left').merge(pr, on='Material', how='left').merge(ult, on='Material', how='left')
    b['Pct_proyecto'] = (b['Cons_proy'] / b['Cons_total']).clip(0, 1).fillna(0)
    tc = b[[x for x in b.columns if x.startswith('Cons_20')]].gt(0).sum(axis=1)
    b['Temporadas_con_consumo'] = tc
    b['Tipo_demanda'] = np.select(
        [b.Ultimo_consumo < HOY - pd.Timedelta(days=365), tc <= 1, b.Meses_con_consumo >= 18, b.Meses_con_consumo >= 6],
        ['Inactivo', 'Puntual', 'Regular', 'Intermitente'], 'Esporádico')
    b = b.drop(columns=['Cons_proy']).merge(stock_desc, on='Material', how='left')
    cols = ['Material', 'Descripcion', 'UM', 'Tipo_demanda', 'Meses_con_consumo', 'Temporadas_con_consumo', 'Cons_2023_2024', 'Cons_2024_2025',
            'Cons_2025_2026', 'Cons_total', 'Prom_mensual_simple', 'Prom_mensual_ajustado', 'Mes_pico', 'Pico_pct',
            'Meses_recortados', 'Pct_proyecto', 'Ultimo_consumo']
    return b[cols].sort_values('Material')


def stock(mb52):
    s = mb52[~mb52['Almacén'].isin(EXCL_ALM)]
    g = s.groupby('Material').agg(Descripcion=('Texto breve de material', 'first'), UM=('Unidad medida base', 'first'),
                                  Stock=('Libre utilización', 'sum'), Valor_stock=('Valor libre util.', 'sum'),
                                  Grupo=('Grupo de artículos', 'first')).reset_index()
    alm = s[s['Libre utilización'] > 0].groupby('Material')['Denominación-almacén'].agg(lambda x: ' / '.join(sorted(set(x)))).rename('Almacenes_con_stock')
    return g.merge(alm, on='Material', how='left')


def solped(me5a, m):
    s = me5a.copy()
    gr = m[m['Clase de movimiento'].isin([101, 102]) & m['Pedido'].notna()].copy()
    gr['Rec'] = gr['Ctd.en UM entrada']
    rec = gr.groupby(['Pedido', 'Material'])['Rec'].sum().reset_index()
    rec_f = gr.groupby(['Pedido', 'Material'])['Fe.contabilización'].max().rename('Fecha_recepcion').reset_index()
    s = s.merge(rec, on=['Pedido', 'Material'], how='left').merge(rec_f, on=['Pedido', 'Material'], how='left')
    s['Cant_recibida'] = s['Rec'].fillna(0).clip(lower=0)
    s = s.drop(columns='Rec')
    pend_oc = (s['Cantidad pedida'] - s['Cant_recibida']).clip(lower=0)
    s['Estado'] = np.select(
        [s['Pedido'].isna(), s['Material'].isna(), s['Cant_recibida'] >= s['Cantidad pedida'],
         s['Cant_recibida'] > 0],
        ['1 Solicitado sin OC', '5 Servicio con OC', '4 Recibido', '3 Recibido parcial'], '2 OC en tránsito')
    s['Pendiente_llegar'] = np.where(s['Pedido'].isna(), s['Cantidad solicitada'], pend_oc)
    s.loc[s['Material'].isna(), 'Pendiente_llegar'] = 0
    s['Dias_desde_solicitud'] = (pd.Timestamp.today().normalize() - s['Fecha de solicitud']).dt.days
    return s


def tablero(base, stk, mt, sp, criticos=None, P=P):
    cons = mt[mt['Clase de movimiento'].isin(CONS_MOV) & (mt['Fe.contabilización'] >= TEMP_INI)].copy()
    cons['Cons'] = -cons['Ctd.en UM entrada']
    ct = cons.groupby('Material')['Cons'].sum().rename('Cons_temporada_actual')
    ent = mt[mt['Clase de movimiento'].isin(ENT_MOV) & (mt['Fe.contabilización'] >= TEMP_INI)].groupby('Material')['Ctd.en UM entrada'].sum().rename('Entradas_temporada_actual')
    pend = sp[sp['Material'].notna()].groupby('Material').agg(
        Pend_sin_OC=('Pendiente_llegar', lambda x: x[sp.loc[x.index, 'Estado'] == '1 Solicitado sin OC'].sum()),
        Pend_en_transito=('Pendiente_llegar', lambda x: x[sp.loc[x.index, 'Estado'].isin(['2 OC en tránsito', '3 Recibido parcial'])].sum()),
        Ultima_solped=('Fecha de solicitud', 'max')).reset_index()
    t = stk.merge(base.drop(columns=['Descripcion', 'UM']), on='Material', how='outer')
    t = t.merge(ct, on='Material', how='left').merge(ent, on='Material', how='left').merge(pend, on='Material', how='left')
    if criticos is not None and len(criticos):
        t = t.merge(criticos[['Material', 'Minimo_manual']], on='Material', how='left')
    else:
        t['Minimo_manual'] = np.nan
    for c in ['Stock', 'Cons_temporada_actual', 'Entradas_temporada_actual', 'Pend_sin_OC', 'Pend_en_transito', 'Prom_mensual_ajustado']:
        t[c] = t[c].fillna(0)
    t['Tipo_demanda'] = t['Tipo_demanda'].fillna('Sin consumo')
    sug = np.where(t['Tipo_demanda'].isin(['Regular', 'Intermitente']), t['Prom_mensual_ajustado'] * P['MesesMin'], 0)
    t['Minimo_sugerido'] = np.ceil(sug)
    t['Minimo'] = np.fmax(t['Minimo_sugerido'], t['Minimo_manual'].fillna(0))
    t['Maximo'] = np.fmax(np.ceil(t['Prom_mensual_ajustado'] * P['MesesMax']), t['Minimo'])
    t['Cobertura_meses'] = np.where(t['Prom_mensual_ajustado'] > 0, t['Stock'] / t['Prom_mensual_ajustado'].replace(0, np.nan), np.nan)
    disp = t['Stock'] + t['Pend_en_transito'] + t['Pend_sin_OC']
    t['Cant_sugerida_pedir'] = np.where((t['Minimo'] > 0) & (disp < t['Minimo']), np.ceil(t['Maximo'] - disp), 0)
    t['Estado'] = np.select([
        t['Minimo'] <= 0,
        (t['Stock'] <= 0) & (t['Pend_en_transito'] + t['Pend_sin_OC'] <= 0),
        (t['Stock'] < t['Minimo']) & (disp < t['Minimo']),
        (t['Stock'] < t['Minimo']),
        t['Stock'] > t['Maximo'] * 1.5,
    ], ['Sin mínimo', 'Quiebre', 'Pedir', 'En camino', 'Sobrestock'], 'OK')
    return t


def clase_por_orden(o):
    if pd.isna(o):
        return None
    p = str(int(o))[:3] if not isinstance(o, str) else o[:3]
    return {'600': 'OM01', '630': 'OM03', '640': 'OM04', '620': 'OM02'}.get(p, 'Otro')


def reservas(iw13, iw39, ih08):
    ot = iw39.drop_duplicates('Orden')[['Orden', 'Clase de orden', 'Texto breve', 'Fecha de creación', 'Status de usuario',
                                        'Denominación de objeto técnico']]
    r = iw13.merge(ot, on='Orden', how='left')
    r['Clase_OT'] = r['Clase de orden'].fillna(r['Orden'].map(clase_por_orden))
    r['Equipo_riego'] = np.where(r['Equipo'].isin(ih08['Equipo']), 'Sí', 'No')
    r['Pendiente_retirar'] = (r['Reservado'].fillna(0) - r['Tomados'].fillna(0)).clip(lower=0)
    return r


def agrega_reservas(t, r):
    g = r[r.Material.notna()].pivot_table(index='Material', columns='Clase_OT', values='Pendiente_retirar', aggfunc='sum').fillna(0)
    out = pd.DataFrame(index=g.index)
    out['Reservado_OM01'] = g.get('OM01', 0)
    out['Reservado_OM03'] = g.get('OM03', 0)
    out['Reservado_otros'] = g.drop(columns=[c for c in ['OM01', 'OM03'] if c in g.columns]).sum(axis=1)
    t = t.merge(out.reset_index(), on='Material', how='left')
    for c in ['Reservado_OM01', 'Reservado_OM03', 'Reservado_otros']:
        t[c] = t[c].fillna(0)
    return t
