const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * @swagger
 * /api/attendance:
 *   get:
 *     summary: Lịch sử điểm danh (lọc theo lớp, ngày, tháng)
 *     tags: [Điểm danh]
 *     parameters:
 *       - in: query
 *         name: class_id
 *         schema: { type: integer }
 *       - in: query
 *         name: ngay
 *         schema: { type: string, example: '2024-12-10' }
 *       - in: query
 *         name: thang
 *         schema: { type: string, example: '2024-12' }
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/', (req, res) => {
  const { class_id, ngay, thang } = req.query;
  let sql = `
    SELECT a.*, s.ho_ten AS ten_hoc_sinh, s.biet_danh, s.hinh_anh,
      cg.ten_lop, t.ho_ten AS ten_giao_vien
    FROM attendance a
    JOIN students s ON s.id = a.student_id
    JOIN class_groups cg ON cg.id = a.class_id
    LEFT JOIN teachers t ON t.id = a.teacher_id
    WHERE 1=1
  `;
  const params = [];
  if (class_id) { sql += ' AND a.class_id = ?'; params.push(class_id); }
  if (ngay)     { sql += ' AND a.ngay = ?';     params.push(ngay); }
  if (thang)    { sql += " AND strftime('%Y-%m', a.ngay) = ?"; params.push(thang); }
  sql += ' ORDER BY a.ngay DESC, s.ho_ten ASC';
  try {
    res.json({ success: true, data: db.prepare(sql).all(...params) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/attendance/sheet:
 *   get:
 *     summary: Bảng điểm danh 1 buổi (dùng cho form điểm danh của giáo viên)
 *     tags: [Điểm danh]
 *     parameters:
 *       - in: query
 *         name: class_id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: ngay
 *         schema: { type: string, example: '2024-12-10' }
 *         description: Mặc định là ngày hôm nay
 *     responses:
 *       200:
 *         description: Thành công — trả về danh sách HS kèm trạng thái đã điểm danh (nếu có)
 *       400:
 *         description: Thiếu class_id
 */
router.get('/sheet', (req, res) => {
  const { class_id, ngay } = req.query;
  if (!class_id) return res.status(400).json({ success: false, message: 'Thieu class_id' });
  const date = ngay || new Date().toISOString().split('T')[0];
  try {
    const students = db.prepare(`
      SELECT s.id, s.ho_ten, s.biet_danh, s.hinh_anh,
        COALESCE(a.trang_thai, 'chua_diem_danh') AS trang_thai, a.ghi_chu
      FROM enrollments e
      JOIN students s ON s.id = e.student_id
      LEFT JOIN attendance a ON a.student_id = s.id AND a.class_id = ? AND a.ngay = ?
      WHERE e.class_id = ? AND e.trang_thai = 'dang_hoc'
      ORDER BY s.ho_ten ASC
    `).all(class_id, date, class_id);
    const cls = db.prepare('SELECT * FROM class_groups WHERE id = ?').get(class_id);
    res.json({ success: true, data: { class: cls, ngay: date, students } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/attendance/summary:
 *   get:
 *     summary: Thống kê chuyên cần (tỉ lệ đi học của từng học sinh)
 *     tags: [Điểm danh]
 *     parameters:
 *       - in: query
 *         name: class_id
 *         schema: { type: integer }
 *       - in: query
 *         name: student_id
 *         schema: { type: integer }
 *       - in: query
 *         name: thang
 *         schema: { type: string, example: '2024-12' }
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
 *                   items:
 *                     type: object
 *                     properties:
 *                       ho_ten:       { type: string }
 *                       tong_buoi:    { type: integer }
 *                       co_mat:       { type: integer }
 *                       vang_mat:     { type: integer }
 *                       vang_phep:    { type: integer }
 *                       ty_le_di_hoc: { type: number, example: 92.5 }
 */
router.get('/summary', (req, res) => {
  const { student_id, class_id, thang } = req.query;
  let sql = `
    SELECT s.id, s.ho_ten, s.biet_danh,
      COUNT(*) AS tong_buoi,
      SUM(CASE WHEN a.trang_thai='co_mat'    THEN 1 ELSE 0 END) AS co_mat,
      SUM(CASE WHEN a.trang_thai='vang_mat'  THEN 1 ELSE 0 END) AS vang_mat,
      SUM(CASE WHEN a.trang_thai='vang_phep' THEN 1 ELSE 0 END) AS vang_phep,
      ROUND(100.0 * SUM(CASE WHEN a.trang_thai='co_mat' THEN 1 ELSE 0 END) / COUNT(*), 1) AS ty_le_di_hoc
    FROM attendance a JOIN students s ON s.id = a.student_id WHERE 1=1
  `;
  const params = [];
  if (student_id) { sql += ' AND a.student_id = ?'; params.push(student_id); }
  if (class_id)   { sql += ' AND a.class_id = ?';   params.push(class_id); }
  if (thang)      { sql += " AND strftime('%Y-%m', a.ngay) = ?"; params.push(thang); }
  sql += ' GROUP BY a.student_id ORDER BY s.ho_ten ASC';
  try {
    res.json({ success: true, data: db.prepare(sql).all(...params) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/attendance:
 *   post:
 *     summary: Lưu điểm danh 1 buổi học (gửi mảng toàn bộ học sinh)
 *     tags: [Điểm danh]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [class_id, records]
 *             properties:
 *               class_id:   { type: integer, example: 3 }
 *               teacher_id: { type: integer, example: 1 }
 *               ngay:       { type: string,  example: '2024-12-10' }
 *               records:
 *                 type: array
 *                 items: { $ref: '#/components/schemas/AttendanceRecord' }
 *                 example:
 *                   - { student_id: 1, trang_thai: co_mat }
 *                   - { student_id: 2, trang_thai: vang_phep, ghi_chu: 'Bệnh' }
 *     responses:
 *       200:
 *         description: Lưu thành công (nếu đã có thì cập nhật)
 */
/**
 * GET /api/attendance/monthly?class_id=X&thang=YYYY-MM
 * Ma trận điểm danh cả tháng: học sinh × ngày
 */
router.get('/monthly', (req, res) => {
  const { class_id, thang } = req.query;
  if (!class_id || !thang) return res.status(400).json({ success: false, message: 'Thieu class_id hoac thang' });
  try {
    const cls = db.prepare(
      `SELECT cg.*, t.ho_ten AS ten_giao_vien FROM class_groups cg LEFT JOIN teachers t ON t.id = cg.teacher_id WHERE cg.id = ?`
    ).get(class_id);
    if (!cls) return res.status(404).json({ success: false, message: 'Khong tim thay lop' });

    const students = db.prepare(`
      SELECT s.id, s.ho_ten, s.biet_danh
      FROM enrollments e JOIN students s ON s.id = e.student_id
      WHERE e.class_id = ? AND e.trang_thai = 'dang_hoc'
      ORDER BY s.ho_ten ASC
    `).all(class_id);

    const records = db.prepare(`
      SELECT student_id, ngay, trang_thai
      FROM attendance WHERE class_id = ? AND strftime('%Y-%m', ngay) = ?
    `).all(class_id, thang);

    // Build matrix: { student_id: { 'YYYY-MM-DD': trang_thai } }
    const data = {};
    students.forEach(s => { data[s.id] = {}; });
    records.forEach(r => { if (data[r.student_id]) data[r.student_id][r.ngay] = r.trang_thai; });

    // Teacher per day: { 'YYYY-MM-DD': { teacher_id, ho_ten } }
    const teacherRows = db.prepare(`
      SELECT a.ngay, a.teacher_id, t.ho_ten
      FROM attendance a LEFT JOIN teachers t ON t.id = a.teacher_id
      WHERE a.class_id = ? AND strftime('%Y-%m', a.ngay) = ? AND a.teacher_id IS NOT NULL
      GROUP BY a.ngay
    `).all(class_id, thang);
    const teacherByDay = {};
    teacherRows.forEach(r => { teacherByDay[r.ngay] = { teacher_id: r.teacher_id, ho_ten: r.ho_ten }; });

    const [year, month] = thang.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    res.json({ success: true, data: { cls, students, data, daysInMonth, teacherByDay } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/attendance/batch
 * Lưu nhiều thay đổi điểm danh cùng lúc
 * Body: { class_id, changes: [{student_id, ngay, trang_thai}] }
 *   trang_thai = null/'' → xóa bản ghi đó
 */
/**
 * GET /api/attendance/teacher-monthly?thang=YYYY-MM
 * Ma trận điểm danh giáo viên: mỗi GV, mỗi ngày dạy lớp nào
 */
router.get('/teacher-monthly', (req, res) => {
  const thang = req.query.thang || new Date().toISOString().slice(0, 7);
  try {
    const teachers = db.prepare(
      `SELECT id, ho_ten, luong_buoi FROM teachers WHERE trang_thai = 'dang_day' ORDER BY ho_ten ASC`
    ).all();

    // Số buổi per teacher per class per day (gộp từ bảng attendance)
    const sessions = db.prepare(`
      SELECT a.teacher_id, a.class_id, a.ngay, cg.ten_lop,
             COUNT(DISTINCT a.student_id) AS so_hoc_sinh
      FROM attendance a
      JOIN class_groups cg ON cg.id = a.class_id
      WHERE a.teacher_id IS NOT NULL
        AND strftime('%Y-%m', a.ngay) = ?
      GROUP BY a.teacher_id, a.class_id, a.ngay
      ORDER BY a.ngay ASC
    `).all(thang);

    // Build map: { teacher_id: { 'YYYY-MM-DD': [{class_id, ten_lop, so_hoc_sinh}] } }
    const data = {};
    teachers.forEach(t => { data[t.id] = {}; });
    sessions.forEach(s => {
      if (!data[s.teacher_id]) return;
      if (!data[s.teacher_id][s.ngay]) data[s.teacher_id][s.ngay] = [];
      data[s.teacher_id][s.ngay].push({ class_id: s.class_id, ten_lop: s.ten_lop, so_hoc_sinh: s.so_hoc_sinh });
    });

    const [year, month] = thang.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    res.json({ success: true, data: { teachers, data, daysInMonth } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/attendance/set-teacher
 * Gán giáo viên dạy cho toàn bộ bản ghi của 1 lớp trong 1 ngày
 * Body: { class_id, ngay, teacher_id }  — teacher_id=null để xóa GV
 */
router.patch('/set-teacher', (req, res) => {
  const { class_id, ngay, teacher_id } = req.body;
  if (!class_id || !ngay) return res.status(400).json({ success: false, message: 'Thieu class_id hoac ngay' });
  try {
    const result = db.prepare(
      `UPDATE attendance SET teacher_id = ? WHERE class_id = ? AND ngay = ?`
    ).run(teacher_id || null, class_id, ngay);
    res.json({ success: true, changes: result.changes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/batch', (req, res) => {
  const { class_id, changes } = req.body;
  if (!class_id || !Array.isArray(changes) || changes.length === 0)
    return res.status(400).json({ success: false, message: 'Thieu class_id hoac changes' });
  const upsert = db.prepare(`
    INSERT INTO attendance (student_id, class_id, ngay, trang_thai)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(student_id, class_id, ngay)
    DO UPDATE SET trang_thai = excluded.trang_thai
  `);
  const del = db.prepare('DELETE FROM attendance WHERE student_id=? AND class_id=? AND ngay=?');
  try {
    db.transaction(() => {
      changes.forEach(c => {
        if (c.trang_thai) upsert.run(c.student_id, class_id, c.ngay, c.trang_thai);
        else              del.run(c.student_id, class_id, c.ngay);
      });
    })();
    res.json({ success: true, message: `Da luu ${changes.length} thay doi` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', (req, res) => {
  const { class_id, teacher_id, ngay, records } = req.body;
  if (!class_id || !records || !Array.isArray(records)) return res.status(400).json({ success: false, message: 'Thieu class_id hoac records' });
  const date = ngay || new Date().toISOString().split('T')[0];
  const upsert = db.prepare(`
    INSERT INTO attendance (student_id, class_id, teacher_id, ngay, trang_thai, ghi_chu)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(student_id, class_id, ngay)
    DO UPDATE SET trang_thai=excluded.trang_thai, ghi_chu=excluded.ghi_chu, teacher_id=excluded.teacher_id
  `);
  try {
    db.transaction(() => { records.forEach(r => upsert.run(r.student_id, class_id, teacher_id || null, date, r.trang_thai || 'co_mat', r.ghi_chu || null)); })();
    const co_mat = records.filter(r => r.trang_thai === 'co_mat').length;
    res.json({ success: true, message: `Da luu diem danh ${records.length} hoc sinh`, data: { co_mat, vang: records.length - co_mat } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
