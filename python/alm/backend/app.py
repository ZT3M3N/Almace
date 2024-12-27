from flask import Flask, jsonify, request, send_file
from database.mssql_connection import get_mssql_connection
from database.sqlite_connection import get_sqlite_connection
import sqlite3
import pandas as pd
from flask_cors import CORS
import os
from openpyxl import Workbook

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Habilitar CORS para todas las rutas


@app.route("/data", methods=["GET"])
def get_all_data():
    try:
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 100, type=int)
        sort_field = request.args.get("sort_field")
        sort_direction = request.args.get("sort_direction", "asc")

        # Construir la consulta base
        query = "SELECT * FROM folios WHERE 1=1"
        params = []

        # Columnas de texto para búsqueda parcial
        text_columns = [
            "folioPedido",
            "codigoRelacionado",
            "descripcion_producto",
            "codigoFamiliaUno",
            "localizacion",
            "descripcion_laboratorio",
            "descripcion_clasificacion",
            "descripcion_presentacion",
        ]

        # Columnas numéricas para búsqueda exacta
        numeric_columns = ["cantidadPedida", "cantidadVerificada", "existencia"]

        # Procesar filtros de texto
        for column in text_columns:
            value = request.args.get(column)
            if value:
                query += f" AND LOWER({column}) LIKE LOWER(?)"
                params.append(f"%{value}%")

        # Procesar filtros numéricos
        for column in numeric_columns:
            value = request.args.get(column)
            if value and value.strip().isdigit():
                query += f" AND {column} = ?"
                params.append(int(value))

        # Agregar ordenamiento si se especifica
        if sort_field and sort_field in text_columns + numeric_columns:
            query += f" ORDER BY {sort_field} {'DESC' if sort_direction == 'desc' else 'ASC'}"

        # Obtener total de registros para la paginación
        conn = get_sqlite_connection()
        cursor = conn.cursor()
        cursor.execute(f"SELECT COUNT(*) FROM ({query})", params)
        total_records = cursor.fetchone()[0]

        # Agregar paginación a la consulta
        query += " LIMIT ? OFFSET ?"
        params.extend([per_page, (page - 1) * per_page])

        # Ejecutar la consulta final
        cursor.execute(query, params)
        rows = cursor.fetchall()

        # Obtener nombres de columnas
        cursor.execute("PRAGMA table_info(folios)")
        columns = [col[1] for col in cursor.fetchall()]

        conn.close()

        # Convertir filas a diccionarios
        result = []
        for i, row in enumerate(rows, 1):
            row_dict = {"ROW_ID": (page - 1) * per_page + i}
            for col_name, value in zip(columns, row):
                row_dict[col_name] = value
            result.append(row_dict)

        return jsonify(
            {
                "data": result,
                "pagination": {
                    "total_records": total_records,
                    "current_page": page,
                    "per_page": per_page,
                    "total_pages": (total_records + per_page - 1) // per_page,
                },
            }
        )

    except sqlite3.Error as e:
        return jsonify({"error": f"SQLite error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"}), 500


@app.route("/data/<int:id>", methods=["PUT"])
def update_item(id):
    try:
        data = request.json
        print("Datos recibidos:", data)

        conn = get_sqlite_connection()
        cursor = conn.cursor()

        # Actualizar incluyendo nombreVerificador
        cursor.execute(
            """
            UPDATE folios 
            SET cantidadVerificada = ?,
                nombreVerificador = ?
            WHERE id = ?
            """,
            (
                (
                    int(data["cantidadVerificada"])
                    if data.get("cantidadVerificada")
                    else None
                ),
                data.get("nombreVerificador"),
                id,
            ),
        )

        conn.commit()

        # Verificar la actualización
        cursor.execute("SELECT * FROM folios WHERE id = ?", (id,))
        updated_record = cursor.fetchone()

        conn.close()

        return jsonify(
            {
                "message": "Registro actualizado correctamente",
                "data": {
                    "id": id,
                    "cantidadVerificada": data.get("cantidadVerificada"),
                    "nombreVerificador": data.get("nombreVerificador"),
                },
            }
        )

    except sqlite3.Error as e:
        print(f"Error de SQLite: {e}")
        return jsonify({"error": f"Error de SQLite: {str(e)}"}), 500
    except Exception as e:
        print(f"Error general: {e}")
        return jsonify({"error": f"Error: {str(e)}"}), 500


