import axios from "axios";

const api = axios.create({
  baseURL: `http://${window.location.hostname}:5000`,
  // baseURL: `https://7mbmd9mj-5000.usw3.devtunnels.ms/`,
  timeout: 200000,
});

export const getData = async (page = 1, perPage = 100, filters = {}) => {
  try {
    // Convertir los filtros en parámetros de consulta
    const params = new URLSearchParams({
      page: page,
      per_page: perPage,
      ...filters,
    });

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
  if (!id) {
    throw new Error("ID es requerido");
  }

  try {
    console.log("Enviando actualización:", { id, data });
    const response = await api.put(`/data/${id}`, {
      cantidadVerificada: data.cantidadVerificada,
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
