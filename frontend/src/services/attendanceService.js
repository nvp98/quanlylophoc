import api from "./api";

const attendanceService = {
  getAll: async (params = {}) => {
    const response = await api.get("/attendance", { params });
    return response.data;
  },

  getSheet: async (params = {}) => {
    const response = await api.get("/attendance/sheet", { params });
    return response.data;
  },

  getSummary: async (params = {}) => {
    const response = await api.get("/attendance/summary", { params });
    return response.data;
  },

  getTeacherMonthly: async (params = {}) => {
    const response = await api.get("/attendance/teacher-monthly", { params });
    return response.data;
  },

  getMonthly: async (params = {}) => {
    const response = await api.get("/attendance/monthly", { params });
    return response.data;
  },

  save: async (attendanceData) => {
    const response = await api.post("/attendance", attendanceData);
    return response.data;
  },

  batchSave: async (data) => {
    const response = await api.post("/attendance/batch", data);
    return response.data;
  },

  setTeacher: async (data) => {
    const response = await api.patch("/attendance/set-teacher", data);
    return response.data;
  },
};

export default attendanceService;
