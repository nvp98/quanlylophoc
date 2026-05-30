const express = require('express');
const router = express.Router();
const db = require('../db');

function xepLoai(diem) {
  if (diem === null || diem === undefined) return null;
  if (diem >= 9) return 'gioi';
  if (diem >= 7) return 'kha';
  if (diem >= 5) return 'trung_binh';
  return 'yeu';
}

/**
 * @swagger
 * /api/results:
 *   get:
 *     summary: Danh sách kết quả học tập
 *     tags: [Kết quả]
 *     parameters:
 *       - in: query
 *         name: student_id
 *         schema: { type: integer }
 *       - in: query
 *         name: class_id
 *         schema: { type: integer }
 *       - in: query
 *         name: ky
 *         schema: { type: string, example: 'HK1-2024' }
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/', (req, res) => {
  const { student_id, class_id, ky } = req.query;
  let sql = `SELECT r.*, s.ho_ten AS ten_hoc_sinh, s.biet_danh, s.hinh_anh, cg.ten_lop FROM results r JOIN students s ON s.id = r.student_id JOIN class_groups cg ON cg.id = r.class_id WHERE 1=1`;
  const params = [];
  if (student_id) { sql += ' AND r.student_id = ?'; params.push(student_id); }
  if (class_id)   { sql += ' AND r.class_id = ?';   params.push(class_id); }
  if (ky)         { sql += ' AND r.ky = ?';          params.push(ky); }
  sql += ' ORDER BY r.ngay_nhap DESC, s.ho_ten ASC';
  try {
    res.json({ success: true, data: db.prepare(sql).all(...params) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/results/report:
 *   get:
 *     summary: Bảng tổng kết lớp theo kỳ (kèm thống kê điểm TB, giỏi/khá/TB/yếu)
 *     tags: [Kết quả]
 *     parameters:
 *       - in: query
 *         name: class_id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: ky
 *         required: true
 *         schema: { type: string, example: 'HK1-2024' }
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
 *                     ky:       { type: string }
 *                     students: { type: array }
 *                     stats:
 *                       type: object
 *                       properties:
 *                         tong:         { type: integer }
 *                         gioi:         { type: integer }
 *                         kha:          { type: integer }
 *                         trung_binh:   { type: integer }
 *                         yeu:          { type: integer }
 *                         diem_tb:      { type: number }
 *                         diem_cao_nhat: { type: number }
 *                         diem_thap_nhat: { type: number }
 */
