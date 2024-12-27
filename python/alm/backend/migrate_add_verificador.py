from database.sqlite_connection import get_sqlite_connection
import sqlite3


def add_verificador_column():
    try:
        conn = get_sqlite_connection()
        cursor = conn.cursor()
        # Verificar si la columna ya existe
        cursor.execute("PRAGMA table_info(folios)")
        columns = [col[1] for col in cursor.fetchall()]

        if "nombreVerificador" not in columns:
            # Agregar la nueva columna
            cursor.execute("ALTER TABLE folios ADD COLUMN nombreVerificador TEXT")
            conn.commit()
            print("Columna nombreVerificador agregada correctamente")
        else:
            print("La columna nombreVerificador ya existe")
        conn.close()
        return True, "Migración completada exitosamente"
    except sqlite3.Error as e:
        return False, f"Error de SQLite: {str(e)}"
    except Exception as e:
        return False, f"Error: {str(e)}"


if __name__ == "__main__":
    success, message = add_verificador_column()
    print(message)
