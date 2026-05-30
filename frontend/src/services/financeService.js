import api from "./api";

const financeService = {
  getAll: async (params = {}) => {
    const response = await api.get("/finance", { params });
    return response.data;
  },

  getSummary: async (params = {}) => {
    const response = await api.get("/finance/summary", { params });
    return response.data;
  },

  getUnpaid: async (params = {}) => {
    const response = await api.get("/finance/unpaid", { params });
    return response.data;
  },

  getTuitionStatus: async (params = {}) => {
    const response = await api.get("/finance/tuition-status", { params });
    return response.data;
  },

  getTeacherSalary: async (params = {}) => {
    const response = await api.get("/finance/teacher-salary", { params });
    return response.data;
  },

  create: async (financeData) => {
    const response = await api.post("/finance", financeData);
    return response.data;
  },

  bulkTuition: async (data) => {
    const response = await api.post("/finance/bulk-tuition", data);
    return response.data;
  },

  update: async (id, financeData) => {
    const response = await api.put(`/finance/${id}`, financeData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/finance/${id}`);
    return response.data;
  },
};

export default financeService;