router.get('/report', (req, res) => {
  const { class_id, ky } = req.query;
  if (!class_id || !ky) return res.status(400).json({ success: false, message: 'Thieu class_id hoac ky' });
  try {
    const rows = db.prepare(`
      SELECT s.id, s.ho_ten, s.biet_danh, s.hinh_anh,
        r.diem_so, r.xep_loai, r.nhan_xet, r.ngay_nhap
      FROM enrollments e
      JOIN students s ON s.id = e.student_id
      LEFT JOIN results r ON r.student_id = s.id AND r.class_id = ? AND r.ky = ?
      WHERE e.class_id = ? AND e.trang_thai = 'dang_hoc'
      ORDER BY r.diem_so DESC, s.ho_ten ASC
    `).all(class_id, ky, class_id);
    const stats = { tong: rows.length, da_co_diem: rows.filter(r => r.diem_so !== null).length, gioi: rows.filter(r => r.xep_loai === 'gioi').length, kha: rows.filter(r => r.xep_loai === 'kha').length, trung_binh: rows.filter(r => r.xep_loai === 'trung_binh').length, yeu: rows.filter(r => r.xep_loai === 'yeu').length };
    const diems = rows.filter(r => r.diem_so !== null).map(r => r.diem_so);
    if (diems.length) { stats.diem_tb = +(diems.reduce((a, b) => a + b, 0) / diems.length).toFixed(1); stats.diem_cao_nhat = Math.max(...diems); stats.diem_thap_nhat = Math.min(...diems); }
    res.json({ success: true, data: { ky, students: rows, stats } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/results:
 *   post:
 *     summary: Nhập điểm 1 học sinh (xếp loại tự động từ điểm số)
 *     tags: [Kết quả]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [student_id, class_id, ky]
 *             properties:
 *               student_id: { type: integer }
 *               class_id:   { type: integer }
 *               ky:         { type: string, example: 'HK1-2024' }
 *               diem_so:    { type: number,  example: 8.5, description: 'Tự động tính xếp loại: >=9 giỏi, >=7 khá, >=5 TB, <5 yếu' }
 *               nhan_xet:   { type: string }
 *               ngay_nhap:  { type: string }
 *     responses:
 *       201:
 *         description: Thêm thành công
 */
router.post('/', (req, res) => {
  const { student_id, class_id, ky, diem_so, nhan_xet, ngay_nhap } = req.body;
  if (!student_id || !class_id || !ky) return res.status(400).json({ success: false, message: 'Thieu student_id, class_id hoac ky' });
  try {
    const result = db.prepare(`INSERT INTO results (student_id, class_id, ky, diem_so, xep_loai, nhan_xet, ngay_nhap) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`)
      .run(student_id, class_id, ky, diem_so !== undefined ? diem_so : null, xepLoai(diem_so), nhan_xet || null, ngay_nhap || new Date().toISOString().split('T')[0]);
    res.status(201).json({ success: true, data: db.prepare('SELECT * FROM results WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/results/bulk:
 *   post:
 *     summary: Nhập điểm hàng loạt cả lớp
 *     tags: [Kết quả]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [class_id, ky, records]
 *             properties:
 *               class_id: { type: integer }
 *               ky:       { type: string, example: 'HK1-2024' }
 *               records:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     student_id: { type: integer }
 *                     diem_so:    { type: number }
 *                     nhan_xet:   { type: string }
 *                 example:
 *                   - { student_id: 1, diem_so: 8.5, nhan_xet: 'Tiến bộ tốt' }
 *                   - { student_id: 2, diem_so: 6.0 }
 *     responses:
 *       200:
 *         description: Lưu thành công (nếu đã có thì cập nhật)
 */
router.post('/bulk', (req, res) => {
  const { class_id, ky, records } = req.body;
  if (!class_id || !ky || !Array.isArray(records)) return res.status(400).json({ success: false, message: 'Thieu class_id, ky hoac records' });
  const upsert = db.prepare(`INSERT INTO results (student_id, class_id, ky, diem_so, xep_loai, nhan_xet, ngay_nhap) VALUES (?, ?, ?, ?, ?, ?, date('now')) ON CONFLICT(student_id, class_id, ky) DO UPDATE SET diem_so=excluded.diem_so, xep_loai=excluded.xep_loai, nhan_xet=excluded.nhan_xet`);
  try {
    db.transaction(() => { records.forEach(r => upsert.run(r.student_id, class_id, ky, r.diem_so ?? null, xepLoai(r.diem_so), r.nhan_xet || null)); })();
    res.json({ success: true, message: `Da luu ${records.length} ket qua` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/results/{id}:
 *   put:
 *     summary: Cập nhật kết quả học tập
 *     tags: [Kết quả]
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
 *               diem_so:   { type: number }
 *               nhan_xet:  { type: string }
 *               ngay_nhap: { type: string }
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM results WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay ket qua' });
  const { diem_so, nhan_xet, ngay_nhap } = req.body;
  const newDiem = diem_so !== undefined ? diem_so : existing.diem_so;
  try {
    db.prepare(`UPDATE results SET diem_so=?, xep_loai=?, nhan_xet=?, ngay_nhap=? WHERE id=?`)
      .run(newDiem, xepLoai(newDiem), nhan_xet !== undefined ? nhan_xet : existing.nhan_xet, ngay_nhap || existing.ngay_nhap, id);
    res.json({ success: true, data: db.prepare('SELECT * FROM results WHERE id = ?').get(id) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/results/{id}:
 *   delete:
 *     summary: Xoá kết quả học tập
 *     tags: [Kết quả]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Xoá thành công
 */
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM results WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ success: false, message: 'Khong tim thay ket qua' });
    res.json({ success: true, message: 'Da xoa ket qua' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
