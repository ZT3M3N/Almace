import { useEffect, useState, useCallback } from "react";
import {
  getData,
  updateItem,
  syncDatabase,
  getLocalizaciones,
  getClasificaciones,
  getClasificacionesByFolio,
  generateExcel,
} from "../services/api";
import EditModal from "./EditModal";
import "../DataTable.css";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function DataTable() {
  const [items, setItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [localizaciones, setLocalizaciones] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]);

  // Agregar nuevo estado para el ordenamiento
  const [sortConfig, setSortConfig] = useState({
    field: null,
    direction: "asc",
  });

  // Agregar estado para las opciones únicas de cada columna
  const [uniqueOptions, setUniqueOptions] = useState({
    folioPedido: new Set(),
    codigoRelacionado: new Set(),
    descripcion_producto: new Set(),
    localizacion: new Set(),
    descripcion_laboratorio: new Set(),
    descripcion_clasificacion: new Set(),
    descripcion_presentacion: new Set(),
  });

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
    nombreVerificador: "",
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

  const handleSave = async (updatedData) => {
    try {
      const response = await updateItem(updatedData.id, {
        cantidadVerificada: updatedData.cantidadVerificada,
        nombreVerificador: updatedData.nombreVerificador,
      });

      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === updatedData.id
            ? {
                ...item,
                cantidadVerificada: updatedData.cantidadVerificada,
                nombreVerificador: updatedData.nombreVerificador,
              }
            : item
        )
      );

      // Limpiar solo el filtro de codigoRelacionado
      setFilters((prevFilters) => ({
        ...prevFilters,
        codigoRelacionado: "", // Cambiado de codigo_relacionado a codigoRelacionado
      }));

      setEditingItem(null);
      toast.success("Registro actualizado correctamente");
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Error al actualizar el registro");
    }
  };

  // Efecto para manejar el debounce de los filtros
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 3500); // Espera 500ms después de la última actualización

    return () => clearTimeout(timer);
  }, [filters]);

  // Modificar el useEffect que carga los datos para incluir el ordenamiento
  useEffect(() => {
    fetchData(currentPage, debouncedFilters, sortConfig);
  }, [currentPage, debouncedFilters, sortConfig]);

  // Función para manejar el ordenamiento
  const handleSort = (field) => {
    setSortConfig((prevSort) => ({
      field,
      direction:
        prevSort.field === field && prevSort.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  // Modificar fetchData para incluir el ordenamiento
  const fetchData = async (page, currentFilters, sort) => {
    try {
      setLoading(true);
      const activeFilters = Object.entries(currentFilters).reduce(
        (acc, [key, value]) => {
          if (value) acc[key] = value;
          return acc;
        },
        {}
      );

      // Agregar parámetros de ordenamiento
      const params = {
        ...activeFilters,
        sort_field: sort.field,
        sort_direction: sort.direction,
      };

      const response = await getData(page, 100, params);
      setItems(response.data);
      setTotalPages(response.pagination.total_pages);

      // Actualizar las opciones únicas
      const newUniqueOptions = { ...uniqueOptions };
      response.data.forEach((item) => {
        Object.keys(uniqueOptions).forEach((key) => {
          if (item[key]) {
            newUniqueOptions[key].add(item[key]);
          }
        });
      });
      setUniqueOptions(newUniqueOptions);
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
      await fetchData(currentPage, debouncedFilters, sortConfig);
      alert("Base de datos sincronizada exitosamente");
    } catch (error) {
      console.error("Error en la sincronización:", error);
    } finally {
      setLoading(false);
    }
  };

  // Agregar función clearFilters
  const clearFilters = () => {
    setFilters({
      folioPedido: "",
      codigoRelacionado: "",
      descripcion_producto: "",
      codigoFamiliaUno: "",
      localizacion: "",
      descripcion_laboratorio: "",
      descripcion_clasificacion: "",
      descripcion_presentacion: "",
      cantidadPedida: "",
      cantidadVerificada: "",
      existencia: "",
    });
    // Recargar las localizaciones sin filtro
    updateLocalizaciones("");
  };

  // Función para actualizar localizaciones basado en el folio
  const updateLocalizaciones = useCallback(
    async (folioPedido) => {
      try {
        const data = await getLocalizaciones(folioPedido);
        setLocalizaciones(data);
        if (filters.localizacion && !data.includes(filters.localizacion)) {
          handleFilterChange("localizacion", "");
        }
      } catch (error) {
        console.error("Error al cargar localizaciones:", error);
      }
    },
    [filters.localizacion]
  );

  // Modificar handleFilterChange para manejar todos los casos
  const handleFilterChange = useCallback(
    async (column, value) => {
      const newFilters = { ...filters, [column]: value };
      setFilters(newFilters);

      // Manejar caso especial del folio
      if (column === "folio") {
        await loadClasificaciones(value);
        setFilters((prev) => ({ ...prev, descripcion_clasificacion: "" }));
      }

      // Manejar actualización de localizaciones
      if (column === "folioPedido") {
        updateLocalizaciones(value);
      }
    },
    [updateLocalizaciones, filters]
  );

  // Cargar localizaciones iniciales
  useEffect(() => {
    updateLocalizaciones(filters.folioPedido);
  }, [filters.folioPedido, updateLocalizaciones]);

  // Separamos la lógica de carga de clasificaciones en una función independiente
  const loadClasificaciones = async (folioPedido) => {
    try {
      if (!folioPedido) {
        setClasificaciones([]);
        return;
      }

      const data = await getClasificacionesByFolio(folioPedido);
      console.log("Clasificaciones cargadas para folio:", folioPedido, data);
      setClasificaciones(data);

      // Si la clasificación actual no está en las nuevas clasificaciones, resetearla
      if (
        filters.descripcion_clasificacion &&
        !data.includes(filters.descripcion_clasificacion)
      ) {
        handleFilterChange("descripcion_clasificacion", "");
      }
    } catch (error) {
      console.error("Error al cargar clasificaciones:", error);
      setClasificaciones([]);
    }
  };

  // Modificar el useEffect para usar folioPedido
  useEffect(() => {
    console.log("Filtro de folioPedido cambió a:", filters.folioPedido);
    loadClasificaciones(filters.folioPedido);
  }, [filters.folioPedido]);

  const handleSaveEdit = async () => {
    try {
      console.log("Filtros antes de guardar:", filters);
      const response = await updateFolio(editingRow);
      if (response.status === "success") {
        // Actualizar la tabla
        const updatedData = data.map((row) =>
          row.id === editingRow.id ? editingRow : row
        );
        setData(updatedData);
        setEditingRow(null);

        // Limpiar solo el filtro de Codigo Relacionado
        setFilters((prevFilters) => {
          const newFilters = {
            ...prevFilters,
            codigo_relacionado: "", // Asegúrate que este sea el nombre exacto del campo
          };
          console.log("Nuevos filtros después de guardar:", newFilters);
          return newFilters;
        });

        // Recargar los datos con los nuevos filtros
        await fetchData();

        toast.success("Registro actualizado correctamente");
      }
    } catch (error) {
      console.error("Error al actualizar:", error);
      toast.error("Error al actualizar el registro");
    }
  };

  const handleExportExcel = async () => {
    try {
      if (!filters.folioPedido) {
        toast.warning("Por favor, filtra primero por un folio específico");
        return;
      }
      await generateExcel(filters.folioPedido);
      toast.success("Excel generado correctamente");
    } catch (error) {
      toast.error("Error al generar el Excel");
      console.error("Error:", error);
    }
  };

  if (loading) {
    return <div className="loading">Cargando datos...</div>;
  }

  return (
    <div>
      <div className="filters-control">
        <button onClick={handleSync} className="sync-button">
          Sincronizar base de datos
        </button>
        {filters.folioPedido && (
          <button onClick={handleExportExcel} className="export-button">
            Exportar a Excel
          </button>
        )}
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
                <th>Verificador</th>
                <th>Existencia</th>
                <th>
                  Localización
                  <div className="sort-buttons">
                    <button
                      onClick={() => handleSort("localizacion")}
                      className={`sort-button ${
                        sortConfig.field === "localizacion"
                          ? `active-${sortConfig.direction}`
                          : ""
                      }`}
                    >
                      {sortConfig.field === "localizacion" &&
                      sortConfig.direction === "asc"
                        ? "↑"
                        : "↓"}
                    </button>
                  </div>
                </th>
                <th>Laboratorio</th>
                <th>Clasificación</th>
                <th>Presentación</th>
                <th></th>
              </tr>
              <tr>
                {Object.keys(filters).map((column) => (
                  <th key={`filter-${column}`}>
                    {column === "localizacion" ? (
                      <select
                        value={filters[column]}
                        onChange={(e) =>
                          handleFilterChange(column, e.target.value)
                        }
                        className="filter-select"
                      >
                        <option value="">Todas las localizaciones</option>
                        {localizaciones.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    ) : column === "descripcion_clasificacion" ? (
                      <select
                        value={filters[column] || ""}
                        onChange={(e) =>
                          handleFilterChange(column, e.target.value)
                        }
                        className="filter-select"
                      >
                        <option value="">Todas las clasificaciones</option>
                        {clasificaciones.map((clasificacion) => (
                          <option key={clasificacion} value={clasificacion}>
                            {clasificacion}
                          </option>
                        ))}
                      </select>
                    ) : (
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
                    )}
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
                const diferencia =
                  item.cantidadPedida - item.cantidadVerificada;

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
                    <td data-label="Verificador">
                      {item.nombreVerificador || "-"}
                    </td>
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
                        className={`edit-button ${isEqual ? "disabled" : ""}`}
                        onClick={() => handleEdit(item)}
                        disabled={isEqual}
                        title={
                          isEqual
                            ? "No se puede editar cuando las cantidades coinciden"
                            : ""
                        }
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
