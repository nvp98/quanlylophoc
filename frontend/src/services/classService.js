import api from "./api";

const classService = {
  getAll: async (params = {}) => {
    const response = await api.get("/classes", { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/classes/${id}`);
    return response.data;
  },

  create: async (classData) => {
    const response = await api.post("/classes", classData);
    return response.data;
  },

  update: async (id, classData) => {
    const response = await api.put(`/classes/${id}`, classData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/classes/${id}`);
    return response.data;
  },
};

export default classService;
