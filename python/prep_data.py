import pandas as pd, numpy as np, json, engine as E
t=pd.read_pickle('tab.pkl'); sp=pd.read_pickle('sp.pkl'); r=pd.read_pickle('res.pkl')
m=E.load_mb51('mb51.pkl')
TABC=['Material','Descripcion','UM','Grupo_articulos','Estado','Tipo_demanda','Stock','Valor_stock','Minimo','Maximo','Minimo_sugerido','Minimo_manual',
 'Cobertura_meses','Cant_sugerida_pedir','Pend_sin_OC','Pend_en_transito','Ultima_solped','Cons_temporada_actual','Entradas_temporada_actual',
 'Prom_mensual_ajustado','Prom_mensual_simple','Meses_con_consumo','Temporadas_con_consumo','Cons_2023_2024','Cons_2024_2025','Cons_2025_2026',
 'Pico_pct','Pct_proyecto','Ultimo_consumo','Reservado_OM01','Reservado_OM03','Reservado_otros','Almacenes_con_stock','Precio_unit']
keep=(t.Stock>0)|(t.Prom_mensual_ajustado>0)|(t.Cons_temporada_actual!=0)|(t.Pend_sin_OC>0)|(t.Pend_en_transito>0)|(t.Reservado_OM01+t.Reservado_OM03+t.Reservado_otros>0)
t=t[keep].copy()
pm=m[m['Clase de movimiento'].isin([101,201,261,221])&(m['Ctd.en UM entrada']!=0)].copy()
pm['a']=pm['Impte.mon.local'].abs(); pm['q']=pm['Ctd.en UM entrada'].abs()
pg=pm.groupby('Material')[['a','q']].sum(); pmov=(pg.a/pg.q)
t['Precio_unit']=np.where((t.Stock>0)&(t.Valor_stock>0), t.Valor_stock/t.Stock.where(t.Stock>0), t.Material.map(pmov))
# descriptions for materials lacking MB52 (from base)
b=pd.read_pickle('base.pkl').set_index('Material')
t['Descripcion']=t['Descripcion'].fillna(t.Material.map(b.Descripcion)); t['UM']=t['UM'].fillna(t.Material.map(b.UM))
t=t.rename(columns={'Grupo':'Grupo_articulos'})
mv=m[m['Fe.contabilización']>=E.TEMP_INI].copy()
LBL={101:'Entrada mercancía',102:'Anul. entrada',122:'Devolución a proveedor',201:'Consumo CeCo',202:'Anul. consumo CeCo',221:'Consumo proyecto',222:'Anul. consumo proyecto',261:'Consumo OT',262:'Anul. consumo OT',301:'Traslado entre centros',309:'Traslado mat. a mat.',311:'Traslado entre almacenes',312:'Anul. traslado',321:'Calidad a libre',322:'Anul. calidad a libre',561:'Carga inicial',601:'Salida por entrega',602:'Anul. salida entrega'}
mv['Tipo_movimiento']=mv['Clase de movimiento'].map(lambda x: LBL.get(x,f'Otro ({x})'))
mv['Grupo']=np.select([mv['Clase de movimiento'].isin(E.CONS_MOV),mv['Clase de movimiento'].isin([101,102,122])],['Consumo','Entrada'],'Traslado/Otro')
mv['Consumo_neto']=np.where(mv.Grupo=='Consumo',-mv['Ctd.en UM entrada'],np.nan)
mv['Clase_OT']=None
mv['Costo_consumo']=np.where(mv.Grupo=='Consumo',-mv['Impte.mon.local'],np.nan)
mv=mv.sort_values('Fe.contabilización',ascending=False)
MVC=['Fe.contabilización','Clase de movimiento','Tipo_movimiento','Grupo','Material','Texto breve de material','Ctd.en UM entrada','Consumo_neto','Un.medida de entrada','Almacén','Dest.mercancía','Nombre del usuario','Referencia','Pedido','Clase_OT','Impte.mon.local','Costo_consumo']
SPC=['Fecha de solicitud','Solicitud de pedido','Pos.solicitud pedido','Material','Texto breve','Cantidad solicitada','Unidad de medida','Cantidad pedida','Pedido','Fecha orden compra','Nombre de proveedor','Cant_recibida','Fecha_recepcion','Pendiente_llegar','Estado','Dias_desde_solicitud','Solicitante','Valor total','Moneda']
r=r.rename(columns={'Texto breve':'Texto_OT','Fecha de creación':'Fecha_creacion_OT','Status de usuario':'Status_usuario_OT','Denominación de objeto técnico':'Equipo_denominacion'})
RSC=['Orden','Clase_OT','Texto_OT','Fecha_creacion_OT','Status_usuario_OT','Material','Texto breve de material','Reservado','Tomados','Pendiente_retirar','UM','Equipo','Equipo_denominacion','Equipo_riego','Ubicación técnica','Puesto de trabajo']
def ser(df,cols):
    out=[]
    for row in df[cols].itertuples(index=False):
        o=[]
        for v in row:
            if v is None or (isinstance(v,float) and np.isnan(v)) or v is pd.NaT: o.append(None)
            elif isinstance(v,pd.Timestamp): o.append(v.strftime('%Y-%m-%d'))
            elif isinstance(v,(float,np.floating)):
                o.append(int(v) if float(v).is_integer() and abs(v)<1e15 else round(float(v),3))
            elif isinstance(v,(np.integer,)): o.append(int(v))
            else: o.append(str(v))
        out.append(o)
    return {'cols':cols,'rows':out}
for c in ['Pedido','Solicitud de pedido','Orden','Equipo']:
    pass
sp['Pedido']=sp['Pedido'].map(lambda x: None if pd.isna(x) else str(int(x)))
mv['Pedido']=mv['Pedido'].map(lambda x: None if pd.isna(x) else str(int(x)))
r['Orden']=r['Orden'].map(lambda x: None if pd.isna(x) else str(int(x))); r['Equipo']=r['Equipo'].map(lambda x: None if pd.isna(x) else str(int(x)))
o=pd.read_pickle('iw39.pkl'); eq=pd.read_pickle('ih08.pkl')
o['Equipo_riego']=np.where(o.Equipo.isin(eq.Equipo),'Sí','No')
o['Orden']=o['Orden'].astype(str); o['Equipo']=o['Equipo'].astype(str)
OTC=['Orden','Clase de orden','Texto breve','Fecha de creación','Equipo','Denominación de objeto técnico','Ubicación técnica','Denominación de la ubicación técnica','Status de usuario','Costes tot.reales','Pto.tbjo.responsable','Grupo planificación','Equipo_riego']
D={'meta':{'generado':'2026-10-04','inicio_temporada':'2026-06-29','temporada':'2026/2027','fuente':'Exports SAP cargados el 04/10/2026 (MB51 hasta 23/09/2026)','params':E.P},
   'tab':ser(t,TABC),'sp':ser(sp,SPC),'mv':ser(mv,MVC),'res':ser(r,RSC),'ot':ser(o,OTC)}
s=json.dumps(D,ensure_ascii=False,separators=(',',':'))
open('data.json','w').write(s); print(len(s)/1e6,'MB')
