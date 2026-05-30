import api from "./api";

const teacherService = {
  getAll: async (params = {}) => {
    const response = await api.get("/teachers", { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/teachers/${id}`);
    return response.data;
  },

  create: async (teacherData) => {
    const response = await api.post("/teachers", teacherData);
    return response.data;
  },

  update: async (id, teacherData) => {
    const response = await api.put(`/teachers/${id}`, teacherData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/teachers/${id}`);
    return response.data;
  },

  getSalary: async (id, thang) => {
    const response = await api.get(`/teachers/${id}/salary`, { params: { thang } });
    return response.data;
  },
};

export default teacherService;
