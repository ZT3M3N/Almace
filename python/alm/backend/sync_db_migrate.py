import pandas as pd
from database.mssql_connection import get_mssql_connection
from database.sqlite_connection import get_sqlite_connection
import logging

logging.basicConfig(
    filename="sync_debug.txt",
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s",
)


def migrate_data():
    try:
        print("Iniciando proceso de sincronización...")
        logging.info("Iniciando proceso de sincronización")
        # 1. Obtener el último ID de SQLite
        sqlite_conn = get_sqlite_connection()
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT MAX(id) FROM folios")
        last_local_id = cursor.fetchone()[0] or 0

        # 2. Obtener el conteo total de registros en SQL Server
        mssql_conn = get_mssql_connection()
        count_query = """
        SELECT COUNT(*) as total
        from venPedidosDet vp
        inner join genProductosCat p on vp.codigoProducto = p.codigoProducto
        inner join invControlExistenciasReg e on vp.codigoProducto = e.codigoProducto
        inner join genLaboratoriosCat l on p.codigoLaboratorio = l.codigoLaboratorio
        inner join genClasificacionesSsaCat cl on p.codigoClasificacionUno = cl.codigoClasificacionUno 
            and p.codigoClasificacionDos = cl.codigoClasificacionDos
        inner join imePresentacionesCat pr on p.codigoPresentacion = pr.codigoPresentacion
        """
        total_remote = pd.read_sql(count_query, mssql_conn).iloc[0]["total"]

        print(f"Último ID local: {last_local_id}")
        print(f"Total de registros remotos: {total_remote}")

        if total_remote > last_local_id:
            # 3. Obtener solo los registros nuevos
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
            from 
                (
                    SELECT *, 
                    ROW_NUMBER() OVER (ORDER BY folioPedido, codigoRelacionado) as row_num
                    from venPedidosDet
                ) vp
                inner join genProductosCat p on vp.codigoProducto = p.codigoProducto
                inner join invControlExistenciasReg e on vp.codigoProducto = e.codigoProducto
                inner join genLaboratoriosCat l on p.codigoLaboratorio = l.codigoLaboratorio
                inner join genClasificacionesSsaCat cl on p.codigoClasificacionUno = cl.codigoClasificacionUno 
                    and p.codigoClasificacionDos = cl.codigoClasificacionDos
                inner join imePresentacionesCat pr on p.codigoPresentacion = pr.codigoPresentacion
            WHERE vp.row_num > ?
            ORDER BY vp.row_num
            """
            new_data = pd.read_sql(query, mssql_conn, params=[last_local_id])
            mssql_conn.close()
            if len(new_data) > 0:
                print(f"Registros nuevos a insertar: {len(new_data)}")

                # 4. Asignar nuevos IDs secuenciales
                new_data.insert(
                    0, "id", range(last_local_id + 1, last_local_id + 1 + len(new_data))
                )

                # 5. Insertar nuevos registros
                new_data.to_sql("folios", sqlite_conn, if_exists="append", index=False)

                print(f"Se agregaron {len(new_data)} registros nuevos")
                logging.info(f"Se agregaron {len(new_data)} registros nuevos")

                # 6. Registrar algunos ejemplos de los nuevos registros
                for _, record in new_data.head().iterrows():
                    logging.info(
                        f"Ejemplo de registro insertado:\n"
                        f"ID={record['id']}\n"
                        f"Folio={record['folioPedido']}\n"
                        f"Código={record['codigoRelacionado']}\n"
                        f"-------------------"
                    )
            else:
                print("No hay registros nuevos para agregar")
        else:
            print("La base de datos local está actualizada")
        sqlite_conn.close()
        return True, "Sincronización completada exitosamente"
    except Exception as e:
        logging.error(f"Error durante la sincronización: {str(e)}")
        return False, f"Error durante la sincronización: {str(e)}"
