const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * @swagger
 * /api/finance:
 *   get:
 *     summary: Danh sách thu chi (lọc theo tháng, loại, học sinh)
 *     tags: [Thu chi]
 *     parameters:
 *       - in: query
 *         name: thang
 *         schema: { type: string, example: '2024-12' }
 *       - in: query
 *         name: loai
 *         schema: { type: string, enum: [thu, chi] }
 *       - in: query
 *         name: student_id
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/', (req, res) => {
  const { thang, loai, student_id } = req.query;
  let sql = `SELECT f.*, s.ho_ten AS ten_hoc_sinh, s.biet_danh, t.ho_ten AS ten_giao_vien FROM finance f LEFT JOIN students s ON s.id = f.student_id LEFT JOIN teachers t ON t.id = f.teacher_id WHERE 1=1`;
  const params = [];
  if (thang)      { sql += ' AND f.thang = ?';      params.push(thang); }
  if (loai)       { sql += ' AND f.loai = ?';        params.push(loai); }
  if (student_id) { sql += ' AND f.student_id = ?'; params.push(student_id); }
  sql += ' ORDER BY f.ngay DESC';
  try {
    res.json({ success: true, data: db.prepare(sql).all(...params) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/finance/summary:
 *   get:
 *     summary: Tổng kết thu chi theo tháng
 *     tags: [Thu chi]
 *     parameters:
 *       - in: query
 *         name: thang
 *         schema: { type: string, example: '2024-12' }
 *         description: Mặc định tháng hiện tại
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
 *                     thang:       { type: string }
 *                     tong_thu:    { type: integer }
 *                     tong_chi:    { type: integer }
 *                     chenh_lech:  { type: integer }
 *                     by_category: { type: array }
 */
router.get('/summary', (req, res) => {
  const thang = req.query.thang || new Date().toISOString().slice(0, 7);
  try {
    const summary = db.prepare(`
      SELECT SUM(CASE WHEN loai='thu' THEN so_tien ELSE 0 END) AS tong_thu,
        SUM(CASE WHEN loai='chi' THEN so_tien ELSE 0 END) AS tong_chi,
        SUM(CASE WHEN loai='thu' THEN so_tien ELSE -so_tien END) AS chenh_lech,
        COUNT(CASE WHEN loai='thu' THEN 1 END) AS so_luot_thu,
        COUNT(CASE WHEN loai='chi' THEN 1 END) AS so_luot_chi
      FROM finance WHERE thang = ?
    `).get(thang);
    const by_category = db.prepare(`
      SELECT loai, danh_muc, SUM(so_tien) AS tong, COUNT(*) AS so_luot
      FROM finance WHERE thang = ? GROUP BY loai, danh_muc ORDER BY loai, tong DESC
    `).all(thang);
    res.json({ success: true, data: { thang, ...summary, by_category } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/finance/unpaid:
 *   get:
 *     summary: Danh sách học sinh chưa đóng học phí tháng
 *     tags: [Thu chi]
 *     parameters:
 *       - in: query
 *         name: thang
 *         schema: { type: string, example: '2024-12' }
 *         description: Mặc định tháng hiện tại
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 thang:   { type: string }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ho_ten:           { type: string }
 *                       ten_lop:          { type: string }
 *                       hoc_phi_can_dong: { type: integer }
 */
/**
 * GET /api/finance/teacher-salary?thang=YYYY-MM
 * Tính lương giáo viên theo số buổi dạy trong tháng
 */
router.get('/teacher-salary', (req, res) => {
  const thang = req.query.thang || new Date().toISOString().slice(0, 7);
  try {
    const teachers = db.prepare(`
      SELECT t.id, t.ho_ten, t.sdt, t.luong_buoi
      FROM teachers t
      WHERE t.trang_thai = 'dang_day'
      ORDER BY t.ho_ten ASC
    `).all();

    const data = teachers.map(t => {
      // Số buổi dạy mỗi lớp trong tháng (đếm theo ngày riêng biệt)
      const lops = db.prepare(`
        SELECT cg.id AS class_id, cg.ten_lop,
               COUNT(DISTINCT a.ngay) AS so_buoi
        FROM attendance a
        JOIN class_groups cg ON cg.id = a.class_id
        WHERE a.teacher_id = ? AND strftime('%Y-%m', a.ngay) = ?
        GROUP BY a.class_id
        ORDER BY cg.ten_lop ASC
      `).all(t.id, thang);

      const tong_buoi = lops.reduce((s, l) => s + l.so_buoi, 0);
      const tong_luong = tong_buoi * (t.luong_buoi || 0);

      // Đã trả chưa?
      const payment = db.prepare(`
        SELECT id, so_tien, ngay FROM finance
        WHERE teacher_id = ? AND loai = 'chi' AND danh_muc = 'luong_gv' AND thang = ?
        LIMIT 1
      `).get(t.id, thang);

      return {
        teacher_id: t.id, ho_ten: t.ho_ten, sdt: t.sdt,
        luong_buoi: t.luong_buoi || 0,
        tong_buoi, tong_luong,
        lops,
        da_tra: !!payment,
        finance_id: payment?.id || null,
        so_tien_da_tra: payment?.so_tien || null,
        ngay_tra: payment?.ngay || null,
      };
    });

    res.json({ success: true, data, thang });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/finance/tuition-status?thang=YYYY-MM
 * Trạng thái học phí từng học sinh trong từng lớp đang hoạt động
 */
router.get('/tuition-status', (req, res) => {
  const thang = req.query.thang || new Date().toISOString().slice(0, 7);
  try {
    const rows = db.prepare(`
      SELECT
        cg.id AS class_id, cg.ten_lop, cg.hoc_phi_thang, cg.hoc_ky, cg.nam_hoc,
        cg.thang_bat_dau, cg.thang_ket_thuc,
        s.id AS student_id, s.ho_ten, s.biet_danh, s.hinh_anh, s.sdt_phu_huynh,
        f.id AS finance_id, f.so_tien AS so_tien_dong, f.ngay AS ngay_dong
      FROM class_groups cg
      JOIN enrollments e ON e.class_id = cg.id AND e.trang_thai = 'dang_hoc'
      JOIN students s ON s.id = e.student_id AND s.trang_thai = 'dang_hoc'
      LEFT JOIN finance f ON f.student_id = s.id
        AND f.class_id = cg.id
        AND f.loai = 'thu' AND f.danh_muc = 'hoc_phi' AND f.thang = ?
      WHERE (cg.thang_bat_dau IS NULL OR cg.thang_bat_dau <= ?)
        AND (cg.thang_ket_thuc IS NULL OR cg.thang_ket_thuc >= ?)
      ORDER BY cg.id ASC, s.ho_ten ASC
    `).all(thang, thang, thang);

    const classMap = {};
    rows.forEach(row => {
      if (!classMap[row.class_id]) {
        classMap[row.class_id] = {
          class_id: row.class_id, ten_lop: row.ten_lop,
          hoc_phi_thang: row.hoc_phi_thang, hoc_ky: row.hoc_ky, nam_hoc: row.nam_hoc,
          thang_bat_dau: row.thang_bat_dau, thang_ket_thuc: row.thang_ket_thuc,
          students: []
        };
      }
      classMap[row.class_id].students.push({
        student_id: row.student_id, ho_ten: row.ho_ten,
        biet_danh: row.biet_danh, hinh_anh: row.hinh_anh, sdt_phu_huynh: row.sdt_phu_huynh,
        da_dong: row.finance_id !== null,
        finance_id: row.finance_id, so_tien_dong: row.so_tien_dong, ngay_dong: row.ngay_dong
      });
    });

    const data = Object.values(classMap).map(c => ({
      ...c,
      da_dong: c.students.filter(s => s.da_dong).length,
      chua_dong: c.students.filter(s => !s.da_dong).length,
      tong: c.students.length
    }));

    res.json({ success: true, data, thang });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/unpaid', (req, res) => {
  const thang = req.query.thang || new Date().toISOString().slice(0, 7);
  try {
    const unpaid = db.prepare(`
      SELECT DISTINCT s.id, s.ho_ten, s.biet_danh, s.hinh_anh, s.sdt_phu_huynh, s.ten_phu_huynh,
        GROUP_CONCAT(cg.ten_lop, ', ') AS ten_lop,
        SUM(cg.hoc_phi_thang) AS hoc_phi_can_dong
      FROM students s
      JOIN enrollments e ON e.student_id = s.id AND e.trang_thai = 'dang_hoc'
      JOIN class_groups cg ON cg.id = e.class_id
      WHERE s.trang_thai = 'dang_hoc'
        AND NOT EXISTS (
          SELECT 1 FROM finance f WHERE f.student_id = s.id AND f.loai='thu' AND f.danh_muc='hoc_phi' AND f.thang = ?
        )
      GROUP BY s.id ORDER BY s.ho_ten ASC
    `).all(thang);
    res.json({ success: true, data: unpaid, thang });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/finance:
 *   post:
 *     summary: Ghi 1 khoản thu hoặc chi
 *     tags: [Thu chi]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [loai, so_tien]
 *             properties:
 *               loai:       { type: string,  enum: [thu, chi] }
 *               danh_muc:   { type: string,  example: 'hoc_phi', description: 'hoc_phi | luong_gv | van_phong | khac' }
 *               student_id: { type: integer }
 *               teacher_id: { type: integer }
 *               so_tien:    { type: integer, example: 350000 }
 *               ngay:       { type: string,  example: '2024-12-01' }
 *               mo_ta:      { type: string }
 *               trang_thai: { type: string,  enum: [da_thu, chua_thu, da_chi] }
 *     responses:
 *       201:
 *         description: Ghi thành công
 */
router.post('/', (req, res) => {
  const { loai, danh_muc, student_id, teacher_id, class_id, so_tien, ngay, ngay_giao_dich, mo_ta, trang_thai } = req.body;
  if (!loai || !['thu', 'chi'].includes(loai)) return res.status(400).json({ success: false, message: 'loai phai la thu hoac chi' });
  if (!so_tien || so_tien <= 0) return res.status(400).json({ success: false, message: 'So tien phai lon hon 0' });
  const date = ngay || ngay_giao_dich || new Date().toISOString().split('T')[0];
  const thang = date.slice(0, 7);
  try {
    const result = db.prepare(`INSERT INTO finance (loai, danh_muc, student_id, teacher_id, class_id, so_tien, ngay, thang, mo_ta, trang_thai) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(loai, danh_muc || 'hoc_phi', student_id || null, teacher_id || null, class_id || null, so_tien, date, thang, mo_ta || null, trang_thai || (loai === 'thu' ? 'da_thu' : 'da_chi'));
    res.status(201).json({ success: true, data: db.prepare('SELECT * FROM finance WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/finance/bulk-tuition:
 *   post:
 *     summary: Thu học phí hàng loạt cho nhiều học sinh cùng lúc
 *     tags: [Thu chi]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [student_ids, thang]
 *             properties:
 *               student_ids:
 *                 type: array
 *                 items: { type: integer }
 *                 example: [1, 2, 3]
 *               thang:   { type: string, example: '2024-12' }
 *               ghi_chu: { type: string }
 *     responses:
 *       200:
 *         description: Thành công
 */
router.post('/bulk-tuition', (req, res) => {
  const { student_ids, class_id, thang, ghi_chu, so_tien_tung_nguoi } = req.body;
  if (!student_ids?.length || !thang) return res.status(400).json({ success: false, message: 'Thieu student_ids hoac thang' });

  // Per-class: each student pays the fee for a specific class
  if (class_id) {
    const cls = db.prepare('SELECT * FROM class_groups WHERE id = ?').get(class_id);
    if (!cls) return res.status(404).json({ success: false, message: 'Khong tim thay lop' });
    const insert = db.prepare(`INSERT OR IGNORE INTO finance (loai, danh_muc, student_id, class_id, so_tien, ngay, thang, mo_ta, trang_thai) VALUES ('thu', 'hoc_phi', ?, ?, ?, ?, ?, ?, 'da_thu')`);
    const today = new Date().toISOString().split('T')[0];
    try {
      let total = 0;
      db.transaction(() => {
        student_ids.forEach(sid => {
          const so_tien = so_tien_tung_nguoi || cls.hoc_phi_thang || 0;
          if (so_tien > 0) {
            insert.run(sid, class_id, so_tien, today, thang, ghi_chu || `Hoc phi ${cls.ten_lop} thang ${thang}`);
            total += so_tien;
          }
        });
      })();
      res.json({ success: true, message: `Da thu hoc phi ${student_ids.length} hoc sinh lop ${cls.ten_lop}`, data: { tong_thu: total } });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
    return;
  }

  // Fallback: no class_id → sum all classes (legacy behavior)
  const insert = db.prepare(`INSERT INTO finance (loai, danh_muc, student_id, so_tien, ngay, thang, mo_ta, trang_thai) VALUES ('thu', 'hoc_phi', ?, ?, ?, ?, ?, 'da_thu')`);
  try {
    let total = 0;
    db.transaction(() => {
      student_ids.forEach(sid => {
        const fee = db.prepare(`SELECT SUM(cg.hoc_phi_thang) as tong FROM enrollments e JOIN class_groups cg ON cg.id = e.class_id WHERE e.student_id = ? AND e.trang_thai = 'dang_hoc'`).get(sid);
        const so_tien = fee?.tong || 0;
        if (so_tien > 0) { insert.run(sid, so_tien, `${thang}-01`, thang, ghi_chu || `Hoc phi thang ${thang}`); total += so_tien; }
      });
    })();
    res.json({ success: true, message: `Da thu hoc phi ${student_ids.length} hoc sinh`, data: { tong_thu: total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/finance/{id}:
 *   put:
 *     summary: Cập nhật khoản thu chi
 *     tags: [Thu chi]
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
 *               so_tien:    { type: integer }
 *               mo_ta:      { type: string }
 *               trang_thai: { type: string }
 *               ngay:       { type: string }
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM finance WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay ban ghi' });
  const { so_tien, mo_ta, trang_thai, ngay } = req.body;
  try {
    db.prepare(`UPDATE finance SET so_tien=?, mo_ta=?, trang_thai=?, ngay=?, thang=? WHERE id=?`)
      .run(so_tien || existing.so_tien, mo_ta !== undefined ? mo_ta : existing.mo_ta, trang_thai || existing.trang_thai, ngay || existing.ngay, (ngay || existing.ngay).slice(0, 7), id);
    res.json({ success: true, data: db.prepare('SELECT * FROM finance WHERE id = ?').get(id) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/finance/{id}:
 *   delete:
 *     summary: Xoá khoản thu chi
 *     tags: [Thu chi]
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
    const result = db.prepare('DELETE FROM finance WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ success: false, message: 'Khong tim thay ban ghi' });
    res.json({ success: true, message: 'Da xoa' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
