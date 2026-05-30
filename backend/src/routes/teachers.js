const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * @swagger
 * /api/teachers:
 *   get:
 *     summary: Danh sách giáo viên
 *     tags: [Giáo viên]
 *     parameters:
 *       - in: query
 *         name: trang_thai
 *         schema: { type: string, enum: [dang_day, nghi] }
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Teacher' }
 */
router.get('/', (req, res) => {
  const { trang_thai } = req.query;
  let sql = `SELECT t.*, COUNT(DISTINCT cg.id) AS so_lop FROM teachers t LEFT JOIN class_groups cg ON cg.teacher_id = t.id WHERE 1=1`;
  const params = [];
  if (trang_thai) { sql += ' AND t.trang_thai = ?'; params.push(trang_thai); }
  sql += ' GROUP BY t.id ORDER BY t.ho_ten ASC';
  try {
    res.json({ success: true, data: db.prepare(sql).all(...params) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/teachers/{id}:
 *   get:
 *     summary: Chi tiết giáo viên (kèm lớp phụ trách và thống kê buổi dạy tháng hiện tại)
 *     tags: [Giáo viên]
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
 */
router.get('/:id', (req, res) => {
  try {
    const teacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(req.params.id);
    if (!teacher) return res.status(404).json({ success: false, message: 'Khong tim thay giao vien' });
    const classes = db.prepare('SELECT * FROM class_groups WHERE teacher_id = ?').all(req.params.id);
    const thang = new Date().toISOString().slice(0, 7);
    const attendance_summary = db.prepare(`
      SELECT COUNT(*) as tong_buoi, SUM(CASE WHEN trang_thai='co_mat' THEN 1 ELSE 0 END) as so_buoi_day
      FROM attendance WHERE teacher_id = ? AND strftime('%Y-%m', ngay) = ?
    `).get(req.params.id, thang);
    res.json({ success: true, data: { ...teacher, classes, attendance_summary } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/teachers:
 *   post:
 *     summary: Thêm giáo viên mới
 *     tags: [Giáo viên]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ho_ten]
 *             properties:
 *               ho_ten:     { type: string,  example: 'Trần Thị Lan' }
 *               sdt:        { type: string,  example: '0912345678' }
 *               dia_chi:    { type: string }
 *               luong_buoi: { type: integer, example: 150000 }
 *               trang_thai: { type: string,  enum: [dang_day, nghi] }
 *               ghi_chu:    { type: string }
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.post('/', (req, res) => {
  const { ho_ten, sdt, dia_chi, luong_buoi, trang_thai, ghi_chu } = req.body;
  if (!ho_ten?.trim()) return res.status(400).json({ success: false, message: 'Ho ten khong duoc de trong' });
  try {
    const result = db.prepare(`INSERT INTO teachers (ho_ten, sdt, dia_chi, luong_buoi, trang_thai, ghi_chu) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(ho_ten.trim(), sdt || null, dia_chi || null, luong_buoi || 0, trang_thai || 'dang_day', ghi_chu || null);
    res.status(201).json({ success: true, data: db.prepare('SELECT * FROM teachers WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/teachers/{id}:
 *   put:
 *     summary: Cập nhật giáo viên
 *     tags: [Giáo viên]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ho_ten:     { type: string }
 *               sdt:        { type: string }
 *               dia_chi:    { type: string }
 *               luong_buoi: { type: integer }
 *               trang_thai: { type: string, enum: [dang_day, nghi] }
 *               ghi_chu:    { type: string }
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy
 */
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay giao vien' });
  const { ho_ten, sdt, dia_chi, luong_buoi, trang_thai, ghi_chu } = req.body;
  try {
    db.prepare(`UPDATE teachers SET ho_ten=?, sdt=?, dia_chi=?, luong_buoi=?, trang_thai=?, ghi_chu=?, updated_at=datetime('now') WHERE id=?`)
      .run(ho_ten?.trim() || existing.ho_ten, sdt !== undefined ? sdt : existing.sdt, dia_chi !== undefined ? dia_chi : existing.dia_chi, luong_buoi !== undefined ? luong_buoi : existing.luong_buoi, trang_thai || existing.trang_thai, ghi_chu !== undefined ? ghi_chu : existing.ghi_chu, id);
    res.json({ success: true, data: db.prepare('SELECT * FROM teachers WHERE id = ?').get(id) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/teachers/{id}:
 *   delete:
 *     summary: Xoá giáo viên
 *     tags: [Giáo viên]
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
  try {
    const result = db.prepare('DELETE FROM teachers WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ success: false, message: 'Khong tim thay giao vien' });
    res.json({ success: true, message: 'Da xoa giao vien' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/teachers/{id}/salary:
 *   get:
 *     summary: Tính lương giáo viên theo tháng
 *     tags: [Giáo viên]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: thang
 *         schema: { type: string, example: '2024-12' }
 *         description: Tháng cần tính (mặc định tháng hiện tại)
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     ho_ten:     { type: string }
 *                     thang:      { type: string }
 *                     so_buoi:    { type: integer }
 *                     luong_buoi: { type: integer }
 *                     tong_luong: { type: integer }
 */
router.get('/:id/salary', (req, res) => {
  const { id } = req.params;
  const thang = req.query.thang || new Date().toISOString().slice(0, 7);
  try {
    const teacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id);
    if (!teacher) return res.status(404).json({ success: false, message: 'Khong tim thay giao vien' });
    const buoiDay = db.prepare(`SELECT COUNT(DISTINCT ngay || '-' || class_id) as so_buoi FROM attendance WHERE teacher_id = ? AND strftime('%Y-%m', ngay) = ?`).get(id, thang);
    const so_buoi = buoiDay.so_buoi || 0;
    res.json({ success: true, data: { teacher_id: Number(id), ho_ten: teacher.ho_ten, thang, so_buoi, luong_buoi: teacher.luong_buoi, tong_luong: so_buoi * teacher.luong_buoi } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
