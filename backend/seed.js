/**
 * Seed data – chạy: node seed.js
 * Xóa toàn bộ dữ liệu cũ và tạo dữ liệu mẫu đầy đủ để demo luồng hoạt động.
 */
const db = require('./src/db');
const { dbReady } = db;

dbReady.then(() => {
  console.log('🌱  Bắt đầu tạo dữ liệu mẫu...\n');

  // ── Xóa dữ liệu cũ (theo thứ tự FK) ────────────────────────────────────────
  ['finance', 'results', 'attendance', 'enrollments', 'students', 'class_groups', 'teachers']
    .forEach(t => db.exec(`DELETE FROM ${t}`));
  try { db.exec("DELETE FROM sqlite_sequence"); } catch (_) {}

  const ins = (sql, ...args) => db.prepare(sql).run(...args).lastInsertRowid;

  // ── 1. GIÁO VIÊN ─────────────────────────────────────────────────────────────
  console.log('👨‍🏫  Tạo giáo viên...');
  const gvLan  = ins(`INSERT INTO teachers (ho_ten, sdt, dia_chi, luong_buoi, trang_thai, ghi_chu) VALUES (?,?,?,?,?,?)`,
    'Nguyễn Thị Lan', '0901234567', '12 Nguyễn Huệ, Q.1', 180000, 'dang_day', 'Giáo viên Toán – 10 năm kinh nghiệm');
  const gvMinh = ins(`INSERT INTO teachers (ho_ten, sdt, dia_chi, luong_buoi, trang_thai, ghi_chu) VALUES (?,?,?,?,?,?)`,
    'Trần Văn Minh', '0912345678', '45 Lê Lợi, Q.3', 150000, 'dang_day', 'Giáo viên Ngữ văn');
  const gvHoa  = ins(`INSERT INTO teachers (ho_ten, sdt, dia_chi, luong_buoi, trang_thai, ghi_chu) VALUES (?,?,?,?,?,?)`,
    'Lê Thị Hoa', '0923456789', '78 Hai Bà Trưng, Q.1', 200000, 'dang_day', 'Giáo viên Tiếng Anh – bằng IELTS 8.0');
  const gvBao  = ins(`INSERT INTO teachers (ho_ten, sdt, dia_chi, luong_buoi, trang_thai, ghi_chu) VALUES (?,?,?,?,?,?)`,
    'Phạm Quốc Bảo', '0934567890', '23 Đinh Tiên Hoàng, Q.Bình Thạnh', 160000, 'nghi', 'Nghỉ từ 01/2026');

  // ── 2. LỚP HỌC ───────────────────────────────────────────────────────────────
  console.log('📚  Tạo lớp học...');
  // Đã kết thúc HK1
  const clsT6A = ins(`INSERT INTO class_groups (ten_lop, mo_ta, hoc_phi_thang, teacher_id, lich_hoc, hoc_ky, nam_hoc, thang_bat_dau, thang_ket_thuc) VALUES (?,?,?,?,?,?,?,?,?)`,
    'Toán 6A', 'Lớp Toán dành cho học sinh lớp 6 – nhóm A', 450000, gvLan,
    'Thứ 2, 4, 6 – 17:00-18:30', 'HK1', '2025-2026', '2025-09', '2026-01');

  // Đang dạy HK2
  const clsT7B = ins(`INSERT INTO class_groups (ten_lop, mo_ta, hoc_phi_thang, teacher_id, lich_hoc, hoc_ky, nam_hoc, thang_bat_dau, thang_ket_thuc) VALUES (?,?,?,?,?,?,?,?,?)`,
    'Toán 7B', 'Lớp Toán dành cho học sinh lớp 7 – nhóm B', 500000, gvLan,
    'Thứ 3, 5, 7 – 17:00-18:30', 'HK2', '2025-2026', '2026-02', '2026-06');
  const clsV8  = ins(`INSERT INTO class_groups (ten_lop, mo_ta, hoc_phi_thang, teacher_id, lich_hoc, hoc_ky, nam_hoc, thang_bat_dau, thang_ket_thuc) VALUES (?,?,?,?,?,?,?,?,?)`,
    'Văn 8', 'Lớp Ngữ văn dành cho học sinh lớp 8', 450000, gvMinh,
    'Thứ 2, 4 – 18:00-19:30', 'HK2', '2025-2026', '2026-02', '2026-06');
  const clsA9  = ins(`INSERT INTO class_groups (ten_lop, mo_ta, hoc_phi_thang, teacher_id, lich_hoc, hoc_ky, nam_hoc, thang_bat_dau, thang_ket_thuc) VALUES (?,?,?,?,?,?,?,?,?)`,
    'Anh văn 9', 'Lớp Tiếng Anh lớp 9 – luyện thi vào 10', 650000, gvHoa,
    'Thứ 3, 5 – 18:00-19:30', 'HK2', '2025-2026', '2026-02', '2026-06');

  // Lớp hè mới bắt đầu
  const clsHeT = ins(`INSERT INTO class_groups (ten_lop, mo_ta, hoc_phi_thang, teacher_id, lich_hoc, hoc_ky, nam_hoc, thang_bat_dau, thang_ket_thuc) VALUES (?,?,?,?,?,?,?,?,?)`,
    'Hè Toán 2026', 'Lớp Toán hè – ôn tập kiến thức, thi lên lớp', 400000, gvLan,
    'Thứ 2, 3, 4, 5 – 08:00-10:00', 'Cả năm', '2025-2026', '2026-05', '2026-08');
  const clsHeA = ins(`INSERT INTO class_groups (ten_lop, mo_ta, hoc_phi_thang, teacher_id, lich_hoc, hoc_ky, nam_hoc, thang_bat_dau, thang_ket_thuc) VALUES (?,?,?,?,?,?,?,?,?)`,
    'Hè Anh văn 2026', 'Lớp Tiếng Anh hè – giao tiếp cơ bản', 500000, gvHoa,
    'Thứ 2, 4, 6 – 10:00-12:00', 'Cả năm', '2025-2026', '2026-06', '2026-08');

  // ── 3. HỌC SINH ──────────────────────────────────────────────────────────────
  console.log('🧑‍🎓  Tạo học sinh...');
  const mkS = (ho_ten, biet_danh, ngay_sinh, gioi_tinh, sdt_phu_huynh, ten_phu_huynh, dia_chi) =>
    ins(`INSERT INTO students (ho_ten, biet_danh, ngay_sinh, gioi_tinh, sdt_phu_huynh, ten_phu_huynh, dia_chi, trang_thai, ngay_nhap_hoc) VALUES (?,?,?,?,?,?,?,'dang_hoc','2025-09-05')`,
      ho_ten, biet_danh, ngay_sinh, gioi_tinh, sdt_phu_huynh, ten_phu_huynh, dia_chi);

  const s1  = mkS('Nguyễn Minh Anh', 'Anh Tèo',  '2013-03-15', 'nam', '0901111111', 'Nguyễn Văn An',   'Q.1');
  const s2  = mkS('Trần Bảo Long',   'Long Bé',   '2012-07-22', 'nam', '0901222222', 'Trần Thị Bích',  'Q.3');
  const s3  = mkS('Lê Thị Ngọc',    'Ngọc Nhi',  '2013-01-08', 'nu',  '0901333333', 'Lê Văn Cường',   'Q.Bình Thạnh');
  const s4  = mkS('Phạm Hoàng Nam',  null,        '2012-11-30', 'nam', '0901444444', 'Phạm Thị Dung',  'Q.Gò Vấp');
  const s5  = mkS('Võ Thị Mai',     'Mai Mắn',   '2013-05-12', 'nu',  '0901555555', 'Võ Văn Đức',     'Q.Tân Bình');
  const s6  = mkS('Đặng Quốc Hùng', 'Hùng Cua',  '2012-09-03', 'nam', '0901666666', 'Đặng Thị Emm',   'Q.10');
  const s7  = mkS('Bùi Thanh Hà',   'Hà Nhỏ',    '2013-08-19', 'nu',  '0901777777', 'Bùi Văn Phong',  'Q.11');
  const s8  = mkS('Hoàng Minh Phúc', null,        '2012-04-25', 'nam', '0901888888', 'Hoàng Thị Giang','Q.12');
  const s9  = mkS('Ngô Thị Lan',    'Lan Chi',   '2013-06-14', 'nu',  '0901999999', 'Ngô Văn Hải',    'Q.Phú Nhuận');
  const s10 = mkS('Dương Văn Khánh', null,        '2011-12-05', 'nam', '0902000000', 'Dương Thị Iris', 'Q.Bình Thạnh');
  const s11 = mkS('Phan Thị Thu',   'Thu Bông',  '2011-08-28', 'nu',  '0902111111', 'Phan Văn Kiệt',  'Q.9');
  const s12 = mkS('Lý Minh Đức',    null,        '2013-02-17', 'nam', '0902222222', 'Lý Thị Linh',    'Q.7');

  // ── 4. ENROLL ─────────────────────────────────────────────────────────────────
  console.log('🔗  Ghép học sinh vào lớp...');
  const enroll = (student_id, class_id, ngay_vao = '2026-02-03') =>
    ins(`INSERT INTO enrollments (student_id, class_id, ngay_vao, trang_thai) VALUES (?,?,?,'dang_hoc')`,
      student_id, class_id, ngay_vao);

  // Toán 6A (HK1 đã kết thúc)
  [s1, s3, s4, s7].forEach(id => enroll(id, clsT6A, '2025-09-05'));

  // Toán 7B (HK2 đang dạy)
  [s1, s2, s3, s4, s5, s6, s7, s8].forEach(id => enroll(id, clsT7B));

  // Văn 8 (HK2)
  [s2, s5, s9, s10].forEach(id => enroll(id, clsV8));

  // Anh văn 9 (HK2)
  [s1, s6, s8, s9, s10, s11].forEach(id => enroll(id, clsA9));

  // Hè Toán 2026 (mới bắt đầu)
  [s3, s4, s7, s9, s12].forEach(id => enroll(id, clsHeT, '2026-05-05'));

  // Hè Anh văn 2026 (sắp khai giảng)
  [s1, s6, s11].forEach(id => enroll(id, clsHeA, '2026-06-02'));

  // ── 5. ĐIỂM DANH ─────────────────────────────────────────────────────────────
  console.log('📋  Tạo dữ liệu điểm danh...');
  // Toán 7B – các buổi tháng 4 và 5/2026
  const att = (student_id, class_id, ngay, trang_thai) =>
    ins(`INSERT INTO attendance (student_id, class_id, teacher_id, ngay, trang_thai) VALUES (?,?,?,?,?)`,
      student_id, clsT7B, gvLan, ngay, trang_thai);

  // Tháng 4/2026: 4 buổi
  const buoiT4 = ['2026-04-07','2026-04-10','2026-04-14','2026-04-17'];
  const attDataT4 = {
    // [student_id]: [co_mat, co_mat, vang_phep, co_mat, ...]
    [s1]: ['co_mat','co_mat','co_mat','co_mat'],
    [s2]: ['co_mat','vang_phep','co_mat','co_mat'],
    [s3]: ['co_mat','co_mat','co_mat','vang_mat'],
    [s4]: ['vang_phep','co_mat','co_mat','co_mat'],
    [s5]: ['co_mat','co_mat','vang_mat','co_mat'],
    [s6]: ['co_mat','co_mat','co_mat','co_mat'],
    [s7]: ['vang_mat','vang_mat','co_mat','co_mat'],
    [s8]: ['co_mat','co_mat','co_mat','vang_phep'],
  };
  buoiT4.forEach((ngay, i) => {
    Object.entries(attDataT4).forEach(([sid, arr]) => att(Number(sid), clsT7B, ngay, arr[i]));
  });

  // Tháng 5/2026: 3 buổi đã qua
  const buoiT5 = ['2026-05-05','2026-05-08','2026-05-12'];
  const attDataT5 = {
    [s1]: ['co_mat','co_mat','co_mat'],
    [s2]: ['co_mat','co_mat','vang_phep'],
    [s3]: ['co_mat','vang_mat','co_mat'],
    [s4]: ['co_mat','co_mat','co_mat'],
    [s5]: ['vang_phep','co_mat','co_mat'],
    [s6]: ['co_mat','co_mat','co_mat'],
    [s7]: ['co_mat','co_mat','vang_mat'],
    [s8]: ['co_mat','co_mat','co_mat'],
  };
  buoiT5.forEach((ngay, i) => {
    Object.entries(attDataT5).forEach(([sid, arr]) => att(Number(sid), clsT7B, ngay, arr[i]));
  });

  // Anh văn 9 – tháng 4/2026
  const buoiA9 = ['2026-04-08','2026-04-10','2026-04-15','2026-04-17','2026-04-22','2026-04-24'];
  const attStudentsA9 = [s1, s6, s8, s9, s10, s11];
  const attA9 = [
    ['co_mat','co_mat','co_mat','co_mat','co_mat','co_mat'],  // s1
    ['co_mat','vang_phep','co_mat','co_mat','co_mat','co_mat'], // s6
    ['co_mat','co_mat','vang_mat','co_mat','co_mat','co_mat'], // s8
    ['co_mat','co_mat','co_mat','co_mat','vang_phep','co_mat'], // s9
    ['co_mat','co_mat','co_mat','co_mat','co_mat','vang_mat'], // s10
    ['vang_phep','co_mat','co_mat','co_mat','co_mat','co_mat'], // s11
  ];
  buoiA9.forEach((ngay, i) => {
    attStudentsA9.forEach((sid, j) => {
      ins(`INSERT INTO attendance (student_id, class_id, teacher_id, ngay, trang_thai) VALUES (?,?,?,?,?)`,
        sid, clsA9, gvHoa, ngay, attA9[j][i]);
    });
  });

  // ── 6. KẾT QUẢ HỌC TẬP ──────────────────────────────────────────────────────
  console.log('📊  Tạo kết quả học tập...');
  const result = (student_id, class_id, ky, diem_so, nhan_xet) => {
    const xep_loai = diem_so >= 8.5 ? 'gioi' : diem_so >= 7.0 ? 'kha' : diem_so >= 5.0 ? 'trung_binh' : 'yeu';
    ins(`INSERT INTO results (student_id, class_id, ky, diem_so, xep_loai, nhan_xet, ngay_nhap) VALUES (?,?,?,?,?,?,'2026-01-20')`,
      student_id, class_id, ky, diem_so, xep_loai, nhan_xet);
  };

  // Toán 6A – HK1 2025-2026 (đã có kết quả)
  result(s1, clsT6A, 'HK1 2025-2026', 9.0,  'Học sinh xuất sắc, nắm vững kiến thức, luôn hoàn thành bài tập đúng hạn');
  result(s3, clsT6A, 'HK1 2025-2026', 7.5,  'Học sinh khá, cần cải thiện tốc độ tính toán');
  result(s4, clsT6A, 'HK1 2025-2026', 5.5,  'Cần chú ý hơn trong các bài toán đại số');
  result(s7, clsT6A, 'HK1 2025-2026', 8.5,  'Học sinh giỏi, sáng tạo trong cách giải bài');

  // Toán 7B – HK2 (giữa kỳ)
  result(s1, clsT7B, 'Giữa HK2 2025-2026', 8.8, 'Tiến bộ rõ rệt, nổi bật trong nhóm');
  result(s2, clsT7B, 'Giữa HK2 2025-2026', 7.0, 'Ổn định, cần chú ý phần hình học');
  result(s3, clsT7B, 'Giữa HK2 2025-2026', 6.5, 'Tiến bộ tốt so với HK1');
  result(s4, clsT7B, 'Giữa HK2 2025-2026', 4.5, 'Cần nỗ lực hơn, hay vắng mặt');
  result(s5, clsT7B, 'Giữa HK2 2025-2026', 7.8, 'Học sinh nghiêm túc');
  result(s6, clsT7B, 'Giữa HK2 2025-2026', 9.2, 'Xuất sắc nhất lớp');
  result(s7, clsT7B, 'Giữa HK2 2025-2026', 6.0, 'Hay vắng học ảnh hưởng kết quả');
  result(s8, clsT7B, 'Giữa HK2 2025-2026', 8.0, 'Học sinh khá giỏi');

  // Anh văn 9 – giữa HK2
  result(s1,  clsA9, 'Giữa HK2 2025-2026', 8.5, 'Phát âm tốt, nghe hiểu xuất sắc');
  result(s6,  clsA9, 'Giữa HK2 2025-2026', 7.5, 'Viết tốt nhưng cần luyện speaking');
  result(s8,  clsA9, 'Giữa HK2 2025-2026', 9.0, 'Native-like pronunciation');
  result(s9,  clsA9, 'Giữa HK2 2025-2026', 6.8, 'Ngữ pháp ổn nhưng từ vựng còn ít');
  result(s10, clsA9, 'Giữa HK2 2025-2026', 5.5, 'Cần luyện thêm nghe và đọc');
  result(s11, clsA9, 'Giữa HK2 2025-2026', 8.2, 'Rất chăm chỉ, làm bài đầy đủ');

  // ── 7. TÀI CHÍNH ─────────────────────────────────────────────────────────────
  console.log('💰  Tạo dữ liệu tài chính...');
  const fee = (student_id, class_id, thang, so_tien, mo_ta, ngay) =>
    ins(`INSERT INTO finance (loai, danh_muc, student_id, class_id, so_tien, ngay, thang, mo_ta, trang_thai) VALUES ('thu','hoc_phi',?,?,?,?,?,?,'da_thu')`,
      student_id, class_id, so_tien, ngay || `${thang}-05`, thang, mo_ta);

  const chi = (mo_ta, danh_muc, so_tien, thang, teacher_id = null) =>
    ins(`INSERT INTO finance (loai, danh_muc, teacher_id, so_tien, ngay, thang, mo_ta, trang_thai) VALUES ('chi',?,?,?,?,?,?,'da_chi')`,
      danh_muc, teacher_id, so_tien, `${thang}-28`, thang, mo_ta);

  // === THÁNG 02/2026 – đầu HK2, thu đủ ===
  [s1,s2,s3,s4,s5,s6,s7,s8].forEach(id => fee(id, clsT7B, '2026-02', 500000, 'Học phí Toán 7B tháng 2', '2026-02-06'));
  [s2,s5,s9,s10].forEach(id =>         fee(id, clsV8,  '2026-02', 450000, 'Học phí Văn 8 tháng 2',   '2026-02-06'));
  [s1,s6,s8,s9,s10,s11].forEach(id =>  fee(id, clsA9,  '2026-02', 650000, 'Học phí Anh văn 9 tháng 2','2026-02-07'));

  // Lương tháng 2
  chi('Lương cô Lan tháng 2/2026',   'luong_gv', 8*150000*3, '2026-02', gvLan);   // 8 hs × 3 buổi/tuần × 4 tuần giả lập = 12 buổi → 150k
  chi('Lương thầy Minh tháng 2/2026','luong_gv', 4*150000*2, '2026-02', gvMinh);
  chi('Lương cô Hoa tháng 2/2026',   'luong_gv', 6*200000*2, '2026-02', gvHoa);
  chi('Mua bảng trắng + bút',        'van_phong', 350000,    '2026-02');

  // === THÁNG 03/2026 ===
  [s1,s2,s3,s4,s5,s6,s7,s8].forEach(id => fee(id, clsT7B, '2026-03', 500000, 'Học phí Toán 7B tháng 3', '2026-03-04'));
  [s2,s5,s9,s10].forEach(id =>         fee(id, clsV8,  '2026-03', 450000, 'Học phí Văn 8 tháng 3',   '2026-03-05'));
  [s1,s6,s8,s9,s10,s11].forEach(id =>  fee(id, clsA9,  '2026-03', 650000, 'Học phí Anh văn 9 tháng 3','2026-03-05'));

  chi('Lương cô Lan tháng 3/2026',   'luong_gv', 1800000, '2026-03', gvLan);
  chi('Lương thầy Minh tháng 3/2026','luong_gv', 1200000, '2026-03', gvMinh);
  chi('Lương cô Hoa tháng 3/2026',   'luong_gv', 2400000, '2026-03', gvHoa);
  chi('In đề thi giữa kỳ',           'van_phong', 180000,  '2026-03');

  // === THÁNG 04/2026 ===
  [s1,s2,s3,s4,s5,s6,s7,s8].forEach(id => fee(id, clsT7B, '2026-04', 500000, 'Học phí Toán 7B tháng 4', '2026-04-03'));
  [s2,s5,s9,s10].forEach(id =>         fee(id, clsV8,  '2026-04', 450000, 'Học phí Văn 8 tháng 4',   '2026-04-04'));
  [s1,s6,s8,s9,s10,s11].forEach(id =>  fee(id, clsA9,  '2026-04', 650000, 'Học phí Anh văn 9 tháng 4','2026-04-04'));

  chi('Lương cô Lan tháng 4/2026',   'luong_gv', 1800000, '2026-04', gvLan);
  chi('Lương thầy Minh tháng 4/2026','luong_gv', 1200000, '2026-04', gvMinh);
  chi('Lương cô Hoa tháng 4/2026',   'luong_gv', 2400000, '2026-04', gvHoa);
  chi('Mua sách tham khảo cho lớp',  'van_phong', 520000,  '2026-04');
  chi('Sửa máy lạnh phòng học',      'khac',      1200000, '2026-04');

  // === THÁNG 05/2026 – THÁNG HIỆN TẠI (có người chưa đóng) ===
  // Toán 7B: s1, s2, s3, s4, s8 đã đóng → s5, s6, s7 CHƯA đóng
  [s1,s2,s3,s4,s8].forEach(id => fee(id, clsT7B, '2026-05', 500000, 'Học phí Toán 7B tháng 5', '2026-05-02'));

  // Văn 8: s2, s9 đã đóng → s5, s10 CHƯA đóng
  [s2, s9].forEach(id => fee(id, clsV8, '2026-05', 450000, 'Học phí Văn 8 tháng 5', '2026-05-03'));

  // Anh văn 9: TẤT CẢ đã đóng ✅
  [s1,s6,s8,s9,s10,s11].forEach(id => fee(id, clsA9, '2026-05', 650000, 'Học phí Anh văn 9 tháng 5', '2026-05-01'));

  // Hè Toán: s3 đã đóng → s4, s7, s9, s12 CHƯA đóng
  fee(s3, clsHeT, '2026-05', 400000, 'Học phí Hè Toán tháng 5', '2026-05-06');

  // Chi tháng 5 (lương)
  chi('Lương cô Lan tháng 5/2026',   'luong_gv', 1800000, '2026-05', gvLan);
  chi('Lương thầy Minh tháng 5/2026','luong_gv', 1200000, '2026-05', gvMinh);
  chi('Lương cô Hoa tháng 5/2026',   'luong_gv', 2400000, '2026-05', gvHoa);
  chi('Mua vở, bút cho lớp hè',      'van_phong', 280000,  '2026-05');
  chi('In tài liệu lớp hè',          'van_phong', 150000,  '2026-05');

  // ── Xong ─────────────────────────────────────────────────────────────────────
  console.log('\n✅  Tạo dữ liệu mẫu hoàn tất!\n');
  console.log('📌  Tóm tắt:');
  console.log('   👨‍🏫  4 giáo viên (3 đang dạy, 1 đã nghỉ)');
  console.log('   📚  6 lớp học:');
  console.log('       • Toán 6A      – HK1 2025-2026 (đã kết thúc, tháng 9/25→1/26)');
  console.log('       • Toán 7B      – HK2 2025-2026 (đang dạy, tháng 2→6/2026)');
  console.log('       • Văn 8        – HK2 2025-2026 (đang dạy, tháng 2→6/2026)');
  console.log('       • Anh văn 9    – HK2 2025-2026 (đang dạy, tháng 2→6/2026)');
  console.log('       • Hè Toán 2026 – Cả năm (mới khai giảng, tháng 5→8/2026)');
  console.log('       • Hè Anh văn   – Cả năm (sắp khai giảng, tháng 6→8/2026)');
  console.log('   🧑‍🎓  12 học sinh đang học');
  console.log('   📋  Điểm danh: Toán 7B (4 buổi tháng 4, 3 buổi tháng 5), Anh văn 9 (6 buổi tháng 4)');
  console.log('   📊  Kết quả: Toán 6A HK1 (4 hs), Toán 7B & Anh văn 9 giữa HK2 (8+6 hs)');
  console.log('   💰  Tài chính tháng 5/2026:');
  console.log('       • Toán 7B   – 5/8 đã đóng, 3 chưa (Võ Thị Mai, Đặng Quốc Hùng, Bùi Thanh Hà)');
  console.log('       • Văn 8     – 2/4 đã đóng, 2 chưa (Võ Thị Mai, Dương Văn Khánh)');
  console.log('       • Anh văn 9 – 6/6 đã đóng ✅');
  console.log('       • Hè Toán   – 1/5 đã đóng, 4 chưa (Phạm Hoàng Nam, Bùi Thanh Hà, Ngô Thị Lan, Lý Minh Đức)');
  console.log('\n🚀  Khởi động lại backend để áp dụng!');

}).catch(err => {
  console.error('❌  Lỗi:', err.message);
  process.exit(1);
});
