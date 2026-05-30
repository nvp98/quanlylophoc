import api from "./api";

const toFormData = (data, imageFile) => {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, v);
  });
  if (imageFile) fd.append("hinh_anh", imageFile);
  return fd;
};

const studentService = {
  getAll: async (params = {}) => {
    const response = await api.get("/students", { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  create: async (studentData, imageFile) => {
    const fd = toFormData(studentData, imageFile);
    const response = await api.post("/students", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  update: async (id, studentData, imageFile) => {
    const fd = toFormData(studentData, imageFile);
    const response = await api.put(`/students/${id}`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/students/${id}`);
    return response.data;
  },

  enroll: async (id, data) => {
    const response = await api.patch(`/students/${id}/enroll`, data);
    return response.data;
  },
};

export default studentService;
