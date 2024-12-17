import pyodbc


def get_mssql_connection():
    connection_string = (
        "DRIVER={SQL Server};"
        "SERVER=10.1.3.119;"  # IP del servidor de base de datos
        "DATABASE=YIRPharmacySoftAlmacenCedis;"  # Nombre de la base de datos
        "UID=sa;"
        "PWD=SHid.$019;"
    )
    return pyodbc.connect(connection_string)
