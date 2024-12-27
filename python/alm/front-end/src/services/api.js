import axios from "axios";

const api = axios.create({
  baseURL: `http://${window.location.hostname}:5000`,
  // baseURL: `https://7mbmd9mj-5000.usw3.devtunnels.ms/`,
  timeout: 200000,
});

export const getData = async (page = 1, perPage = 100, filters = {}) => {
  try {
    const { sort_field, sort_direction, ...otherFilters } = filters;

    const params = new URLSearchParams({
      page: page,
      per_page: perPage,
      ...otherFilters,
    });

    if (sort_field && sort_direction) {
      params.append("sort_field", sort_field);
      params.append("sort_direction", sort_direction);
    }

    const response = await api.get(`/data?${params}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

export const deleteRecord = async (id) => {
  try {
    await api.delete(`/data/${id}`);
  } catch (error) {
    console.error("Error deleting record:", error);
    throw error;
  }
};

export const updateItem = async (id, data) => {
  try {
    const response = await api.put(`/data/${id}`, {
      cantidadVerificada: data.cantidadVerificada,
      nombreVerificador: data.nombreVerificador,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating item:", error);
    throw error;
  }
};

export const createRecord = async (data) => {
  try {
    await api.post("/data", data);
  } catch (error) {
    console.error("Error creating record:", error);
    throw error;
  }
};

export const syncDatabase = async () => {
  try {
    const response = await api.post("/sync");
    return response.data;
  } catch (error) {
    console.error("Error sincronizando la base de datos:", error);
    throw error;
  }
};

export const getLocalizaciones = async (folioPedido = "") => {
  try {
    const params = new URLSearchParams();
    if (folioPedido) {
      params.append("folioPedido", folioPedido);
    }
    const response = await api.get(`/localizaciones?${params}`);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching localizaciones:", error);
    throw error;
  }
};

export const getClasificaciones = async () => {
  try {
    const response = await api.get("/clasificaciones");
    return response.data.data;
  } catch (error) {
    console.error("Error fetching clasificaciones:", error);
    throw error;
  }
};

export const getClasificacionesByFolio = async (folio) => {
  try {
    if (!folio) return [];
    const response = await api.get(`/clasificaciones/${folio}`);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching clasificaciones por folio:", error);
    throw error;
  }
};

export const generateExcel = async (folio) => {
  try {
    const response = await api.get(`/generate-excel/${folio}`, {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${folio}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error generando Excel:", error);
    throw error;
  }
};
