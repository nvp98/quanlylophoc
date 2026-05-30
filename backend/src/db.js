const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'school.db');

let _db = null;
let _inTransaction = false;

function saveDb() {
  if (_inTransaction) return;
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function execSelect(sql, params) {
  const stmt = _db.prepare(sql);
  const rows = [];
  stmt.bind(params);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function execWrite(sql, params) {
  _db.run(sql, params);
  const lastId = _db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  const changes = _db.exec('SELECT changes()')[0].values[0][0];
  saveDb();
  return { lastInsertRowid: lastId, changes };
}

// Wrapper mimics better-sqlite3 API so routes need no changes
const db = {
  prepare(sql) {
    return {
      all(...args)  { return execSelect(sql, args); },
      get(...args)  { return execSelect(sql, args)[0] || null; },
      run(...args)  { return execWrite(sql, args); },
      bind(...args) { return this; }
    };
  },
  exec(sql) {
    _db.exec(sql);
    saveDb();
  },
  pragma(str) {
    _db.run(`PRAGMA ${str}`);
  },
  transaction(fn) {
    return () => {
      _db.run('BEGIN');
      _inTransaction = true;
      try {
        const result = fn();
        _inTransaction = false;
        _db.run('COMMIT');
        saveDb();
        return result;
      } catch (err) {
        _inTransaction = false;
        _db.run('ROLLBACK');
        throw err;
      }
    };
  }
};

function initSchema() {
  _db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      ho_ten          TEXT NOT NULL,
      biet_danh       TEXT,
      hinh_anh        TEXT,
      ngay_sinh       TEXT,
      gioi_tinh       TEXT CHECK(gioi_tinh IN ('nam','nu','khac')),
      dia_chi         TEXT,
      ten_phu_huynh   TEXT,
      sdt_phu_huynh   TEXT,
      ghi_chu         TEXT,
      trang_thai      TEXT NOT NULL DEFAULT 'dang_hoc' CHECK(trang_thai IN ('dang_hoc','nghi_hoc')),
      ngay_nhap_hoc   TEXT NOT NULL DEFAULT (date('now')),
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS teachers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ho_ten      TEXT NOT NULL,
      sdt         TEXT,
      dia_chi     TEXT,
      luong_buoi  INTEGER NOT NULL DEFAULT 0,
      trang_thai  TEXT NOT NULL DEFAULT 'dang_day' CHECK(trang_thai IN ('dang_day','nghi')),
      ghi_chu     TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS class_groups (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      ten_lop         TEXT NOT NULL UNIQUE,
      mo_ta           TEXT,
      hoc_phi_thang   INTEGER NOT NULL DEFAULT 0,
      teacher_id      INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
      lich_hoc        TEXT,
      hoc_ky          TEXT,
      nam_hoc         TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      class_id    INTEGER NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
      ngay_vao    TEXT NOT NULL DEFAULT (date('now')),
      trang_thai  TEXT NOT NULL DEFAULT 'dang_hoc' CHECK(trang_thai IN ('dang_hoc','nghi_hoc')),
      UNIQUE(student_id, class_id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      class_id    INTEGER NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
      teacher_id  INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
      ngay        TEXT NOT NULL DEFAULT (date('now')),
      trang_thai  TEXT NOT NULL DEFAULT 'co_mat' CHECK(trang_thai IN ('co_mat','vang_mat','vang_phep')),
      ghi_chu     TEXT,
      UNIQUE(student_id, class_id, ngay)
    );

    CREATE TABLE IF NOT EXISTS finance (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      loai        TEXT NOT NULL CHECK(loai IN ('thu','chi')),
      danh_muc    TEXT NOT NULL DEFAULT 'hoc_phi',
      student_id  INTEGER REFERENCES students(id) ON DELETE SET NULL,
      teacher_id  INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
      so_tien     INTEGER NOT NULL DEFAULT 0,
      ngay        TEXT NOT NULL DEFAULT (date('now')),
      thang       TEXT NOT NULL DEFAULT (strftime('%Y-%m', 'now')),
      mo_ta       TEXT,
      trang_thai  TEXT NOT NULL DEFAULT 'da_thu' CHECK(trang_thai IN ('da_thu','chua_thu','da_chi')),
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS results (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      class_id    INTEGER NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
      ky          TEXT NOT NULL,
      diem_so     REAL,
      xep_loai    TEXT CHECK(xep_loai IN ('gioi','kha','trung_binh','yeu')),
      nhan_xet    TEXT,
      ngay_nhap   TEXT NOT NULL DEFAULT (date('now')),
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(student_id, class_id, ky)
    );
  `);

  // Migration: add hoc_ky, nam_hoc if not present
  const cgCols = _db.exec("PRAGMA table_info(class_groups)")[0].values.map(r => r[1]);
  if (!cgCols.includes('hoc_ky'))  _db.run('ALTER TABLE class_groups ADD COLUMN hoc_ky TEXT');
  if (!cgCols.includes('nam_hoc')) _db.run('ALTER TABLE class_groups ADD COLUMN nam_hoc TEXT');

  // Migration: add thang_bat_dau, thang_ket_thuc to class_groups
  const cgCols2 = _db.exec("PRAGMA table_info(class_groups)")[0].values.map(r => r[1]);
  if (!cgCols2.includes('thang_bat_dau'))  _db.run('ALTER TABLE class_groups ADD COLUMN thang_bat_dau TEXT');
  if (!cgCols2.includes('thang_ket_thuc')) _db.run('ALTER TABLE class_groups ADD COLUMN thang_ket_thuc TEXT');

  // Migration: add class_id to finance if not present
  const finCols = _db.exec("PRAGMA table_info(finance)")[0].values.map(r => r[1]);
  if (!finCols.includes('class_id')) _db.run('ALTER TABLE finance ADD COLUMN class_id INTEGER REFERENCES class_groups(id) ON DELETE SET NULL');

  const count = _db.exec('SELECT COUNT(*) as c FROM class_groups')[0].values[0][0];
  if (count === 0) {
    _db.exec(`
      INSERT INTO class_groups (ten_lop, mo_ta, hoc_phi_thang) VALUES
        ('Lớp 1', 'Lớp học sinh lớp 1', 300000),
        ('Lớp 2', 'Lớp học sinh lớp 2', 300000),
        ('Lớp 3', 'Lớp học sinh lớp 3', 350000),
        ('Lớp 4', 'Lớp học sinh lớp 4', 350000),
        ('Luyện chữ đẹp', 'Lớp luyện viết chữ đẹp', 200000);
    `);
    console.log('✅ Đã tạo 5 lớp mặc định');
  }

  saveDb();
  console.log('✅ Database đã sẵn sàng');
}

const dbReady = initSqlJs().then(SQL => {
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(buf);
  } else {
    _db = new SQL.Database();
  }
  _db.run('PRAGMA foreign_keys = ON');
  initSchema();
});

module.exports = db;
module.exports.dbReady = dbReady;