@app.route("/sync", methods=["POST"])
def sync_database():
    try:
        print("Iniciando proceso de sincronización...")
        from sync_db_migrate import migrate_data

        success, message = migrate_data()

        if not success:
            print(f"Error en la sincronización: {message}")
            return jsonify({"error": message}), 500

        print("Proceso de sincronización completado exitosamente")
        return jsonify({"message": message}), 200
    except Exception as e:
        print(f"Error en sync_database: {str(e)}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": f"Error durante la sincronización: {str(e)}"}), 500


@app.route("/localizaciones", methods=["GET"])
def get_localizaciones():
    try:
        conn = get_sqlite_connection()
        cursor = conn.cursor()

        folio_pedido = request.args.get("folioPedido")

        query = """
            SELECT DISTINCT localizacion 
            FROM folios 
            WHERE localizacion IS NOT NULL 
            AND localizacion != ''
        """
        params = []

        # Si hay un folio pedido, filtrar por él
        if folio_pedido:
            query += " AND folioPedido LIKE ?"
            params.append(f"%{folio_pedido}%")

        query += " ORDER BY localizacion ASC"

        cursor.execute(query, params)
        localizaciones = [row[0] for row in cursor.fetchall()]

        return jsonify({"status": "success", "data": localizaciones}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route("/clasificaciones", methods=["GET"])
def get_clasificaciones():
    try:
        conn = get_sqlite_connection()
        cursor = conn.cursor()

        query = """
            SELECT DISTINCT descripcion_clasificacion 
            FROM folios 
            WHERE descripcion_clasificacion IS NOT NULL 
            AND descripcion_clasificacion != ''
            ORDER BY descripcion_clasificacion
        """

        cursor.execute(query)
        clasificaciones = [row[0] for row in cursor.fetchall()]

        return jsonify({"status": "success", "data": clasificaciones}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route("/clasificaciones/<folio>", methods=["GET"])
def get_clasificaciones_by_folio(folio):
    conn = None
    try:
        conn = get_sqlite_connection()
        cursor = conn.cursor()

        # Primero, verificamos si el folio existe
        check_query = "SELECT COUNT(*) FROM folios WHERE folioPedido = ?"
        cursor.execute(check_query, (folio,))
        if cursor.fetchone()[0] == 0:
            return jsonify({"status": "success", "data": []}), 200

        query = """
            SELECT DISTINCT descripcion_clasificacion 
            FROM folios 
            WHERE folioPedido = ?
            AND descripcion_clasificacion IS NOT NULL 
            AND descripcion_clasificacion != ''
            ORDER BY descripcion_clasificacion
        """

        cursor.execute(query, (folio,))
        clasificaciones = [row[0] for row in cursor.fetchall()]

        print(f"Folio consultado: {folio}")
        print(f"Query ejecutado: {query}")
        print(f"Clasificaciones encontradas: {clasificaciones}")

        return jsonify({"status": "success", "data": clasificaciones}), 200

    except Exception as e:
        print(f"Error en get_clasificaciones_by_folio: {str(e)}")
        import traceback

        print(traceback.format_exc())
        return (
            jsonify(
                {
                    "status": "error",
                    "message": str(e),
                    "details": traceback.format_exc(),
                }
            ),
            500,
        )
    finally:
        if conn:
            conn.close()


@app.route("/generate-excel/<folio>", methods=["GET"])
def generate_excel(folio):
    try:
        conn = get_sqlite_connection()
        cursor = conn.cursor()

        # Obtener los datos filtrados por folio
        query = """
            SELECT codigoRelacionado, cantidadVerificada 
            FROM folios 
            WHERE folioPedido = ? 
            AND cantidadVerificada IS NOT NULL
            AND cantidadVerificada > 0
        """
        cursor.execute(query, (folio,))
        rows = cursor.fetchall()

        if not rows:
            return (
                jsonify({"status": "error", "message": "No hay datos para exportar"}),
                404,
            )

        # Crear el libro de Excel
        wb = Workbook()
        ws = wb.active
        ws.title = "PRODUCTOS"

        # Agregar encabezados
        ws.append(["CodigoSubAlmacen", "CodigoRelacionado", "Piezas"])

        # Agregar datos
        for row in rows:
            ws.append(["1", row[0], row[1]])

        # Crear directorio para archivos temporales si no existe
        if not os.path.exists("temp_excel"):
            os.makedirs("temp_excel")

        # Guardar el archivo
        file_path = f"temp_excel/{folio}.xlsx"
        wb.save(file_path)

        # Enviar el archivo
        return send_file(
            file_path,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=f"{folio}.xlsx",
        )

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
