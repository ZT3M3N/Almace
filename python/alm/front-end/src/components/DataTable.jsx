import { useEffect, useState } from "react";
import { getData, updateItem, syncDatabase } from "../services/api";
import EditModal from "./EditModal";
import "../DataTable.css";

function DataTable() {
  const [items, setItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Función para determinar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth >= 320 && window.innerWidth <= 600);
    };

    // Chequear al montar el componente
    checkMobile();

    // Añadir event listener para cambios de tamaño
    window.addEventListener("resize", checkMobile);

    // Limpiar el event listener
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Mapeo de placeholders para móviles
  const mobilePlaceholders = {
    folioPedido: "Buscar por folio",
    codigoRelacionado: "Buscar por código",
    cantidadPedida: "Buscar por  cantidad pedida",
    cantidadVerificada: "Buscar por cantidad verificada",
    diferencia: "Buscar por diferencia",
    descripcion_producto: "Buscar por producto",
    codigoFamiliaUno: "Buscar por familia",
    existencia: "Buscar por existencia",
    localizacion: "Buscar por localización",
    descripcion_laboratorio: "Buscar por laboratorio",
    descripcion_clasificacion: "Buscar por clasificación",
    descripcion_presentacion: "Buscar por presentación",
  };

  const [filters, setFilters] = useState({
    folioPedido: "",
    codigoRelacionado: "",
    cantidadPedida: "",
    cantidadVerificada: "",
    diferencia: "",
    descripcion_producto: "",
    codigoFamiliaUno: "",
    existencia: "",
    localizacion: "",
    descripcion_laboratorio: "",
    descripcion_clasificacion: "",
    descripcion_presentacion: "",
  });

  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  const [editingItem, setEditingItem] = useState(null);

  const handleEdit = (item) => {
    console.log("Item a editar:", item); // Para debugging
    setEditingItem({
      ...item,
      id: item.id, // Aseguramos que se incluya el ID
      folioPedido: item.folioPedido,
    });
  };

  const handleSave = async (editedItem) => {
    try {
      console.log("Guardando item:", editedItem);
      const response = await updateItem(editedItem.id, editedItem);

      // Actualizar el estado local con los datos actualizados
      setItems(
        items.map((item) =>
          item.id === editedItem.id
            ? {
                ...item,
                cantidadVerificada: editedItem.cantidadVerificada,
              }
            : item
        )
      );

      setEditingItem(null);

      // Opcional: Mostrar un mensaje de éxito
      console.log("Actualización exitosa:", response.message);
    } catch (error) {
      console.error("Error al guardar:", error);
      // Opcional: Mostrar un mensaje de error al usuario
    }
  };

  // Efecto para manejar el debounce de los filtros
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 500); // Espera 500ms después de la última actualización

    return () => clearTimeout(timer);
  }, [filters]);

  // Efecto para cargar datos cuando cambian los filtros o la página
  useEffect(() => {
    fetchData(currentPage, debouncedFilters);
  }, [currentPage, debouncedFilters]);

  const fetchData = async (page, currentFilters) => {
    try {
      setLoading(true);
      // Solo enviar filtros que tengan valor
      const activeFilters = Object.entries(currentFilters).reduce(
        (acc, [key, value]) => {
          if (value) acc[key] = value;
          return acc;
        },
        {}
      );

      const response = await getData(page, 100, activeFilters);
      setItems(response.data);
      setTotalPages(response.pagination.total_pages);
    } catch (error) {
      console.error("Error al obtener datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setLoading(true);
      await syncDatabase();
      // Recargar los datos después de la sincronización
      await fetchData(currentPage, debouncedFilters);
      alert("Base de datos sincronizada exitosamente");
    } catch (error) {
      console.error("Error en la sincronización:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (column, value) => {
    setFilters((prev) => ({
      ...prev,
      [column]: value,
    }));
    setCurrentPage(1); // Resetear a la primera página cuando se filtran datos
  };

  const clearFilters = () => {
    setFilters({
      folioPedido: "",
      codigoRelacionado: "",
      cantidadPedida: "",
      cantidadVerificada: "",
      descripcion_producto: "",
      codigoFamiliaUno: "",
      existencia: "",
      localizacion: "",
      descripcion_laboratorio: "",
      descripcion_clasificacion: "",
      descripcion_presentacion: "",
    });
    setCurrentPage(1);
  };

  if (loading) {
    return <div className="loading">Cargando datos...</div>;
  }

  return (
    <div>
      <div className="filters-control">
        <button onClick={clearFilters} className="clear-filters-btn">
          Limpiar filtros
        </button>
        <button onClick={handleSync} className="sync-button">
          Sincronizar base de datos
        </button>
      </div>
      <div className="table-container">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Folio Pedido</th>
                <th>Código Relacionado</th>
                <th>Cantidad Pedida</th>
                <th>Cantidad Verificada</th>
                <th>Diferencia</th>
                <th>Producto</th>
                <th>Familia</th>
                <th>Existencia</th>
                <th>Localización</th>
                <th>Laboratorio</th>
                <th>Clasificación</th>
                <th>Presentación</th>
                <th></th>
              </tr>
              <tr>
                {Object.keys(filters).map((column) => (
                  <th key={`filter-${column}`}>
                    <input
                      type="text"
                      value={filters[column]}
                      onChange={(e) =>
                        handleFilterChange(column, e.target.value)
                      }
                      placeholder={
                        isMobile
                          ? mobilePlaceholders[column] || "Buscar..."
                          : "Buscar..."
                      }
                      className="filter-input"
                    />
                  </th>
                ))}
                <th key="filter-actions"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isEqual =
                  Number(item.cantidadPedida) ===
                  Number(item.cantidadVerificada);

                return (
                  <tr
                    key={item.id}
                    style={{
                      backgroundColor: isEqual ? "#00ff3d" : "#ff9ca5",
                      color: isEqual ? "#155724" : "#721c24",
                    }}
                  >
                    <td data-label="Folio Pedido">{item.folioPedido}</td>
                    <td data-label="Código Relacionado">
                      {item.codigoRelacionado}
                    </td>
                    <td data-label="Cantidad Pedida">{item.cantidadPedida}</td>
                    <td data-label="Cantidad Verificada">
                      {item.cantidadVerificada}
                    </td>
                    <td data-label="Diferencia">
                      {item.cantidadPedida - item.cantidadVerificada}
                    </td>
                    <td data-label="Producto">{item.descripcion_producto}</td>
                    <td data-label="Familia">{item.codigoFamiliaUno}</td>
                    <td data-label="Existencia">{item.existencia}</td>
                    <td data-label="Localización">{item.localizacion}</td>
                    <td data-label="Laboratorio">
                      {item.descripcion_laboratorio}
                    </td>
                    <td data-label="Clasificación">
                      {item.descripcion_clasificacion}
                    </td>
                    <td data-label="Presentación">
                      {item.descripcion_presentacion}
                    </td>
                    <td data-label="Acciones">
                      <button
                        className="edit-button"
                        onClick={() => handleEdit(item)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {editingItem && (
          <EditModal
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onSave={handleSave}
          />
        )}
      </div>
      <div className="pagination">
        <button
          onClick={() => setCurrentPage((prev) => prev - 1)}
          disabled={currentPage === 1}
        >
          Anterior
        </button>
        <span className="">
          Página {currentPage} de {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((prev) => prev + 1)}
          disabled={currentPage === totalPages}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

export default DataTable;
