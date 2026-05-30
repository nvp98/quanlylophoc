import api from "./api";

const resultService = {
  getAll: async (params = {}) => {
    const response = await api.get("/results", { params });
    return response.data;
  },

  getReport: async (params = {}) => {
    const response = await api.get("/results/report", { params });
    return response.data;
  },

  create: async (resultData) => {
    const response = await api.post("/results", resultData);
    return response.data;
  },

  bulkCreate: async (data) => {
    const response = await api.post("/results/bulk", data);
    return response.data;
  },

  update: async (id, resultData) => {
    const response = await api.put(`/results/${id}`, resultData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/results/${id}`);
    return response.data;
  },
};

export default resultService;
