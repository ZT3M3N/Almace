from flask import Flask, jsonify, request
from database.mssql_connection import get_mssql_connection
from database.sqlite_connection import get_sqlite_connection
import sqlite3
import pandas as pd
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Habilitar CORS para todas las rutas


@app.route("/test", methods=["GET"])
def test_endpoint():
    try:
        conn = get_sqlite_connection()
        cursor = conn.cursor()
        # Modificamos para usar las columnas correctas
        cursor.execute("SELECT * FROM folios LIMIT 10")
        rows = cursor.fetchall()

        # Obtener nombres de columnas
        cursor.execute("PRAGMA table_info(folios)")
        columns = [col[1] for col in cursor.fetchall()]

        # Formatear resultado
        result = []
        for row in rows:
            row_dict = {}
            for i, col_name in enumerate(columns):
                row_dict[col_name] = row[i]
            result.append(row_dict)

        conn.close()

        if not result:
            return jsonify({"message": "No data found"}), 404

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"}), 500


@app.route("/debug", methods=["GET"])
def debug_connection():
    try:
        conn = get_sqlite_connection()
        cursor = conn.cursor()

        # Verifica si la tabla existe
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='folios'"
        )
        table_exists = cursor.fetchone()

        # Si la tabla existe, obtiene la información de las columnas
        columns_info = []
        if table_exists:
            cursor.execute("PRAGMA table_info(folios)")
            columns_info = cursor.fetchall()

        conn.close()

        return jsonify(
            {
                "table_exists": bool(table_exists),
                "columns_info": columns_info,
                "db_path": os.path.abspath(os.path.dirname(__file__)),
            }
        )

    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"}), 500


@app.route("/data", methods=["GET"])
def get_all_data():
    try:
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 100, type=int)

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

        # Filtros numéricos
        for column in ["cantidadPedida", "cantidadVerificada", "existencia"]:
            if request.args.get(column):
                query += f" AND {column} = ?"
                params.append(request.args.get(column))

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

        # Actualizar usando el nombre correcto de la columna
        cursor.execute(
            """
            UPDATE folios 
            SET cantidadVerificada = ?
            WHERE id = ?
            """,
            (
                (
                    int(data["cantidadVerificada"])
                    if data.get("cantidadVerificada")
                    else None
                ),
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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
