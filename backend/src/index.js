const express = require("express");
const cors = require("cors");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const { dbReady } = require("./db");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "https://quanlylophoc-98ys.onrender.com/",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve ảnh upload tĩnh
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Swagger UI
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "API Lớp học thêm",
    swaggerOptions: { defaultModelsExpandDepth: -1 },
  }),
);

// Swagger JSON (để import vào Postman, Insomnia...)
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Routes
app.use("/api/students", require("./routes/students"));
app.use("/api/teachers", require("./routes/teachers"));
app.use("/api/classes", require("./routes/classes"));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/finance", require("./routes/finance"));
app.use("/api/results", require("./routes/results"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server dang chay",
    time: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res
    .status(404)
    .json({
      success: false,
      message: `Route khong ton tai: ${req.method} ${req.path}`,
    });
});

app.use((err, req, res, next) => {
  console.error("Loi server:", err.message);
  res
    .status(err.status || 500)
    .json({ success: false, message: err.message || "Loi server" });
});

dbReady
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\nBackend dang chay tai http://localhost:${PORT}`);
      console.log(`Swagger UI:   http://localhost:${PORT}/api-docs`);
      console.log(`Swagger JSON: http://localhost:${PORT}/api-docs.json`);
      console.log(`Du lieu:      backend/data/school.db\n`);
    });
  })
  .catch((err) => {
    console.error("Loi khoi tao database:", err.message);
    process.exit(1);
  });
