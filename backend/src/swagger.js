const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Quản lý lớp học thêm",
      version: "1.0.0",
      description: "Backend API cho hệ thống quản lý lớp học thêm chạy local",
    },
    servers: [
      {
        url: process.env.API_URL || "http://localhost:3001",
        description: "Local server",
      },
    ],
    tags: [
      { name: "Học sinh", description: "Quản lý học sinh và phụ huynh" },
      { name: "Giáo viên", description: "Quản lý giáo viên" },
      { name: "Lớp học", description: "Quản lý nhóm lớp học" },
      { name: "Điểm danh", description: "Điểm danh học sinh theo buổi" },
      { name: "Thu chi", description: "Quản lý thu chi học phí" },
      { name: "Kết quả", description: "Kết quả học tập học sinh" },
    ],
    components: {
      schemas: {
        Student: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            ho_ten: { type: "string", example: "Nguyễn Văn An" },
            biet_danh: { type: "string", example: "An", nullable: true },
            hinh_anh: {
              type: "string",
              example: "uploads/students/1234.jpg",
              nullable: true,
            },
            ngay_sinh: {
              type: "string",
              example: "2016-05-20",
              nullable: true,
            },
            gioi_tinh: {
              type: "string",
              enum: ["nam", "nu", "khac"],
              nullable: true,
            },
            dia_chi: {
              type: "string",
              example: "123 Lê Lợi, Quảng Ngãi",
              nullable: true,
            },
            ten_phu_huynh: {
              type: "string",
              example: "Nguyễn Văn Bình",
              nullable: true,
            },
            sdt_phu_huynh: {
              type: "string",
              example: "0905123456",
              nullable: true,
            },
            ghi_chu: { type: "string", nullable: true },
            trang_thai: {
              type: "string",
              enum: ["dang_hoc", "nghi_hoc"],
              default: "dang_hoc",
            },
            ngay_nhap_hoc: { type: "string", example: "2024-09-01" },
            ten_lop_hoc: {
              type: "string",
              example: "Lớp 3, Luyện chữ đẹp",
              nullable: true,
            },
          },
        },
        Teacher: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            ho_ten: { type: "string", example: "Trần Thị Lan" },
            sdt: { type: "string", example: "0912345678", nullable: true },
            dia_chi: { type: "string", nullable: true },
            luong_buoi: { type: "integer", example: 150000 },
            trang_thai: { type: "string", enum: ["dang_day", "nghi"] },
            ghi_chu: { type: "string", nullable: true },
            so_lop: { type: "integer", example: 2 },
          },
        },
        ClassGroup: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            ten_lop: { type: "string", example: "Lớp 3" },
            mo_ta: { type: "string", nullable: true },
            hoc_phi_thang: { type: "integer", example: 350000 },
            teacher_id: { type: "integer", nullable: true },
            ten_giao_vien: { type: "string", nullable: true },
            lich_hoc: {
              type: "string",
              example: "Thứ 2, 4, 6 — 17:00-18:30",
              nullable: true,
            },
            so_hoc_sinh: { type: "integer", example: 12 },
          },
        },
        AttendanceRecord: {
          type: "object",
          properties: {
            student_id: { type: "integer", example: 1 },
            trang_thai: {
              type: "string",
              enum: ["co_mat", "vang_mat", "vang_phep"],
              default: "co_mat",
            },
            ghi_chu: { type: "string", nullable: true },
          },
        },
        Finance: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            loai: { type: "string", enum: ["thu", "chi"] },
            danh_muc: { type: "string", example: "hoc_phi" },
            student_id: { type: "integer", nullable: true },
            teacher_id: { type: "integer", nullable: true },
            so_tien: { type: "integer", example: 350000 },
            ngay: { type: "string", example: "2024-12-01" },
            thang: { type: "string", example: "2024-12" },
            mo_ta: { type: "string", nullable: true },
            trang_thai: {
              type: "string",
              enum: ["da_thu", "chua_thu", "da_chi"],
            },
          },
        },
        Result: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            student_id: { type: "integer", example: 1 },
            class_id: { type: "integer", example: 3 },
            ky: { type: "string", example: "HK1-2024" },
            diem_so: { type: "number", example: 8.5, nullable: true },
            xep_loai: {
              type: "string",
              enum: ["gioi", "kha", "trung_binh", "yeu"],
              nullable: true,
            },
            nhan_xet: { type: "string", nullable: true },
            ngay_nhap: { type: "string", example: "2024-12-20" },
          },
        },
        ApiSuccess: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {},
          },
        },
        ApiError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Mô tả lỗi" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
};

module.exports = swaggerJsdoc(options);
