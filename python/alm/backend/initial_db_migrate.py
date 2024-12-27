import pandas as pd
from database.mssql_connection import get_mssql_connection
from database.sqlite_connection import get_sqlite_connection


def migrate_data():
    # Conectar a MSSQL
    mssql_conn = get_mssql_connection()
    query = """select vp.folioPedido, vp.cantidadPedida, vp.cantidadVerificada, vp.codigoRelacionado,
        p.descripcion as descripcion_producto,
        p.codigoFamiliaUno, 
        e.existencia,
        e.localizacion, 
        l.descripcion as descripcion_laboratorio,
        cl.descripcion as descripcion_clasificacion,
        pr.descripcion as descripcion_presentacion
    from venPedidosDet vp
    inner join genProductosCat p on vp.codigoProducto = p.codigoProducto
    inner join invControlExistenciasReg e on vp.codigoProducto = e.codigoProducto
    inner join genLaboratoriosCat l on p.codigoLaboratorio = l.codigoLaboratorio
    inner join genClasificacionesSsaCat cl on p.codigoClasificacionUno = cl.codigoClasificacionUno 
        and p.codigoClasificacionDos = cl.codigoClasificacionDos
    inner join imePresentacionesCat pr on p.codigoPresentacion = pr.codigoPresentacion
    """

    data = pd.read_sql(query, mssql_conn)
    mssql_conn.close()

    # Agregar columna 'id'
    data.insert(
        0, "id", range(1, len(data) + 1)
    )  # Inserta una columna 'id' al principio

    # Conectar a SQLite y Migrar Datos
    sqlite_conn = get_sqlite_connection()

    # Crear la tabla si no existe
    cursor = sqlite_conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS folios (
            id INTEGER PRIMARY KEY,
            folioPedido TEXT,
            cantidadPedida REAL,
            cantidadVerificada REAL,
            nombreVerificador TEXT,
            codigoRelacionado TEXT,
            descripcion_producto TEXT,
            codigoFamiliaUno TEXT,
            existencia REAL,
            localizacion TEXT,
            descripcion_laboratorio TEXT,
            descripcion_clasificacion TEXT,
            descripcion_presentacion TEXT
        )
    """
    )
    sqlite_conn.commit()

    # Insertar los datos
    data.to_sql("folios", sqlite_conn, if_exists="append", index=False)
    sqlite_conn.close()

    print("Migración completada.")


if __name__ == "__main__":
    migrate_data()
