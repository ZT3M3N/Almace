import pandas as pd
from database.mssql_connection import get_mssql_connection
from database.sqlite_connection import get_sqlite_connection


def migrate_data():
    try:
        print("Iniciando proceso de sincronización...")

        # 1. Obtener datos existentes de SQLite
        sqlite_conn = get_sqlite_connection()
        existing_data = pd.read_sql(
            """
            SELECT folioPedido, codigoRelacionado 
            FROM folios
        """,
            sqlite_conn,
        )

        print(f"Registros existentes en SQLite: {len(existing_data)}")

        # 2. Obtener datos de SQL Server
        mssql_conn = get_mssql_connection()
        query = """
        select 
            vp.folioPedido, 
            vp.cantidadPedida, 
            vp.cantidadVerificada, 
            vp.codigoRelacionado,
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
        new_data = pd.read_sql(query, mssql_conn)
        mssql_conn.close()

        print(f"Registros obtenidos de SQL Server: {len(new_data)}")

        # 3. Identificar registros nuevos
        existing_data["key"] = existing_data.apply(
            lambda x: f"{x['folioPedido']}_{x['codigoRelacionado']}", axis=1
        )
        new_data["key"] = new_data.apply(
            lambda x: f"{x['folioPedido']}_{x['codigoRelacionado']}", axis=1
        )

        new_records = new_data[~new_data["key"].isin(existing_data["key"])].copy()
        new_records = new_records.drop("key", axis=1)

        print(f"Registros nuevos identificados: {len(new_records)}")

        if len(new_records) > 0:
            # 4. Obtener el último ID
            cursor = sqlite_conn.cursor()
            cursor.execute("SELECT MAX(id) FROM folios")
            max_id = cursor.fetchone()[0] or 0

            # 5. Asignar nuevos IDs
            new_records.insert(
                0, "id", range(max_id + 1, max_id + 1 + len(new_records))
            )

            # 6. Insertar nuevos registros
            new_records.to_sql("folios", sqlite_conn, if_exists="append", index=False)
            print(f"Se agregaron {len(new_records)} registros nuevos")
            mensaje = f"Sincronización completada. Se agregaron {len(new_records)} registros nuevos."
        else:
            mensaje = "No hay registros nuevos para agregar"

        sqlite_conn.close()
        return True, mensaje

    except Exception as e:
        print(f"Error durante la sincronización: {str(e)}")
        return False, f"Error durante la sincronización: {str(e)}"
