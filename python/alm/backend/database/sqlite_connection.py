import sqlite3
import os


def get_sqlite_connection():
    # Obtiene el directorio donde está el archivo sqlite_connection.py
    base_dir = os.path.dirname(os.path.abspath(__file__))
    # Construye la ruta completa a la base de datos
    db_path = os.path.join(base_dir, "base_datos.sqlite")
    return sqlite3.connect(db_path)
