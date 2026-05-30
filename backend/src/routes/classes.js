const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * @swagger
 * /api/classes:
 *   get:
 *     summary: Danh sách lớp học (kèm số học sinh và tên giáo viên)
 *     tags: [Lớp học]
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
 *                   items: { $ref: '#/components/schemas/ClassGroup' }
 */
router.get('/', (req, res) => {
  try {
    const { nam_hoc, hoc_ky, teacher_id } = req.query;
    const conditions = [];
    const params = [];
    if (nam_hoc)    { conditions.push('cg.nam_hoc = ?');    params.push(nam_hoc); }
    if (hoc_ky)     { conditions.push('cg.hoc_ky = ?');     params.push(hoc_ky); }
    if (teacher_id) { conditions.push('cg.teacher_id = ?'); params.push(teacher_id); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const rows = db.prepare(`
      SELECT cg.*, t.ho_ten AS ten_giao_vien,
        COUNT(DISTINCT CASE WHEN e.trang_thai='dang_hoc' THEN e.student_id END) AS so_hoc_sinh
      FROM class_groups cg
      LEFT JOIN teachers t ON t.id = cg.teacher_id
      LEFT JOIN enrollments e ON e.class_id = cg.id
      ${where}
      GROUP BY cg.id ORDER BY cg.nam_hoc DESC, cg.hoc_ky ASC, cg.id ASC
    `).all(...params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/classes/{id}:
 *   get:
 *     summary: Chi tiết lớp học (kèm danh sách học sinh)
 *     tags: [Lớp học]
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
    const cls = db.prepare(`SELECT cg.*, t.ho_ten AS ten_giao_vien FROM class_groups cg LEFT JOIN teachers t ON t.id = cg.teacher_id WHERE cg.id = ?`).get(req.params.id);
    if (!cls) return res.status(404).json({ success: false, message: 'Khong tim thay lop' });
    const students = db.prepare(`
      SELECT s.id, s.ho_ten, s.biet_danh, s.hinh_anh, s.sdt_phu_huynh, e.trang_thai, e.ngay_vao
      FROM enrollments e JOIN students s ON s.id = e.student_id
      WHERE e.class_id = ? ORDER BY s.ho_ten ASC
    `).all(req.params.id);
    res.json({ success: true, data: { ...cls, students } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/classes:
 *   post:
 *     summary: Tạo lớp học mới
 *     tags: [Lớp học]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ten_lop]
 *             properties:
 *               ten_lop:       { type: string,  example: 'Lớp 5' }
 *               mo_ta:         { type: string }
 *               hoc_phi_thang: { type: integer, example: 400000 }
 *               teacher_id:    { type: integer, example: 1 }
 *               lich_hoc:      { type: string,  example: 'Thứ 3, 5 — 16:30-18:00' }
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       400:
 *         description: Tên lớp đã tồn tại
 */
router.post('/', (req, res) => {
  const { ten_lop, mo_ta, hoc_phi_thang, teacher_id, lich_hoc, hoc_ky, nam_hoc, thang_bat_dau, thang_ket_thuc } = req.body;
  if (!ten_lop?.trim()) return res.status(400).json({ success: false, message: 'Ten lop khong duoc de trong' });
  try {
    const result = db.prepare(`INSERT INTO class_groups (ten_lop, mo_ta, hoc_phi_thang, teacher_id, lich_hoc, hoc_ky, nam_hoc, thang_bat_dau, thang_ket_thuc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(ten_lop.trim(), mo_ta || null, hoc_phi_thang || 0, teacher_id || null, lich_hoc || null, hoc_ky || null, nam_hoc || null, thang_bat_dau || null, thang_ket_thuc || null);
    res.status(201).json({ success: true, data: db.prepare('SELECT * FROM class_groups WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ success: false, message: 'Ten lop da ton tai' });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/classes/{id}:
 *   put:
 *     summary: Cập nhật lớp học
 *     tags: [Lớp học]
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
 *               ten_lop:       { type: string }
 *               mo_ta:         { type: string }
 *               hoc_phi_thang: { type: integer }
 *               teacher_id:    { type: integer }
 *               lich_hoc:      { type: string }
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy
 */
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM class_groups WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay lop' });
  const { ten_lop, mo_ta, hoc_phi_thang, teacher_id, lich_hoc, hoc_ky, nam_hoc, thang_bat_dau, thang_ket_thuc } = req.body;
  try {
    db.prepare(`UPDATE class_groups SET ten_lop=?, mo_ta=?, hoc_phi_thang=?, teacher_id=?, lich_hoc=?, hoc_ky=?, nam_hoc=?, thang_bat_dau=?, thang_ket_thuc=?, updated_at=datetime('now') WHERE id=?`)
      .run(ten_lop?.trim() || existing.ten_lop, mo_ta !== undefined ? mo_ta : existing.mo_ta, hoc_phi_thang !== undefined ? hoc_phi_thang : existing.hoc_phi_thang, teacher_id !== undefined ? teacher_id : existing.teacher_id, lich_hoc !== undefined ? lich_hoc : existing.lich_hoc, hoc_ky !== undefined ? hoc_ky : existing.hoc_ky, nam_hoc !== undefined ? nam_hoc : existing.nam_hoc, thang_bat_dau !== undefined ? thang_bat_dau : existing.thang_bat_dau, thang_ket_thuc !== undefined ? thang_ket_thuc : existing.thang_ket_thuc, id);
    res.json({ success: true, data: db.prepare('SELECT * FROM class_groups WHERE id = ?').get(id) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/classes/{id}:
 *   delete:
 *     summary: Xoá lớp học
 *     tags: [Lớp học]
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
    const result = db.prepare('DELETE FROM class_groups WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ success: false, message: 'Khong tim thay lop' });
    res.json({ success: true, message: 'Da xoa lop' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
