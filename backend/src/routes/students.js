const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'students');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Chi chap nhan file anh .jpg .jpeg .png .webp'));
  }
});

/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: Danh sách học sinh
 *     tags: [Học sinh]
 *     parameters:
 *       - in: query
 *         name: class_id
 *         schema: { type: integer }
 *         description: Lọc theo lớp
 *       - in: query
 *         name: trang_thai
 *         schema: { type: string, enum: [dang_hoc, nghi_hoc] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Tìm theo tên, biệt danh, SĐT phụ huynh
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Student' }
 */
router.get('/', (req, res) => {
  const { class_id, trang_thai, search } = req.query;
  let sql = `
    SELECT s.*,
      GROUP_CONCAT(cg.ten_lop, ', ') AS ten_lop_hoc
    FROM students s
    LEFT JOIN enrollments e ON e.student_id = s.id AND e.trang_thai = 'dang_hoc'
    LEFT JOIN class_groups cg ON cg.id = e.class_id
    WHERE 1=1
  `;
  const params = [];
  if (trang_thai) { sql += ' AND s.trang_thai = ?'; params.push(trang_thai); }
  if (search) {
    sql += ' AND (s.ho_ten LIKE ? OR s.biet_danh LIKE ? OR s.sdt_phu_huynh LIKE ?)';
    const kw = `%${search}%`;
    params.push(kw, kw, kw);
  }
  if (class_id) { sql += ' AND e.class_id = ?'; params.push(class_id); }
  sql += ' GROUP BY s.id ORDER BY s.ho_ten ASC';
  try {
    res.json({ success: true, data: db.prepare(sql).all(...params) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/students/{id}:
 *   get:
 *     summary: Chi tiết học sinh (kèm danh sách lớp đang học)
 *     tags: [Học sinh]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Thành công
 *       404:
 *         description: Không tìm thấy
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get('/:id', (req, res) => {
  try {
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Khong tim thay hoc sinh' });
    const enrollments = db.prepare(`
      SELECT e.*, cg.ten_lop, cg.hoc_phi_thang
      FROM enrollments e
      JOIN class_groups cg ON cg.id = e.class_id
      WHERE e.student_id = ?
    `).all(req.params.id);
    res.json({ success: true, data: { ...student, enrollments } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/students:
 *   post:
 *     summary: Thêm học sinh mới
 *     tags: [Học sinh]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [ho_ten]
 *             properties:
 *               ho_ten:         { type: string,  example: 'Nguyễn Văn An' }
 *               biet_danh:      { type: string,  example: 'An' }
 *               hinh_anh:       { type: string,  format: binary }
 *               ngay_sinh:      { type: string,  example: '2016-05-20' }
 *               gioi_tinh:      { type: string,  enum: [nam, nu, khac] }
 *               dia_chi:        { type: string }
 *               ten_phu_huynh:  { type: string }
 *               sdt_phu_huynh:  { type: string,  example: '0905123456' }
 *               ghi_chu:        { type: string }
 *               trang_thai:     { type: string,  enum: [dang_hoc, nghi_hoc] }
 *               ngay_nhap_hoc:  { type: string,  example: '2024-09-01' }
 *               class_ids:
 *                 type: array
 *                 items: { type: integer }
 *                 description: Danh sách ID lớp cần gắn vào
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post('/', upload.single('hinh_anh'), (req, res) => {
  const { ho_ten, biet_danh, ngay_sinh, gioi_tinh, dia_chi, ten_phu_huynh, sdt_phu_huynh, ghi_chu, trang_thai, ngay_nhap_hoc, class_ids } = req.body;
  if (!ho_ten || !ho_ten.trim()) return res.status(400).json({ success: false, message: 'Ho ten khong duoc de trong' });
  const hinh_anh = req.file ? `uploads/students/${req.file.filename}` : null;
  try {
    const insert = db.prepare(`
      INSERT INTO students (ho_ten, biet_danh, hinh_anh, ngay_sinh, gioi_tinh, dia_chi, ten_phu_huynh, sdt_phu_huynh, ghi_chu, trang_thai, ngay_nhap_hoc)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertEnroll = db.prepare(`INSERT OR IGNORE INTO enrollments (student_id, class_id) VALUES (?, ?)`);
    const run = db.transaction(() => {
      const result = insert.run(ho_ten.trim(), biet_danh || null, hinh_anh, ngay_sinh || null, gioi_tinh || null, dia_chi || null, ten_phu_huynh || null, sdt_phu_huynh || null, ghi_chu || null, trang_thai || 'dang_hoc', ngay_nhap_hoc || new Date().toISOString().split('T')[0]);
      const studentId = result.lastInsertRowid;
      if (class_ids) {
        const ids = Array.isArray(class_ids) ? class_ids : [class_ids];
        ids.forEach(cid => insertEnroll.run(studentId, cid));
      }
      return studentId;
    });
    const newId = run();
    res.status(201).json({ success: true, data: db.prepare('SELECT * FROM students WHERE id = ?').get(newId) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/students/{id}:
 *   put:
 *     summary: Cập nhật thông tin học sinh
 *     tags: [Học sinh]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               ho_ten:        { type: string }
 *               biet_danh:     { type: string }
 *               hinh_anh:      { type: string, format: binary }
 *               ngay_sinh:     { type: string }
 *               gioi_tinh:     { type: string, enum: [nam, nu, khac] }
 *               dia_chi:       { type: string }
 *               ten_phu_huynh: { type: string }
 *               sdt_phu_huynh: { type: string }
 *               ghi_chu:       { type: string }
 *               trang_thai:    { type: string, enum: [dang_hoc, nghi_hoc] }
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy
 */
router.put('/:id', upload.single('hinh_anh'), (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay hoc sinh' });
  const { ho_ten, biet_danh, ngay_sinh, gioi_tinh, dia_chi, ten_phu_huynh, sdt_phu_huynh, ghi_chu, trang_thai, ngay_nhap_hoc } = req.body;
  let hinh_anh = existing.hinh_anh;
  if (req.file) {
    if (existing.hinh_anh) { const oldPath = path.join(__dirname, '..', '..', existing.hinh_anh); if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); }
    hinh_anh = `uploads/students/${req.file.filename}`;
  }
  try {
    db.prepare(`UPDATE students SET ho_ten=?, biet_danh=?, hinh_anh=?, ngay_sinh=?, gioi_tinh=?, dia_chi=?, ten_phu_huynh=?, sdt_phu_huynh=?, ghi_chu=?, trang_thai=?, ngay_nhap_hoc=?, updated_at=datetime('now') WHERE id=?`)
      .run(ho_ten?.trim() || existing.ho_ten, biet_danh !== undefined ? biet_danh : existing.biet_danh, hinh_anh, ngay_sinh !== undefined ? ngay_sinh : existing.ngay_sinh, gioi_tinh !== undefined ? gioi_tinh : existing.gioi_tinh, dia_chi !== undefined ? dia_chi : existing.dia_chi, ten_phu_huynh !== undefined ? ten_phu_huynh : existing.ten_phu_huynh, sdt_phu_huynh !== undefined ? sdt_phu_huynh : existing.sdt_phu_huynh, ghi_chu !== undefined ? ghi_chu : existing.ghi_chu, trang_thai || existing.trang_thai, ngay_nhap_hoc || existing.ngay_nhap_hoc, id);
    res.json({ success: true, data: db.prepare('SELECT * FROM students WHERE id = ?').get(id) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/students/{id}:
 *   delete:
 *     summary: Xoá học sinh (kèm ảnh và toàn bộ dữ liệu liên quan)
 *     tags: [Học sinh]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Xoá thành công
 *       404:
 *         description: Không tìm thấy
 */
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay hoc sinh' });
  try {
    if (existing.hinh_anh) { const imgPath = path.join(__dirname, '..', '..', existing.hinh_anh); if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath); }
    db.prepare('DELETE FROM students WHERE id = ?').run(id);
    res.json({ success: true, message: 'Da xoa hoc sinh' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/students/{id}/enroll:
 *   patch:
 *     summary: Gắn hoặc bỏ học sinh khỏi lớp học
 *     tags: [Học sinh]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [class_id, action]
 *             properties:
 *               class_id: { type: integer, example: 3 }
 *               action:   { type: string, enum: [add, remove] }
 *     responses:
 *       200:
 *         description: Thành công
 */
router.patch('/:id/enroll', (req, res) => {
  const { id } = req.params;
  const { class_id, action } = req.body;
  if (!class_id || !action) return res.status(400).json({ success: false, message: 'Thieu class_id hoac action' });
  try {
    if (action === 'add') {
      db.prepare(`INSERT OR IGNORE INTO enrollments (student_id, class_id) VALUES (?, ?)`).run(id, class_id);
    } else {
      db.prepare(`DELETE FROM enrollments WHERE student_id = ? AND class_id = ?`).run(id, class_id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
