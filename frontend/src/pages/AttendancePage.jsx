import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Layout } from '../components/Layout'
import {
  ClipboardCheck, Loader2, Save, Printer,
  ChevronLeft, ChevronRight, ChevronDown, AlertCircle,
  CheckCircle, XCircle, Clock, Users, Zap, GraduationCap,
} from 'lucide-react'
import { format, getDaysInMonth, getDay } from 'date-fns'
import toast from 'react-hot-toast'
import classService from '../services/classService'
import attendanceService from '../services/attendanceService'
import teacherService from '../services/teacherService'

// ── Constants ────────────────────────────────────────────────────────────────
const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const CYCLE = [null, 'co_mat', 'vang_phep', 'vang_mat']

const CELL = {
  null:       { bg: 'bg-gray-50 hover:bg-gray-100 border-gray-200',      text: 'text-gray-300',   sym: '·' },
  co_mat:     { bg: 'bg-green-100 hover:bg-green-200 border-green-300',  text: 'text-green-700',  sym: '✓' },
  vang_phep:  { bg: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300', text: 'text-yellow-700', sym: 'P' },
  vang_mat:   { bg: 'bg-red-100 hover:bg-red-200 border-red-300',        text: 'text-red-600',    sym: '✕' },
}

// ── Print helpers ─────────────────────────────────────────────────────────────
function generatePrintHTML({ cls, students, localData, month, daysInMonth, blank }) {
  const [y, m] = month.split('-')
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const padDate = d => `${month}-${String(d).padStart(2, '0')}`
  const dow = ['CN','T2','T3','T4','T5','T6','T7']

  const statusSym = { co_mat: '✓', vang_phep: 'P', vang_mat: '✗', null: '' }

  const tds = days.map(d => {
    const date = padDate(d)
    const dow_idx = new Date(date).getDay()
    const isWeekend = dow_idx === 0 || dow_idx === 6
    const bg = isWeekend ? '#f5f5f5' : '#fff'
    return `<th style="width:18px;text-align:center;font-size:7pt;background:${bg};padding:2px 1px;border:1px solid #ccc">
      <div style="font-weight:700">${d}</div>
      <div style="font-weight:400;color:#888;font-size:6pt">${dow[dow_idx]}</div>
    </th>`
  }).join('')

  const summaryHdr = `
    <th style="width:22px;text-align:center;font-size:7pt;border:1px solid #ccc;background:#e8f5e9">CM</th>
    <th style="width:22px;text-align:center;font-size:7pt;border:1px solid #ccc;background:#fff9c4">VP</th>
    <th style="width:22px;text-align:center;font-size:7pt;border:1px solid #ccc;background:#ffebee">VM</th>
  `

  const rows = students.map((s, idx) => {
    const sData = localData[s.id] || {}
    let cm = 0, vp = 0, vm = 0

    const cells = days.map(d => {
      const date = padDate(d)
      const status = blank ? null : (sData[date] || null)
      if (status === 'co_mat')    cm++
      if (status === 'vang_phep') vp++
      if (status === 'vang_mat')  vm++

      const dow_idx = new Date(date).getDay()
      const isWeekend = dow_idx === 0 || dow_idx === 6
      const bgCell = isWeekend ? '#f5f5f5' : '#fff'

      let sym = '', color = '#000'
      if (!blank && status) {
        sym = statusSym[status] || ''
        if (status === 'co_mat')    color = '#2e7d32'
        if (status === 'vang_phep') color = '#f57f17'
        if (status === 'vang_mat')  color = '#c62828'
      }

      return `<td style="border:1px solid #ccc;text-align:center;font-size:8pt;font-weight:700;color:${color};background:${bgCell};padding:1px">${sym}</td>`
    }).join('')

    const rowBg = idx % 2 === 0 ? '#fff' : '#fafafa'
    const summaryTds = blank
      ? `<td style="border:1px solid #ccc"></td><td style="border:1px solid #ccc"></td><td style="border:1px solid #ccc"></td>`
      : `<td style="border:1px solid #ccc;text-align:center;font-size:8pt;color:#2e7d32;font-weight:700">${cm||''}</td>
         <td style="border:1px solid #ccc;text-align:center;font-size:8pt;color:#f57f17;font-weight:700">${vp||''}</td>
         <td style="border:1px solid #ccc;text-align:center;font-size:8pt;color:#c62828;font-weight:700">${vm||''}</td>`

    return `<tr style="background:${rowBg}">
      <td style="border:1px solid #ccc;text-align:center;font-size:8pt;padding:2px 4px">${idx + 1}</td>
      <td style="border:1px solid #ccc;font-size:8pt;padding:2px 6px;white-space:nowrap">${s.ho_ten}${s.biet_danh ? ` (${s.biet_danh})` : ''}</td>
      ${cells}
      ${summaryTds}
    </tr>`
  }).join('')

  const legend = blank ? '' : `
    <div style="margin-top:6px;font-size:7pt;color:#555">
      <b>Chú thích:</b>
      ✓ = Có mặt &nbsp;|&nbsp; P = Vắng có phép &nbsp;|&nbsp; ✗ = Vắng không phép
    </div>`

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>Điểm danh ${cls?.ten_lop || ''} tháng ${m}/${y}</title>
<style>
  @page { size: A4 landscape; margin: 8mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Arial', sans-serif; font-size: 9pt; margin: 0; color: #000; }
  table { border-collapse: collapse; width: 100%; }
  h2 { text-align: center; margin: 0 0 2px; font-size: 12pt; text-transform: uppercase; }
  .sub { text-align: center; font-size: 8pt; color: #444; margin-bottom: 8px; }
  .sig { display: flex; justify-content: flex-end; margin-top: 20px; gap: 60px; font-size: 8pt; }
  @media screen { body { padding: 20px; } }
</style>
</head>
<body>
<h2>BẢNG ĐIỂM DANH${blank ? ' (TRẮNG)' : ''}</h2>
<div class="sub">
  Lớp: <b>${cls?.ten_lop || '—'}</b> &nbsp;|&nbsp;
  Giáo viên: <b>${cls?.ten_giao_vien || '—'}</b> &nbsp;|&nbsp;
  Tháng: <b>${m}/${y}</b> &nbsp;|&nbsp;
  Sĩ số: <b>${students.length}</b>
</div>
<table>
  <thead>
    <tr>
      <th style="width:28px;border:1px solid #ccc;font-size:7pt;padding:2px">STT</th>
      <th style="width:130px;border:1px solid #ccc;font-size:7pt;padding:2px 6px;text-align:left">Họ và tên</th>
      ${tds}
      ${summaryHdr}
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
${legend}
<div class="sig">
  <div style="text-align:center">
    <div>Ngày &nbsp;&nbsp;&nbsp; tháng &nbsp;&nbsp;&nbsp; năm ${y}</div>
    <div style="margin-top:50px;font-weight:700">Giáo viên</div>
  </div>
  
</div>
<script>window.onload=()=>{ window.print(); }<\/script>
</body>
</html>`
}

function handlePrint(args) {
  const w = window.open('', '_blank', 'width=1200,height=900')
  w.document.write(generatePrintHTML(args))
  w.document.close()
}

// ── Attendance Matrix ─────────────────────────────────────────────────────────
function AttendanceMatrix({ cls, students, localData, serverData, month, daysInMonth, pendingKeys, teachers, teacherByDay, onCellClick, onSetTeacher, onSave, saving }) {
  const tableRef = useRef(null)

  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth])
  const padDate = d => `${month}-${String(d).padStart(2, '0')}`

  // Summary per student
  const summary = useMemo(() => {
    const res = {}
    students.forEach(s => {
      let cm = 0, vp = 0, vm = 0
      days.forEach(d => {
        const v = localData[s.id]?.[padDate(d)]
        if (v === 'co_mat')    cm++
        if (v === 'vang_phep') vp++
        if (v === 'vang_mat')  vm++
      })
      res[s.id] = { cm, vp, vm }
    })
    return res
  }, [localData, students, days, month])

  const changeCount = pendingKeys.size

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-wrap gap-2">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-700 font-semibold">{cls?.ten_lop}</span>
          {cls?.ten_giao_vien && <span className="text-gray-400">· {cls.ten_giao_vien}</span>}
          <span className="text-gray-400">· {students.length} học sinh</span>
          {changeCount > 0 && (
            <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
              {changeCount} thay đổi chưa lưu
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handlePrint({ cls, students, localData, month, daysInMonth, blank: true })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
          >
            <Printer size={13} /> In bảng trắng
          </button>
          <button
            onClick={() => handlePrint({ cls, students, localData, month, daysInMonth, blank: false })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-indigo-200 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
          >
            <Printer size={13} /> In bảng điểm danh
          </button>
          {changeCount > 0 && (
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Lưu thay đổi
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-2 bg-gray-50 border-b border-gray-100 text-xs flex-wrap">
        {Object.entries({ co_mat: 'Có mặt ✓', vang_phep: 'Vắng phép P', vang_mat: 'Vắng mặt ✕' }).map(([k, v]) => (
          <span key={k} className={`px-2 py-0.5 rounded font-medium ${CELL[k].bg.split(' ')[0]} ${CELL[k].text}`}>{v}</span>
        ))}
        <span className={`px-2 py-0.5 rounded font-medium ${CELL.null.bg.split(' ')[0]} ${CELL.null.text}`}>· Chưa ghi</span>
        <span className="text-gray-400 ml-2">Nhấn ô để thay đổi trạng thái</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto" ref={tableRef}>
        <table className="text-xs border-collapse" style={{ minWidth: 'max-content' }}>
          <thead>
            {/* Day numbers */}
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-10 bg-gray-50 border border-gray-200 px-2 py-1 text-center text-gray-500 font-semibold" style={{ minWidth: 32 }}>#</th>
              <th className="sticky left-8 z-10 bg-gray-50 border border-gray-200 px-3 py-1 text-left text-gray-600 font-semibold whitespace-nowrap" style={{ minWidth: 160, left: 32 }}>
                Họ và tên
              </th>
              {days.map(d => {
                const dow_idx = getDay(new Date(`${month}-${String(d).padStart(2, '0')}`))
                const isWeekend = dow_idx === 0 || dow_idx === 6
                return (
                  <th key={d}
                    className={`border border-gray-200 text-center font-semibold ${isWeekend ? 'bg-gray-100 text-gray-400' : 'text-gray-600'}`}
                    style={{ width: 28, minWidth: 28 }}
                  >
                    <div>{d}</div>
                    <div className="text-gray-400 font-normal" style={{ fontSize: 9 }}>{DOW[dow_idx]}</div>
                  </th>
                )
              })}
              <th className="border border-green-200 bg-green-50 text-center text-green-700 font-semibold px-1" style={{ minWidth: 30 }}>CM</th>
              <th className="border border-yellow-200 bg-yellow-50 text-center text-yellow-700 font-semibold px-1" style={{ minWidth: 30 }}>VP</th>
              <th className="border border-red-200 bg-red-50 text-center text-red-600 font-semibold px-1" style={{ minWidth: 30 }}>VM</th>
            </tr>
            {/* Dòng giáo viên dạy */}
            <tr className="bg-indigo-50/60">
              <th className="sticky left-0 z-10 bg-indigo-50 border border-indigo-100 text-center py-1" style={{ minWidth: 32 }}>
                <GraduationCap size={11} className="text-indigo-400 mx-auto" />
              </th>
              <th className="sticky z-10 bg-indigo-50 border border-indigo-100 px-3 py-1 text-left text-indigo-600 font-semibold whitespace-nowrap text-xs" style={{ minWidth: 160, left: 32 }}>
                Giáo viên dạy
              </th>
              {days.map(d => {
                const date = padDate(d)
                const tInfo = teacherByDay?.[date]
                const hasStudents = students.some(s => localData[s.id]?.[date])
                return (
                  <th key={d} className="border border-indigo-100 bg-indigo-50/40 p-0 font-normal" style={{ width: 28, minWidth: 28 }}>
                    <select
                      value={tInfo?.teacher_id || ''}
                      onChange={e => onSetTeacher?.(date, e.target.value || null)}
                      disabled={!hasStudents}
                      title={tInfo?.ho_ten || (hasStudents ? 'Chọn giáo viên' : '')}
                      className={`w-full h-7 text-center font-bold bg-transparent border-0 outline-none
                        ${hasStudents ? 'cursor-pointer text-indigo-700' : 'cursor-default opacity-20'}`}
                      style={{ fontSize: 9, padding: 0 }}
                    >
                      <option value="">–</option>
                      {(teachers || []).map(t => (
                        <option key={t.id} value={t.id}>{t.ho_ten.split(' ').pop()}</option>
                      ))}
                    </select>
                  </th>
                )
              })}
              <th colSpan={3} className="border border-indigo-100 bg-indigo-50/40" />
            </tr>
          </thead>
          <tbody>
            {students.map((s, idx) => {
              const sData = localData[s.id] || {}
              const { cm, vp, vm } = summary[s.id] || { cm: 0, vp: 0, vm: 0 }
              return (
                <tr key={s.id} className={idx % 2 === 1 ? 'bg-gray-50/60' : ''}>
                  <td className="sticky left-0 z-10 bg-inherit border border-gray-200 text-center text-gray-400 py-0.5" style={{ minWidth: 32 }}>
                    {idx + 1}
                  </td>
                  <td className="sticky z-10 bg-inherit border border-gray-200 px-3 py-0.5 whitespace-nowrap font-medium text-gray-800" style={{ minWidth: 160, left: 32 }}>
                    {s.ho_ten}
                    {s.biet_danh && <span className="text-gray-400 font-normal ml-1">({s.biet_danh})</span>}
                  </td>
                  {days.map(d => {
                    const date = padDate(d)
                    const status = sData[date] || null
                    const c = CELL[status]
                    const isPending = pendingKeys.has(`${s.id}-${date}`)
                    return (
                      <td key={d}
                        onClick={() => onCellClick(s.id, date, status)}
                        className={`border cursor-pointer text-center font-bold select-none transition-colors ${c.bg} ${c.text} ${isPending ? 'ring-1 ring-inset ring-orange-400' : ''}`}
                        style={{ width: 28, minWidth: 28, height: 28 }}
                        title={date}
                      >
                        {c.sym}
                      </td>
                    )
                  })}
                  <td className="border border-green-200 bg-green-50 text-center font-bold text-green-700">{cm || ''}</td>
                  <td className="border border-yellow-200 bg-yellow-50 text-center font-bold text-yellow-700">{vp || ''}</td>
                  <td className="border border-red-200 bg-red-50 text-center font-bold text-red-600">{vm || ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Teacher By Day Table ──────────────────────────────────────────────────────
function TeacherByDayTable({ teachers, teacherByDay, onSetTeacher, month, daysInMonth, localData, students }) {
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth])
  const padDate = d => `${month}-${String(d).padStart(2, '0')}`

  // Ngày nào có ít nhất 1 học sinh được điểm danh
  const activeDays = useMemo(() => {
    const s = new Set()
    days.forEach(d => {
      const date = padDate(d)
      if (students.some(st => localData[st.id]?.[date])) s.add(d)
    })
    return s
  }, [days, students, localData, month])

  // Tổng buổi đã gán GV
  const assignedCount = days.filter(d => teacherByDay[padDate(d)]?.teacher_id).length
  const totalActive   = activeDays.size

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-indigo-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-indigo-50 border-b border-indigo-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <GraduationCap size={14} className="text-indigo-600" />
          <span className="text-xs font-semibold text-indigo-800">Điểm danh giáo viên</span>
          <span className="text-xs text-indigo-400">— ai dạy buổi nào</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {totalActive > 0 && (
            <span className={`px-2 py-0.5 rounded-full font-medium ${
              assignedCount === totalActive
                ? 'bg-green-100 text-green-700'
                : 'bg-orange-100 text-orange-700'
            }`}>
              {assignedCount}/{totalActive} buổi đã gán GV
            </span>
          )}
          <span className="text-indigo-300">Chỉ buổi có điểm danh học sinh mới chọn được</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse" style={{ minWidth: 'max-content' }}>
          <thead>
            <tr className="bg-indigo-50/50">
              <th className="sticky left-0 z-10 bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-left text-indigo-600 font-semibold whitespace-nowrap" style={{ minWidth: 160 }}>
                Ngày trong tháng
              </th>
              {days.map(d => {
                const dow_idx = getDay(new Date(`${month}-${String(d).padStart(2, '0')}`))
                const isWe  = dow_idx === 0 || dow_idx === 6
                const isAct = activeDays.has(d)
                return (
                  <th key={d}
                    className={`border border-indigo-100 text-center font-semibold
                      ${isWe ? 'bg-gray-100 text-gray-300' : isAct ? 'bg-white text-gray-600' : 'bg-white text-gray-200'}`}
                    style={{ width: 36, minWidth: 36 }}
                  >
                    <div>{d}</div>
                    <div className="font-normal" style={{ fontSize: 9 }}>{DOW[dow_idx]}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="sticky left-0 z-10 bg-white border border-indigo-100 px-3 py-1 whitespace-nowrap">
                <span className="flex items-center gap-1.5 text-indigo-600 font-semibold">
                  <GraduationCap size={12} /> Giáo viên
                </span>
              </td>
              {days.map(d => {
                const date   = padDate(d)
                const isAct  = activeDays.has(d)
                const tInfo  = teacherByDay[date]
                const dow_idx = getDay(new Date(date))
                const isWe   = dow_idx === 0 || dow_idx === 6

                if (!isAct) return (
                  <td key={d}
                    className={`border border-indigo-50 text-center ${isWe ? 'bg-gray-50' : 'bg-white'}`}
                    style={{ width: 36, minWidth: 36, height: 36 }}>
                    <span className="text-gray-200">·</span>
                  </td>
                )

                return (
                  <td key={d}
                    className={`border p-0 ${tInfo?.teacher_id ? 'border-indigo-300 bg-indigo-50' : 'border-orange-200 bg-orange-50'}`}
                    style={{ width: 36, minWidth: 36, height: 36 }}>
                    <select
                      value={tInfo?.teacher_id || ''}
                      onChange={e => onSetTeacher(date, e.target.value || null)}
                      title={tInfo?.ho_ten || 'Chưa chọn giáo viên'}
                      className={`w-full h-full text-center font-bold bg-transparent border-0 outline-none cursor-pointer
                        ${tInfo?.teacher_id ? 'text-indigo-700' : 'text-orange-500'}`}
                      style={{ fontSize: 9, padding: 0 }}
                    >
                      <option value="">–</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.ho_ten.split(' ').pop()}
                        </option>
                      ))}
                    </select>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Teacher Matrix ────────────────────────────────────────────────────────────
function abbr(tenLop) {
  // Toán 7B → T7B, Anh văn 9 → AV9, Hè Toán → HT
  return tenLop
    .replace(/[aáàảãạăắằẳẵặâấầẩẫậ]/gi, 'a')
    .replace(/[eéèẻẽẹêếềểễệ]/gi, 'e')
    .replace(/[iíìỉĩị]/gi, 'i')
    .replace(/[oóòỏõọôốồổỗộơớờởỡợ]/gi, 'o')
    .replace(/[uúùủũụưứừửữự]/gi, 'u')
    .replace(/[yýỳỷỹỵ]/gi, 'y')
    .replace(/đ/gi, 'd')
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase())
    .join('')
}

function generateTeacherPrintHTML({ teachers, data, month, daysInMonth }) {
  const [y, m] = month.split('-')
  const dow = ['CN','T2','T3','T4','T5','T6','T7']
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const padDate = d => `${month}-${String(d).padStart(2, '0')}`

  const tds = days.map(d => {
    const dow_idx = new Date(padDate(d)).getDay()
    const isWe = dow_idx === 0 || dow_idx === 6
    return `<th style="width:22px;text-align:center;font-size:7pt;background:${isWe ? '#f5f5f5' : '#fff'};padding:2px 1px;border:1px solid #ccc">
      <div style="font-weight:700">${d}</div>
      <div style="color:#999;font-size:6pt;font-weight:400">${dow[dow_idx]}</div>
    </th>`
  }).join('')

  const rows = teachers.map((t, idx) => {
    const tData = data[t.id] || {}
    let total = 0  // đếm ngày dạy (nhiều lớp cùng ngày = 1 ngày)
    const cells = days.map(d => {
      const date = padDate(d)
      const sessions = tData[date] || []
      const dow_idx = new Date(date).getDay()
      const isWe = dow_idx === 0 || dow_idx === 6
      if (sessions.length > 0) total += 1  // +1 ngày, không cộng số lớp
      const text = sessions.map(s => abbr(s.ten_lop)).join(',')
      const color = sessions.length === 0 ? '#ccc' : sessions.length === 1 ? '#2e7d32' : '#1565c0'
      const bg = isWe ? '#f5f5f5' : sessions.length > 0 ? '#e8f5e9' : '#fff'
      return `<td style="border:1px solid #ddd;text-align:center;font-size:7pt;font-weight:700;color:${color};background:${bg};padding:1px">${text || '·'}</td>`
    }).join('')
    const rowBg = idx % 2 === 0 ? '#fff' : '#fafafa'
    return `<tr style="background:${rowBg}">
      <td style="border:1px solid #ccc;text-align:center;padding:2px;font-size:8pt">${idx + 1}</td>
      <td style="border:1px solid #ccc;padding:2px 6px;font-size:8pt;white-space:nowrap">${t.ho_ten}</td>
      ${cells}
      <td style="border:1px solid #ccc;text-align:center;font-size:8pt;font-weight:700;color:#1565c0;background:#e3f2fd">${total}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8">
<title>Điểm danh giáo viên tháng ${m}/${y}</title>
<style>
  @page { size: A4 landscape; margin: 8mm 10mm; }
  body { font-family: Arial,sans-serif; font-size:9pt; margin:0; }
  table { border-collapse:collapse; width:100%; }
  h2 { text-align:center; margin:0 0 4px; font-size:12pt; text-transform:uppercase; }
  .sub { text-align:center; font-size:8pt; color:#555; margin-bottom:8px; }
</style></head><body>
<h2>BẢNG ĐIỂM DANH GIÁO VIÊN</h2>
<div class="sub">Tháng: <b>${m}/${y}</b></div>
<table><thead><tr>
  <th style="width:28px;border:1px solid #ccc;font-size:7pt;padding:2px">STT</th>
  <th style="width:130px;border:1px solid #ccc;font-size:7pt;padding:2px;text-align:left">Giáo viên</th>
  ${tds}
  <th style="width:32px;border:1px solid #ccc;font-size:7pt;background:#e3f2fd;color:#1565c0;padding:2px">Tổng</th>
</tr></thead><tbody>${rows}</tbody></table>
<div style="margin-top:6px;font-size:7pt;color:#555"><b>Chú thích:</b> Ký hiệu = tên viết tắt lớp. · = không dạy. Tổng = số ngày có mặt đi dạy (nhiều lớp cùng ngày tính 1 ngày).</div>
<script>window.onload=()=>{ window.print(); }<\/script>
</body></html>`
}

function TeacherMatrix({ teachers, data, month, daysInMonth }) {
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth])
  const padDate = d => `${month}-${String(d).padStart(2, '0')}`

  // Tổng ngày dạy per teacher (nhiều lớp cùng ngày = 1 ngày)
  const totals = useMemo(() => {
    const res = {}
    teachers.forEach(t => {
      let ngay = 0
      days.forEach(d => {
        const sessions = data[t.id]?.[padDate(d)] || []
        if (sessions.length > 0) ngay++
      })
      res[t.id] = ngay
    })
    return res
  }, [teachers, data, days, month])

  const openPrint = () => {
    const w = window.open('', '_blank', 'width=1200,height=900')
    w.document.write(generateTeacherPrintHTML({ teachers, data, month, daysInMonth }))
    w.document.close()
  }

  if (teachers.length === 0) return (
    <div className="bg-white rounded-2xl py-20 text-center text-gray-400 text-sm shadow-sm border border-gray-100">
      Không có giáo viên nào đang dạy
    </div>
  )

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="font-semibold text-gray-700">{teachers.length} giáo viên</span>
          <div className="flex gap-3 text-xs">
            <span className="text-gray-400">Ô = lớp đã dạy trong ngày đó</span>
            <span className="text-green-600 font-medium">Xanh = 1 lớp</span>
            <span className="text-blue-600 font-medium">Xanh dương = nhiều lớp</span>
          </div>
        </div>
        <button onClick={openPrint}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-indigo-200 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors">
          <Printer size={13} /> In bảng điểm danh GV
        </button>
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse" style={{ minWidth: 'max-content' }}>
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-10 bg-gray-50 border border-gray-200 px-2 py-1 text-center text-gray-500 font-semibold" style={{ minWidth: 32 }}>#</th>
              <th className="sticky z-10 bg-gray-50 border border-gray-200 px-3 py-1 text-left text-gray-600 font-semibold whitespace-nowrap" style={{ minWidth: 160, left: 32 }}>Giáo viên</th>
              {days.map(d => {
                const dow_idx = getDay(new Date(`${month}-${String(d).padStart(2, '0')}`))
                const isWe = dow_idx === 0 || dow_idx === 6
                return (
                  <th key={d}
                    className={`border border-gray-200 text-center font-semibold ${isWe ? 'bg-gray-100 text-gray-400' : 'text-gray-600'}`}
                    style={{ width: 32, minWidth: 32 }}
                  >
                    <div>{d}</div>
                    <div className="text-gray-400 font-normal" style={{ fontSize: 9 }}>{DOW[dow_idx]}</div>
                  </th>
                )
              })}
              <th className="border border-blue-200 bg-blue-50 text-center text-blue-700 font-semibold px-2" style={{ minWidth: 40 }}>Tổng</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t, idx) => {
              const tData = data[t.id] || {}
              return (
                <tr key={t.id} className={idx % 2 === 1 ? 'bg-gray-50/60' : ''}>
                  <td className="sticky left-0 z-10 bg-inherit border border-gray-200 text-center text-gray-400 py-1" style={{ minWidth: 32 }}>{idx + 1}</td>
                  <td className="sticky z-10 bg-inherit border border-gray-200 px-3 py-1 font-medium text-gray-800 whitespace-nowrap" style={{ minWidth: 160, left: 32 }}>
                    <div>{t.ho_ten}</div>
                    {t.luong_buoi > 0 && (
                      <div className="text-gray-400 font-normal text-xs">{new Intl.NumberFormat('vi-VN').format(t.luong_buoi)}đ/buổi</div>
                    )}
                  </td>
                  {days.map(d => {
                    const date = padDate(d)
                    const sessions = tData[date] || []
                    const dow_idx = getDay(new Date(date))
                    const isWe = dow_idx === 0 || dow_idx === 6
                    const hasSessions = sessions.length > 0

                    let cellClass = 'border border-gray-200 text-center py-1 px-0.5'
                    let content = <span className="text-gray-300">·</span>

                    if (hasSessions) {
                      cellClass += sessions.length === 1
                        ? ' bg-green-50 border-green-200'
                        : ' bg-blue-50 border-blue-200'
                      content = (
                        <div className="flex flex-col items-center gap-0.5">
                          {sessions.map((s, i) => (
                            <span key={i}
                              className={`font-bold leading-tight ${sessions.length === 1 ? 'text-green-700' : 'text-blue-700'}`}
                              style={{ fontSize: 10 }}
                              title={`${s.ten_lop} (${s.so_hoc_sinh} hs)`}
                            >
                              {abbr(s.ten_lop)}
                            </span>
                          ))}
                        </div>
                      )
                    } else if (isWe) {
                      cellClass += ' bg-gray-50'
                    }

                    return (
                      <td key={d} className={cellClass} style={{ width: 32, minWidth: 32 }}>
                        {content}
                      </td>
                    )
                  })}
                  <td className="border border-blue-200 bg-blue-50 text-center font-bold text-blue-700 px-2">
                    {totals[t.id] || 0}
                  </td>
                </tr>
              )
            })}
          </tbody>
          {/* Footer: total per day */}
          <tfoot>
            <tr className="bg-indigo-50">
              <td colSpan={2} className="sticky left-0 z-10 bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700">Số GV dạy / ngày</td>
              {days.map(d => {
                const date = padDate(d)
                // Đếm số GV có dạy ngày đó (không nhân số lớp)
                const count = teachers.filter(t => (data[t.id]?.[date]?.length || 0) > 0).length
                return (
                  <td key={d} className="border border-indigo-200 text-center font-bold text-indigo-700 text-xs py-1">
                    {count > 0 ? count : <span className="text-indigo-200">·</span>}
                  </td>
                )
              })}
              <td className="border border-blue-200 bg-blue-100 text-center font-bold text-blue-800 text-xs px-2">
                —
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary cards */}
      <div className="border-t border-gray-100 px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {teachers.map(t => {
          const total = totals[t.id] || 0
          const luong = total * (t.luong_buoi || 0)
          return (
            <div key={t.id} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-700 truncate">{t.ho_ten}</p>
              <p className="text-lg font-bold text-indigo-700 mt-0.5">{total} <span className="text-xs font-normal text-gray-400">ngày dạy</span></p>
              {luong > 0 && <p className="text-xs text-gray-500">{new Intl.NumberFormat('vi-VN').format(luong)} đ</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Multi-class select dropdown ──────────────────────────────────────────────
function MultiClassSelect({ classes, selected, onChange, activeMonth }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (id) => {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    onChange(s)
  }
  const selectAll = () => onChange(new Set())        // empty = tất cả
  const selectOnly = (id) => onChange(new Set([id])) // chỉ 1 lớp

  const activeClasses = classes.filter(c => {
    const after  = !c.thang_bat_dau || c.thang_bat_dau <= activeMonth
    const before = !c.thang_ket_thuc || c.thang_ket_thuc >= activeMonth
    return after && before
  })
  const inactiveClasses = classes.filter(c => !activeClasses.includes(c))

  const label = selected.size === 0
    ? `Tất cả lớp đang hoạt động (${activeClasses.length})`
    : `${selected.size} lớp được chọn`

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white hover:bg-gray-50 transition-colors min-w-56 justify-between"
      >
        <span className={selected.size === 0 ? 'text-indigo-600 font-medium' : 'text-gray-700'}>{label}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl w-72 overflow-hidden">
          {/* Header actions */}
          <div className="flex gap-2 px-3 py-2.5 border-b border-gray-100">
            <button onClick={selectAll}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${selected.size === 0 ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>
              Tất cả đang hoạt động
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {activeClasses.length > 0 && (
              <>
                <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Đang hoạt động</p>
                {activeClasses.map(c => (
                  <label key={c.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                      className="w-4 h-4 accent-indigo-600 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{c.ten_lop}</p>
                      {(c.thang_bat_dau || c.thang_ket_thuc) && (
                        <p className="text-xs text-gray-400">
                          {[c.thang_bat_dau, c.thang_ket_thuc].filter(Boolean).map(m =>
                            m.slice(5, 7) + '/' + m.slice(0, 4)
                          ).join(' → ')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={e => { e.preventDefault(); selectOnly(c.id); setOpen(false) }}
                      className="text-xs text-indigo-400 hover:text-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Chỉ lớp này
                    </button>
                  </label>
                ))}
              </>
            )}
            {inactiveClasses.length > 0 && (
              <>
                <p className="px-3 py-1 mt-1 text-xs font-semibold text-gray-400 uppercase tracking-wide border-t border-gray-100 pt-2">Không hoạt động tháng này</p>
                {inactiveClasses.map(c => (
                  <label key={c.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer opacity-50">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                      className="w-4 h-4 accent-indigo-600"
                    />
                    <span className="text-sm text-gray-500 truncate">{c.ten_lop}</span>
                  </label>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Self-contained panel for one class ───────────────────────────────────────
function ClassAttendancePanel({ classId, month, teachers }) {
  const [cls, setCls]                   = useState(null)
  const [students, setStudents]         = useState([])
  const [serverData, setServerData]     = useState({})
  const [localData, setLocalData]       = useState({})
  const [daysInMonth, setDaysInMonth]   = useState(0)
  const [teacherByDay, setTeacherByDay] = useState({})
  const [pendingKeys, setPendingKeys]   = useState(new Set())
  const [loading, setLoading]           = useState(false)
  const [saving, setSaving]             = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true); setPendingKeys(new Set())
      try {
        const res = await attendanceService.getMonthly({ class_id: classId, thang: month })
        if (cancelled) return
        const { cls: c, students: s, data: d, daysInMonth: dim, teacherByDay: tbd } = res.data
        setCls(c); setStudents(s || [])
        setServerData(d || {}); setLocalData(JSON.parse(JSON.stringify(d || {})))
        setDaysInMonth(dim); setTeacherByDay(tbd || {})
      } catch { toast.error('Không thể tải dữ liệu lớp') }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [classId, month])

  const handleCellClick = useCallback((studentId, date, currentStatus) => {
    const next = CYCLE[(CYCLE.indexOf(currentStatus) + 1) % CYCLE.length]
    const key = `${studentId}-${date}`
    setLocalData(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [date]: next } }))
    setPendingKeys(prev => {
      const s = new Set(prev)
      const serverVal = serverData[studentId]?.[date] || null
      next === serverVal ? s.delete(key) : s.add(key)
      return s
    })
  }, [serverData])

  const handleSave = async () => {
    if (pendingKeys.size === 0) return
    setSaving(true)
    try {
      const changeList = []
      pendingKeys.forEach(key => {
        const match = key.match(/^(\d+)-(\d{4}-\d{2}-\d{2})$/)
        if (match) {
          const [, sid, date] = match
          changeList.push({ student_id: Number(sid), ngay: date, trang_thai: localData[Number(sid)]?.[date] || null })
        }
      })
      await attendanceService.batchSave({ class_id: Number(classId), changes: changeList })
      toast.success(`Đã lưu ${changeList.length} thay đổi`)
      setServerData(JSON.parse(JSON.stringify(localData)))
      setPendingKeys(new Set())
    } catch (err) { toast.error(err.message || 'Không thể lưu') }
    finally { setSaving(false) }
  }

  const handleSetTeacher = useCallback(async (date, teacherId) => {
    try {
      await attendanceService.setTeacher({ class_id: Number(classId), ngay: date, teacher_id: teacherId ? Number(teacherId) : null })
      setTeacherByDay(prev => ({
        ...prev,
        [date]: teacherId
          ? { teacher_id: Number(teacherId), ho_ten: teachers.find(t => String(t.id) === String(teacherId))?.ho_ten || '' }
          : undefined,
      }))
    } catch (err) { toast.error(err.message || 'Không thể cập nhật giáo viên') }
  }, [classId, teachers])

  if (loading) return (
    <div className="flex justify-center py-12 gap-2 text-indigo-600">
      <Loader2 size={20} className="animate-spin" /><span className="text-sm">Đang tải {cls?.ten_lop || ''}...</span>
    </div>
  )
  if (students.length === 0 && cls) return (
    <div className="bg-white rounded-2xl py-10 text-center text-gray-400 text-sm shadow-sm border border-gray-100">
      Chưa có học sinh trong lớp <b>{cls.ten_lop}</b>
    </div>
  )
  if (!cls) return null

  return (
    <AttendanceMatrix
      cls={cls} students={students}
      localData={localData} serverData={serverData}
      month={month} daysInMonth={daysInMonth}
      pendingKeys={pendingKeys}
      teachers={teachers} teacherByDay={teacherByDay}
      onCellClick={handleCellClick}
      onSetTeacher={handleSetTeacher}
      onSave={handleSave}
      saving={saving}
    />
  )
}

// ── Quick Attendance (teacher mode) ──────────────────────────────────────────
const STATUS_CYCLE = ['co_mat', 'vang_phep', 'vang_mat']
const STATUS_CFG = {
  co_mat:    { label: 'Có mặt',    icon: CheckCircle, card: 'bg-green-50 border-green-300 ring-green-400',  badge: 'bg-green-500 text-white',   text: 'text-green-700' },
  vang_phep: { label: 'Vắng phép', icon: Clock,       card: 'bg-yellow-50 border-yellow-300 ring-yellow-400', badge: 'bg-yellow-500 text-white', text: 'text-yellow-700' },
  vang_mat:  { label: 'Vắng mặt', icon: XCircle,     card: 'bg-red-50 border-red-200 ring-red-400',        badge: 'bg-red-500 text-white',     text: 'text-red-600' },
}

function QuickAttendance({ teachers }) {
  const [teacherId, setTeacherId] = useState('')
  const [date, setDate]         = useState(format(new Date(), 'yyyy-MM-dd'))
  const [myClasses, setMyClasses] = useState([])
  const [classId, setClassId]   = useState('')
  const [students, setStudents] = useState([])  // [{id, ho_ten, biet_danh, trang_thai}]
  const [attMap, setAttMap]     = useState({})  // {id: 'co_mat'|'vang_phep'|'vang_mat'}
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  // Load classes of selected teacher
  useEffect(() => {
    if (!teacherId) { setMyClasses([]); setClassId(''); return }
    classService.getAll({ teacher_id: teacherId })
      .then(res => setMyClasses(res?.data || res || []))
      .catch(() => {})
  }, [teacherId])

  // Load students when class+date selected
  useEffect(() => {
    if (!classId || !date) { setStudents([]); setAttMap({}); return }
    setLoading(true); setSaved(false)
    attendanceService.getSheet({ class_id: classId, ngay: date })
      .then(res => {
        const list = (res?.data?.students || [])
        setStudents(list)
        const init = {}
        list.forEach(s => {
          init[s.student_id || s.id] = (s.trang_thai === 'chua_diem_danh' ? 'co_mat' : s.trang_thai) || 'co_mat'
        })
        setAttMap(init)
      })
      .catch(() => toast.error('Không thể tải danh sách học sinh'))
      .finally(() => setLoading(false))
  }, [classId, date])

  const toggle = (id) => {
    setSaved(false)
    setAttMap(prev => {
      const cur = prev[id] || 'co_mat'
      const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length]
      return { ...prev, [id]: next }
    })
  }

  const markAll = (status) => {
    setSaved(false)
    setAttMap(prev => {
      const next = { ...prev }
      students.forEach(s => { next[s.student_id || s.id] = status })
      return next
    })
  }

  const handleSave = async () => {
    if (!classId || !date || students.length === 0) return
    setSaving(true)
    try {
      const records = students.map(s => ({
        student_id: s.student_id || s.id,
        trang_thai: attMap[s.student_id || s.id] || 'co_mat',
      }))
      await attendanceService.save({
        class_id: Number(classId),
        teacher_id: teacherId ? Number(teacherId) : null,
        ngay: date,
        records,
      })
      setSaved(true)
      toast.success('Đã lưu điểm danh!')
    } catch (err) { toast.error(err.message || 'Lỗi khi lưu') }
    finally { setSaving(false) }
  }

  const counts = Object.values(attMap).reduce((acc, v) => {
    acc[v] = (acc[v] || 0) + 1; return acc
  }, {})

  const cls = myClasses.find(c => String(c.id) === String(classId))

  return (
    <div className="max-w-lg mx-auto">
      {/* Step 1: Teacher + Date */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4 space-y-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2 text-sm">
          <Zap size={16} className="text-indigo-500" /> Điểm danh nhanh
        </h3>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Giáo viên</label>
          <select value={teacherId} onChange={e => { setTeacherId(e.target.value); setClassId('') }}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">— Chọn tên giáo viên —</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.ho_ten}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Ngày dạy</label>
            <input type="date" value={date} onChange={e => { setDate(e.target.value); setSaved(false) }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Lớp dạy</label>
            <select value={classId} onChange={e => setClassId(e.target.value)}
              disabled={!teacherId}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50">
              <option value="">— Chọn lớp —</option>
              {myClasses.map(c => <option key={c.id} value={c.id}>{c.ten_lop}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Step 2: Student list */}
      {classId && (
        loading ? (
          <div className="flex justify-center py-16 gap-2 text-indigo-600">
            <Loader2 size={22} className="animate-spin" /><span className="text-sm">Đang tải...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-2xl py-12 text-center text-gray-400 text-sm shadow-sm border border-gray-100">
            Chưa có học sinh nào trong lớp này
          </div>
        ) : (
          <>
            {/* Class info + quick actions */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 mb-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-semibold text-indigo-800 text-sm">{cls?.ten_lop}</p>
                <p className="text-xs text-indigo-500 mt-0.5">
                  {date} · {students.length} học sinh
                </p>
              </div>
              <div className="flex gap-2">
                {Object.entries(STATUS_CFG).map(([k, v]) => (
                  <button key={k} onClick={() => markAll(k)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${v.card.split(' ring')[0]}`}>
                    Tất cả {v.label.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary chips */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {Object.entries(STATUS_CFG).map(([k, v]) => counts[k] > 0 && (
                <span key={k} className={`flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full ${v.badge}`}>
                  {counts[k]} {v.label.toLowerCase()}
                </span>
              ))}
            </div>

            {/* Student cards */}
            <div className="space-y-2 mb-4">
              {students.map((s, idx) => {
                const id = s.student_id || s.id
                const status = attMap[id] || 'co_mat'
                const cfg = STATUS_CFG[status]
                const Icon = cfg.icon
                return (
                  <button key={id} onClick={() => toggle(id)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 transition-all active:scale-95 ${cfg.card}`}>
                    <div className="flex items-center gap-3 text-left">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${cfg.badge}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{s.ho_ten}</p>
                        {s.biet_danh && <p className="text-xs text-gray-400">"{s.biet_danh}"</p>}
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${cfg.text}`}>
                      <Icon size={16} />
                      <span className="hidden sm:block">{cfg.label}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Save button */}
            <button onClick={handleSave} disabled={saving || saved}
              className={`w-full py-4 rounded-2xl text-base font-bold transition-all flex items-center justify-center gap-2
                ${saved
                  ? 'bg-green-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 active:scale-95'
                } disabled:opacity-70`}>
              {saving ? <Loader2 size={20} className="animate-spin" />
                : saved ? <><CheckCircle size={20} /> Đã lưu điểm danh!</>
                : <><Save size={20} /> Lưu điểm danh ({students.length} học sinh)</>
              }
            </button>
            {saved && (
              <p className="text-center text-xs text-gray-400 mt-2">
                Nhấn "Lưu điểm danh" lần nữa nếu muốn ghi đè
              </p>
            )}
          </>
        )
      )}

      {!teacherId && (
        <div className="bg-white rounded-2xl py-16 text-center text-gray-400 text-sm shadow-sm border border-gray-100">
          <Users size={40} className="mx-auto mb-2 text-gray-200" />
          Chọn giáo viên để bắt đầu điểm danh
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [selectedClass, setSelectedClass] = useState('')   // for session/summary/teacher tabs
  const [selectedClasses, setSelectedClasses] = useState(new Set()) // for matrix tab (empty = all active)
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Active classes for matrix tab (filter by month range)
  const activeClasses = useMemo(() => classes.filter(c => {
    const after  = !c.thang_bat_dau || c.thang_bat_dau <= month
    const before = !c.thang_ket_thuc || c.thang_ket_thuc >= month
    return after && before
  }), [classes, month])

  // Classes to display in matrix: selected set OR all active
  const matrixClasses = useMemo(() => {
    if (selectedClasses.size === 0) return activeClasses
    return classes.filter(c => selectedClasses.has(c.id))
  }, [selectedClasses, activeClasses, classes])

  // Matrix data (legacy — kept for other tabs that still use single class)
  const [cls, setCls] = useState(null)
  const [students, setStudents] = useState([])
  const [serverData, setServerData] = useState({})   // { sid: { date: status } }
  const [localData, setLocalData] = useState({})     // mutable copy
  const [daysInMonth, setDaysInMonth] = useState(0)
  const [teacherByDay, setTeacherByDay] = useState({}) // { 'YYYY-MM-DD': { teacher_id, ho_ten } }
  const [pendingKeys, setPendingKeys] = useState(new Set())

  // Tabs
  const [activeTab, setActiveTab] = useState('matrix')

  // Per-session tab state
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [sheet, setSheet] = useState([])
  const [attendance, setAttendance] = useState({})
  const [loadingSheet, setLoadingSheet] = useState(false)
  const [sheetLoaded, setSheetLoaded] = useState(false)
  const [savingSheet, setSavingSheet] = useState(false)

  // Summary tab
  const [summary, setSummary] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  // Teacher tab
  const [teacherData, setTeacherData] = useState({ teachers: [], data: {}, daysInMonth: 0 })
  const [loadingTeacher, setLoadingTeacher] = useState(false)

  useEffect(() => { fetchClasses(); fetchTeachers() }, [])

  useEffect(() => {
    if (activeTab === 'matrix' && selectedClass) loadMonthly()
  }, [selectedClass, month, activeTab])

  const fetchTeachers = async () => {
    try {
      const res = await teacherService.getAll()
      const data = res?.data || res || []
      setTeachers((Array.isArray(data) ? data : []).filter(t => t.trang_thai === 'dang_day'))
    } catch {}
  }

  const fetchClasses = async () => {
    try {
      const res = await classService.getAll()
      const data = res?.data || res || []
      setClasses(Array.isArray(data) ? data : [])
    } catch { toast.error('Không thể tải danh sách lớp') }
  }

  // ── Monthly matrix ──────────────────────────────────────────────────────────
  const loadMonthly = async () => {
    setLoading(true)
    setPendingKeys(new Set())
    try {
      const res = await attendanceService.getMonthly({ class_id: selectedClass, thang: month })
      const { cls: c, students: s, data: d, daysInMonth: dim, teacherByDay: tbd } = res.data
      setCls(c)
      setStudents(s || [])
      setServerData(d || {})
      setLocalData(JSON.parse(JSON.stringify(d || {})))
      setDaysInMonth(dim)
      setTeacherByDay(tbd || {})
    } catch { toast.error('Không thể tải dữ liệu điểm danh') }
    finally { setLoading(false) }
  }

  const handleCellClick = useCallback((studentId, date, currentStatus) => {
    const next = CYCLE[(CYCLE.indexOf(currentStatus) + 1) % CYCLE.length]
    const key = `${studentId}-${date}`

    setLocalData(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [date]: next }
    }))

    setPendingKeys(prev => {
      const next_set = new Set(prev)
      const serverVal = serverData[studentId]?.[date] || null
      if (next === serverVal) next_set.delete(key)
      else next_set.add(key)
      return next_set
    })
  }, [serverData])

  const handleSave = async () => {
    if (pendingKeys.size === 0) return
    setSaving(true)
    try {
      const changes = []
      pendingKeys.forEach(key => {
        const [sid, date] = key.split(/-([\d-]+)$/).filter(Boolean)
        const studentId = parseInt(key)
        const d = key.replace(`${studentId}-`, '')
        changes.push({ student_id: studentId, ngay: d, trang_thai: localData[studentId]?.[d] || null })
      })
      // Re-parse keys properly
      const changeList = []
      pendingKeys.forEach(key => {
        // key = "studentId-YYYY-MM-DD"
        const match = key.match(/^(\d+)-(\d{4}-\d{2}-\d{2})$/)
        if (match) {
          const [, sid, date] = match
          changeList.push({
            student_id: Number(sid),
            ngay: date,
            trang_thai: localData[Number(sid)]?.[date] || null,
          })
        }
      })
      await attendanceService.batchSave({ class_id: Number(selectedClass), changes: changeList })
      toast.success(`Đã lưu ${changeList.length} thay đổi`)
      setServerData(JSON.parse(JSON.stringify(localData)))
      setPendingKeys(new Set())
    } catch (err) { toast.error(err.message || 'Không thể lưu') }
    finally { setSaving(false) }
  }

  const handleSetTeacher = useCallback(async (date, teacherId) => {
    try {
      await attendanceService.setTeacher({
        class_id: Number(selectedClass),
        ngay: date,
        teacher_id: teacherId ? Number(teacherId) : null,
      })
      setTeacherByDay(prev => ({
        ...prev,
        [date]: teacherId
          ? { teacher_id: Number(teacherId), ho_ten: teachers.find(t => String(t.id) === String(teacherId))?.ho_ten || '' }
          : undefined,
      }))
    } catch (err) { toast.error(err.message || 'Không thể cập nhật giáo viên') }
  }, [selectedClass, teachers])

  const prevMonth = () => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    setMonth(format(d, 'yyyy-MM'))
  }
  const nextMonth = () => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m, 1)
    setMonth(format(d, 'yyyy-MM'))
  }

  // ── Per-session tab ─────────────────────────────────────────────────────────
  const loadSheet = async () => {
    if (!selectedClass || !selectedDate) return
    setLoadingSheet(true); setSheetLoaded(false)
    try {
      const res = await attendanceService.getSheet({ class_id: selectedClass, ngay: selectedDate })
      const { students: s } = res?.data || {}
      const list = Array.isArray(s) ? s : []
      setSheet(list)
      const init = {}
      list.forEach(st => { init[st.student_id || st.id] = { trang_thai: st.trang_thai === 'chua_diem_danh' ? 'co_mat' : st.trang_thai, ghi_chu: st.ghi_chu || '' } })
      setAttendance(init); setSheetLoaded(true)
    } catch { toast.error('Không thể tải danh sách điểm danh') }
    finally { setLoadingSheet(false) }
  }

  const saveSheet = async () => {
    if (!selectedClass || !selectedDate || sheet.length === 0) return
    setSavingSheet(true)
    try {
      const records = sheet.map(s => ({
        student_id: s.student_id || s.id,
        trang_thai: attendance[s.student_id || s.id]?.trang_thai || 'co_mat',
        ghi_chu: attendance[s.student_id || s.id]?.ghi_chu || '',
      }))
      await attendanceService.save({ class_id: Number(selectedClass), ngay: selectedDate, records })
      toast.success('Lưu điểm danh thành công')
      if (activeTab === 'matrix' || (activeTab === 'session' && selectedClass)) loadMonthly()
    } catch (err) { toast.error(err.message || 'Không thể lưu') }
    finally { setSavingSheet(false) }
  }

  const setStudentStatus = (id, field, value) =>
    setAttendance(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }))

  // ── Summary ─────────────────────────────────────────────────────────────────
  const loadSummary = async () => {
    if (!selectedClass) return
    setLoadingSummary(true)
    try {
      const res = await attendanceService.getSummary({ class_id: selectedClass, thang: month })
      setSummary(res?.data || res)
    } catch { toast.error('Không thể tải tổng hợp') }
    finally { setLoadingSummary(false) }
  }

  useEffect(() => {
    if (activeTab === 'summary' && selectedClass) loadSummary()
  }, [activeTab, selectedClass, month])

  useEffect(() => {
    if (activeTab === 'teacher') loadTeacherMonthly()
  }, [activeTab, month])

  const loadTeacherMonthly = async () => {
    setLoadingTeacher(true)
    try {
      const res = await attendanceService.getTeacherMonthly({ thang: month })
      setTeacherData(res?.data || { teachers: [], data: {}, daysInMonth: 0 })
    } catch { toast.error('Không thể tải dữ liệu điểm danh giáo viên') }
    finally { setLoadingTeacher(false) }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Layout title="Điểm danh">
      {/* Tab bar — always visible */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
          {[
            { key: 'quick',   label: '⚡ Nhanh' },
            { key: 'matrix',  label: 'Bảng tháng' },
            { key: 'session', label: 'Theo buổi' },
            { key: 'summary', label: 'Tổng hợp' },
            { key: 'teacher', label: 'Giáo viên' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${activeTab === t.key ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls row — hidden in quick mode */}
      {activeTab !== 'quick' && (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-5">
        <div className="flex flex-col sm:flex-row gap-3 items-end flex-wrap">
          {/* Multi-select for matrix tab, single select for others */}
          {activeTab === 'matrix' ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lớp học</label>
              <MultiClassSelect
                classes={classes}
                selected={selectedClasses}
                onChange={setSelectedClasses}
                activeMonth={month}
              />
            </div>
          ) : (
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-medium text-gray-600 mb-1">Lớp học</label>
              <select
                value={selectedClass}
                onChange={e => { setSelectedClass(e.target.value); setSheetLoaded(false) }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">-- Chọn lớp --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.ten_lop}</option>)}
              </select>
            </div>
          )}

          {/* Month navigator */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tháng</label>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <ChevronLeft size={15} className="text-gray-500" />
              </button>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <button onClick={nextMonth} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <ChevronRight size={15} className="text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ===== TAB: ĐIỂM DANH NHANH ===== */}
      {activeTab === 'quick' && <QuickAttendance teachers={teachers} />}

      {/* ===== TAB: BẢNG THÁNG (MATRIX) ===== */}
      {activeTab === 'matrix' && (
        matrixClasses.length === 0 ? (
          <div className="bg-white rounded-2xl py-20 text-center text-gray-400 text-sm shadow-sm border border-gray-100">
            <ClipboardCheck size={40} className="mx-auto mb-2 text-gray-200" />
            {classes.length === 0 ? 'Chưa có lớp học nào' : 'Không có lớp nào đang hoạt động tháng này'}
          </div>
        ) : (
          <div className="space-y-6">
            {matrixClasses.map(c => (
              <ClassAttendancePanel
                key={`${c.id}-${month}`}
                classId={c.id}
                month={month}
                teachers={teachers}
              />
            ))}
          </div>
        )
      )}

      {/* ===== TAB: THEO BUỔI ===== */}
      {activeTab === 'session' && (
        <>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-5 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ngày</label>
              <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setSheetLoaded(false) }}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <button onClick={loadSheet} disabled={loadingSheet || !selectedClass}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {loadingSheet ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
              Tải danh sách
            </button>
          </div>

          {sheetLoaded && (
            sheet.length === 0 ? (
              <div className="bg-white rounded-2xl py-16 text-center text-gray-400 text-sm shadow-sm border border-gray-100">
                Không có học sinh nào trong lớp này
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex gap-3 px-5 py-3 border-b border-gray-100 text-sm">
                  {(['co_mat','vang_mat','vang_phep']).map(k => {
                    const count = sheet.filter(s => (attendance[s.student_id || s.id]?.trang_thai || 'co_mat') === k).length
                    return <span key={k} className={`px-3 py-1 rounded-lg font-medium ${CELL[k].bg.split(' ')[0]} ${CELL[k].text}`}>
                      {k === 'co_mat' ? 'Có mặt' : k === 'vang_mat' ? 'Vắng mặt' : 'Vắng phép'}: {count}
                    </span>
                  })}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Học sinh</th>
                        <th className="text-center px-3 py-3 font-semibold text-green-600">Có mặt</th>
                        <th className="text-center px-3 py-3 font-semibold text-yellow-600">Vắng phép</th>
                        <th className="text-center px-3 py-3 font-semibold text-red-600">Vắng mặt</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.map((s, idx) => {
                        const id = s.student_id || s.id
                        const att = attendance[id] || { trang_thai: 'co_mat', ghi_chu: '' }
                        return (
                          <tr key={id} className={`border-b border-gray-50 ${idx % 2 !== 0 ? 'bg-gray-50/40' : ''}`}>
                            <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                            <td className="px-4 py-2 font-medium text-gray-800">{s.ho_ten}</td>
                            {['co_mat', 'vang_phep', 'vang_mat'].map(opt => (
                              <td key={opt} className="px-3 py-2 text-center">
                                <input type="radio" name={`att-${id}`}
                                  checked={att.trang_thai === opt}
                                  onChange={() => setStudentStatus(id, 'trang_thai', opt)}
                                  className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                              </td>
                            ))}
                            <td className="px-4 py-2">
                              <input type="text" value={att.ghi_chu}
                                onChange={e => setStudentStatus(id, 'ghi_chu', e.target.value)}
                                placeholder="Ghi chú..."
                                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
                  <button onClick={saveSheet} disabled={savingSheet}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                    {savingSheet ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    Lưu điểm danh
                  </button>
                </div>
              </div>
            )
          )}
        </>
      )}

      {/* ===== TAB: TỔNG HỢP ===== */}
      {activeTab === 'summary' && (
        <>
          {loadingSummary ? (
            <div className="flex items-center justify-center py-20 gap-2 text-indigo-600">
              <Loader2 size={22} className="animate-spin" /><span className="text-sm">Đang tải...</span>
            </div>
          ) : !summary ? (
            <div className="bg-white rounded-2xl py-20 text-center text-gray-400 text-sm shadow-sm border border-gray-100">
              <ClipboardCheck size={40} className="mx-auto mb-2 text-gray-200" />
              {selectedClass ? 'Chưa có dữ liệu điểm danh tháng này' : 'Chọn lớp để xem tổng hợp'}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-700">Tổng hợp điểm danh tháng {month}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Học sinh</th>
                      <th className="text-center px-4 py-3 font-semibold text-green-600">Có mặt</th>
                      <th className="text-center px-4 py-3 font-semibold text-yellow-600">Vắng phép</th>
                      <th className="text-center px-4 py-3 font-semibold text-red-600">Vắng mặt</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Tổng</th>
                      <th className="text-center px-4 py-3 font-semibold text-indigo-600">Tỉ lệ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(summary) ? summary.map((row, idx) => {
                      const rate = row.ty_le_di_hoc || 0
                      return (
                        <tr key={idx} className={`border-b border-gray-50 ${idx % 2 !== 0 ? 'bg-gray-50/40' : ''}`}>
                          <td className="px-5 py-3 font-medium text-gray-800">{row.ho_ten}</td>
                          <td className="px-4 py-3 text-center font-bold text-green-700">{row.co_mat || 0}</td>
                          <td className="px-4 py-3 text-center font-bold text-yellow-600">{row.vang_phep || 0}</td>
                          <td className="px-4 py-3 text-center font-bold text-red-600">{row.vang_mat || 0}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{(row.co_mat||0)+(row.vang_mat||0)+(row.vang_phep||0)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rate >= 80 ? 'bg-green-100 text-green-700' : rate >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      )
                    }) : (
                      <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Không có dữ liệu</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== TAB: GIÁO VIÊN ===== */}
      {activeTab === 'teacher' && (
        loadingTeacher ? (
          <div className="flex items-center justify-center py-20 gap-2 text-indigo-600">
            <Loader2 size={22} className="animate-spin" /><span className="text-sm">Đang tải...</span>
          </div>
        ) : (
          <TeacherMatrix
            teachers={teacherData.teachers}
            data={teacherData.data}
            month={month}
            daysInMonth={teacherData.daysInMonth}
          />
        )
      )}
    </Layout>
  )
}
