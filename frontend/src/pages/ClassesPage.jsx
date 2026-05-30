import { useState, useEffect, useMemo } from 'react'
import { Layout } from '../components/Layout'
import {
  Plus, Edit2, Trash2, Search, X, AlertCircle, Loader2,
  BookOpen, Users, ClipboardCheck, BarChart2, UserPlus,
  UserMinus, Calendar, GraduationCap, TrendingUp, Star,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import classService from '../services/classService'
import teacherService from '../services/teacherService'
import studentService from '../services/studentService'
import attendanceService from '../services/attendanceService'
import resultService from '../services/resultService'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3001'

const currentNamHoc = () => {
  const y = new Date().getFullYear()
  const m = new Date().getMonth() + 1
  return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

const HOC_KY_OPTIONS = ['HK1', 'HK2', 'HK3', 'Cả năm']

const EMPTY_FORM = { ten_lop: '', mo_ta: '', hoc_phi_thang: '', teacher_id: '', lich_hoc: '', hoc_ky: 'HK1', nam_hoc: currentNamHoc(), thang_bat_dau: '', thang_ket_thuc: '' }

const fmtMonth = (m) => {
  if (!m) return ''
  try { return format(new Date(m + '-01'), 'MM/yyyy') } catch { return m }
}

const fmtCurrency = v => v ? new Intl.NumberFormat('vi-VN').format(v) + ' đ' : '-'
const fmtDate = d => { try { return d ? format(new Date(d), 'dd/MM/yyyy') : '-' } catch { return '-' } }
const currentMonth = () => format(new Date(), 'yyyy-MM')

const XL_MAP = { gioi: { label: 'Giỏi', cls: 'bg-green-100 text-green-700' }, kha: { label: 'Khá', cls: 'bg-blue-100 text-blue-700' }, trung_binh: { label: 'Trung bình', cls: 'bg-yellow-100 text-yellow-700' }, yeu: { label: 'Yếu', cls: 'bg-red-100 text-red-600' } }

function XepLoaiBadge({ xl }) {
  const { label, cls } = XL_MAP[xl] || { label: xl, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
}

function StudentAvatar({ s, size = 8 }) {
  const sz = `w-${size} h-${size}`
  if (s?.hinh_anh) return (
    <img src={`${API_BASE}/${s.hinh_anh}`} alt={s.ho_ten}
      className={`${sz} rounded-full object-cover flex-shrink-0`}
      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
  )
  return (
    <div className={`${sz} rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-700 font-semibold text-xs`}>
      {(s?.ho_ten || '?').charAt(0)}
    </div>
  )
}

// ── Class Detail Modal ───────────────────────────────────────────────────────
function ClassDetailModal({ classId, onClose, onEdit, onDelete }) {
  const [cls, setCls] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('students')

  // Enroll tab
  const [allStudents, setAllStudents] = useState([])
  const [addSearch, setAddSearch] = useState('')
  const [enrolling, setEnrolling] = useState(null)
  const [removing, setRemoving] = useState(null)

  // Attendance tab
  const [attMonth, setAttMonth] = useState(currentMonth())
  const [attSummary, setAttSummary] = useState([])
  const [attLoading, setAttLoading] = useState(false)

  // Results tab
  const [ky, setKy] = useState('')
  const [results, setResults] = useState([])
  const [resultLoading, setResultLoading] = useState(false)
  const [editingResult, setEditingResult] = useState(null) // {student_id, diem_so, nhan_xet, id?}
  const [savingResult, setSavingResult] = useState(false)

  useEffect(() => {
    if (!classId) return
    loadClass()
    loadAllStudents()
  }, [classId])

  useEffect(() => {
    if (tab === 'attendance' && classId) loadAttendance()
  }, [tab, attMonth, classId])

  useEffect(() => {
    if (tab === 'results' && classId) loadResults()
  }, [tab, classId])

  const loadClass = async () => {
    setLoading(true)
    try {
      const res = await classService.getById(classId)
      setCls(res?.data || res)
    } catch { toast.error('Không thể tải thông tin lớp') }
    finally { setLoading(false) }
  }

  const loadAllStudents = async () => {
    try {
      const res = await studentService.getAll({ trang_thai: 'dang_hoc' })
      setAllStudents(res?.data || res || [])
    } catch {}
  }

  const loadAttendance = async () => {
    setAttLoading(true)
    try {
      const res = await attendanceService.getSummary({ class_id: classId, thang: attMonth })
      setAttSummary(res?.data || res || [])
    } catch { toast.error('Không thể tải dữ liệu điểm danh') }
    finally { setAttLoading(false) }
  }

  const loadResults = async () => {
    setResultLoading(true)
    try {
      const res = await resultService.getAll({ class_id: classId, ky: ky || undefined })
      setResults(res?.data || res || [])
    } catch { toast.error('Không thể tải kết quả học tập') }
    finally { setResultLoading(false) }
  }

  const handleEnroll = async (studentId, action) => {
    if (action === 'add') setEnrolling(studentId)
    else setRemoving(studentId)
    try {
      await studentService.enroll(studentId, { class_id: classId, action })
      toast.success(action === 'add' ? 'Đã thêm học sinh vào lớp' : 'Đã xóa học sinh khỏi lớp')
      await loadClass()
    } catch (err) {
      toast.error(err.message || 'Có lỗi xảy ra')
    } finally {
      setEnrolling(null); setRemoving(null)
    }
  }

  const handleSaveResult = async () => {
    if (!editingResult) return
    if (editingResult.diem_so === '' || editingResult.diem_so === undefined) {
      toast.error('Vui lòng nhập điểm số'); return
    }
    const score = parseFloat(editingResult.diem_so)
    if (isNaN(score) || score < 0 || score > 10) {
      toast.error('Điểm số phải từ 0 đến 10'); return
    }
    setSavingResult(true)
    try {
      const payload = {
        student_id: editingResult.student_id,
        class_id: classId,
        ky: ky || 'Chưa phân loại',
        diem_so: score,
        nhan_xet: editingResult.nhan_xet || '',
      }
      if (editingResult.id) {
        await resultService.update(editingResult.id, payload)
      } else {
        await resultService.create(payload)
      }
      toast.success('Đã lưu kết quả')
      setEditingResult(null)
      loadResults()
    } catch (err) {
      toast.error(err.message || 'Không thể lưu kết quả')
    } finally {
      setSavingResult(false)
    }
  }

  const handleDeleteResult = async (id) => {
    try {
      await resultService.delete(id)
      toast.success('Đã xóa kết quả')
      loadResults()
    } catch (err) {
      toast.error(err.message || 'Không thể xóa')
    }
  }

  // Students NOT yet enrolled (active enrollment)
  const enrolledIds = useMemo(() => new Set((cls?.students || []).filter(s => s.trang_thai === 'dang_hoc').map(s => s.id)), [cls])
  const availableToAdd = useMemo(() => {
    const q = addSearch.toLowerCase()
    return allStudents.filter(s => !enrolledIds.has(s.id) &&
      (!q || (s.ho_ten || '').toLowerCase().includes(q) || (s.biet_danh || '').toLowerCase().includes(q))
    )
  }, [allStudents, enrolledIds, addSearch])

  // Results indexed by student_id for quick lookup
  const resultByStudent = useMemo(() => {
    const map = {}
    results.forEach(r => { map[r.student_id] = r })
    return map
  }, [results])

  const attendingStudents = cls?.students?.filter(s => s.trang_thai === 'dang_hoc') || []

  const attRate = (row) => {
    const total = (row.co_mat || 0) + (row.vang_mat || 0) + (row.vang_phep || 0)
    if (!total) return null
    return Math.round((row.co_mat / total) * 100)
  }

  return (
    <Dialog.Root open={!!classId} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            {loading || !cls ? (
              <div className="h-8 w-48 bg-gray-100 animate-pulse rounded-lg" />
            ) : (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={16} className="text-indigo-600" />
                  </div>
                  <Dialog.Title className="font-bold text-gray-900 text-lg truncate">{cls.ten_lop}</Dialog.Title>
                </div>
                <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-gray-500 ml-10">
                  {(cls.hoc_ky || cls.nam_hoc) && (
                    <span className="flex items-center gap-1 font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {[cls.hoc_ky, cls.nam_hoc].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {(cls.thang_bat_dau || cls.thang_ket_thuc) && (
                    <span className="flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <Calendar size={10} />
                      {fmtMonth(cls.thang_bat_dau) || '?'} → {fmtMonth(cls.thang_ket_thuc) || '?'}
                    </span>
                  )}
                  {cls.ten_giao_vien && <span className="flex items-center gap-1"><GraduationCap size={12} />{cls.ten_giao_vien}</span>}
                  {cls.lich_hoc && <span className="flex items-center gap-1"><Calendar size={12} />{cls.lich_hoc}</span>}
                  {cls.hoc_phi_thang && <span className="font-medium text-indigo-600">{fmtCurrency(cls.hoc_phi_thang)}/tháng</span>}
                </div>
              </div>
            )}
            <div className="flex items-center gap-1 ml-3 flex-shrink-0">
              {cls && <>
                <button onClick={() => { onClose(); onEdit(cls) }}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Chỉnh sửa">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => { onClose(); onDelete(cls.id) }}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Xóa lớp">
                  <Trash2 size={16} />
                </button>
              </>}
              <Dialog.Close asChild>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Tabs */}
          <Tabs.Root value={tab} onValueChange={setTab} className="flex flex-col flex-1 min-h-0">
            <Tabs.List className="flex border-b border-gray-100 px-6 flex-shrink-0 bg-white">
              {[
                { v: 'students', label: 'Học sinh', icon: <Users size={14} /> },
                { v: 'attendance', label: 'Điểm danh', icon: <ClipboardCheck size={14} /> },
                { v: 'results', label: 'Kết quả', icon: <BarChart2 size={14} /> },
              ].map(t => (
                <Tabs.Trigger key={t.v} value={t.v}
                  className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-gray-500 border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 transition-colors">
                  {t.icon}{t.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            {/* ── TAB: STUDENTS ── */}
            <Tabs.Content value="students" className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-indigo-600" /></div>
              ) : (
                <>
                  {/* Enrolled list */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                        <Users size={14} className="text-indigo-500" />
                        Học sinh đang học
                        <span className="ml-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{attendingStudents.length}</span>
                      </h3>
                    </div>
                    {attendingStudents.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-xl">
                        Chưa có học sinh nào trong lớp
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {attendingStudents.map(s => (
                          <div key={s.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-2.5 hover:border-indigo-200 transition-colors">
                            <div className="flex items-center gap-3">
                              <StudentAvatar s={s} size={8} />
                              <div>
                                <p className="text-sm font-medium text-gray-800">{s.ho_ten}</p>
                                <p className="text-xs text-gray-400">
                                  {s.biet_danh && `"${s.biet_danh}" · `}
                                  {s.sdt_phu_huynh || ''}
                                  {s.ngay_vao && ` · Vào lớp: ${fmtDate(s.ngay_vao)}`}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleEnroll(s.id, 'remove')}
                              disabled={removing === s.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              {removing === s.id ? <Loader2 size={12} className="animate-spin" /> : <UserMinus size={12} />}
                              Xóa khỏi lớp
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Students with nghi_hoc status */}
                    {(cls?.students || []).filter(s => s.trang_thai !== 'dang_hoc').length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-400 mb-2 font-medium">Đã nghỉ</p>
                        <div className="space-y-1.5">
                          {cls.students.filter(s => s.trang_thai !== 'dang_hoc').map(s => (
                            <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2 opacity-60">
                              <div className="flex items-center gap-3">
                                <StudentAvatar s={s} size={7} />
                                <span className="text-sm text-gray-600">{s.ho_ten}</span>
                              </div>
                              <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">Đã nghỉ</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Add student */}
                  <div className="border-t border-gray-100 pt-5">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-3">
                      <UserPlus size={14} className="text-green-500" />
                      Thêm học sinh vào lớp
                    </h3>
                    <div className="relative mb-3">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        placeholder="Tìm học sinh theo tên, biệt danh..."
                        value={addSearch}
                        onChange={e => setAddSearch(e.target.value)}
                        className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                    {availableToAdd.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">
                        {addSearch ? 'Không tìm thấy học sinh phù hợp' : 'Tất cả học sinh đang học đều đã trong lớp'}
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-52 overflow-y-auto">
                        {availableToAdd.slice(0, 20).map(s => (
                          <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 hover:bg-indigo-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <StudentAvatar s={s} size={7} />
                              <div>
                                <p className="text-sm font-medium text-gray-800">{s.ho_ten}</p>
                                {s.biet_danh && <p className="text-xs text-gray-400">"{s.biet_danh}"</p>}
                              </div>
                            </div>
                            <button
                              onClick={() => handleEnroll(s.id, 'add')}
                              disabled={enrolling === s.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                            >
                              {enrolling === s.id ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                              Thêm vào lớp
                            </button>
                          </div>
                        ))}
                        {availableToAdd.length > 20 && (
                          <p className="text-xs text-gray-400 text-center py-1">Gõ tên để thu hẹp kết quả ({availableToAdd.length} học sinh)</p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </Tabs.Content>

            {/* ── TAB: ATTENDANCE ── */}
            <Tabs.Content value="attendance" className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <ClipboardCheck size={14} className="text-indigo-500" />
                  Thống kê điểm danh
                </h3>
                <input
                  type="month"
                  value={attMonth}
                  onChange={e => setAttMonth(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              {attLoading ? (
                <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-indigo-600" /></div>
              ) : attSummary.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm bg-gray-50 rounded-xl">
                  <ClipboardCheck size={32} className="mx-auto mb-2 text-gray-200" />
                  Chưa có dữ liệu điểm danh tháng này
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Học sinh</th>
                        <th className="text-center px-3 py-3 font-semibold text-green-600">Có mặt</th>
                        <th className="text-center px-3 py-3 font-semibold text-yellow-600">Vắng phép</th>
                        <th className="text-center px-3 py-3 font-semibold text-red-600">Vắng mặt</th>
                        <th className="text-center px-3 py-3 font-semibold text-gray-600">Tỉ lệ dự học</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attSummary.map((row, idx) => {
                        const rate = attRate(row)
                        return (
                          <tr key={row.student_id} className={`border-b border-gray-50 ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                            <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-800">{row.ho_ten}</p>
                              {row.biet_danh && <p className="text-xs text-gray-400">"{row.biet_danh}"</p>}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="font-semibold text-green-600">{row.co_mat || 0}</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="font-semibold text-yellow-600">{row.vang_phep || 0}</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="font-semibold text-red-600">{row.vang_mat || 0}</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              {rate !== null ? (
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${rate >= 80 ? 'bg-green-500' : rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                      style={{ width: `${rate}%` }}
                                    />
                                  </div>
                                  <span className={`text-xs font-semibold ${rate >= 80 ? 'text-green-600' : rate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {rate}%
                                  </span>
                                </div>
                              ) : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Tabs.Content>

            {/* ── TAB: RESULTS ── */}
            <Tabs.Content value="results" className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Star size={14} className="text-indigo-500" />
                  Kết quả học tập
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Học kỳ (VD: HK1 2024-2025)"
                    value={ky}
                    onChange={e => setKy(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <button
                    onClick={loadResults}
                    className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    Tải
                  </button>
                </div>
              </div>

              {resultLoading ? (
                <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-indigo-600" /></div>
              ) : attendingStudents.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm bg-gray-50 rounded-xl">Chưa có học sinh trong lớp</div>
              ) : (
                <>
                  {/* Edit result inline form */}
                  {editingResult && (
                    <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-indigo-800 mb-3">
                        Nhập kết quả: <span className="text-indigo-600">{editingResult.ho_ten}</span>
                      </p>
                      <div className="flex flex-wrap gap-3 items-end">
                        <div>
                          <label className="text-xs text-gray-600 font-medium block mb-1">Điểm số (0-10)</label>
                          <input
                            type="number" min="0" max="10" step="0.1"
                            value={editingResult.diem_so}
                            onChange={e => setEditingResult(r => ({ ...r, diem_so: e.target.value }))}
                            className="border border-indigo-200 rounded-xl px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            placeholder="8.5"
                          />
                        </div>
                        <div className="flex-1 min-w-40">
                          <label className="text-xs text-gray-600 font-medium block mb-1">Nhận xét</label>
                          <input
                            value={editingResult.nhan_xet || ''}
                            onChange={e => setEditingResult(r => ({ ...r, nhan_xet: e.target.value }))}
                            className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            placeholder="Nhận xét học sinh..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingResult(null)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600">Hủy</button>
                          <button onClick={handleSaveResult} disabled={savingResult}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-60">
                            {savingResult && <Loader2 size={13} className="animate-spin" />}
                            Lưu
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-600">Học sinh</th>
                          <th className="text-center px-3 py-3 font-semibold text-gray-600">Điểm</th>
                          <th className="text-center px-3 py-3 font-semibold text-gray-600">Xếp loại</th>
                          <th className="text-left px-3 py-3 font-semibold text-gray-600 hidden md:table-cell">Nhận xét</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-600">Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendingStudents.map((s, idx) => {
                          const r = resultByStudent[s.id]
                          return (
                            <tr key={s.id} className={`border-b border-gray-50 hover:bg-indigo-50/30 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                              <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <StudentAvatar s={s} size={7} />
                                  <div>
                                    <p className="font-medium text-gray-800">{s.ho_ten}</p>
                                    {s.biet_danh && <p className="text-xs text-gray-400">"{s.biet_danh}"</p>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center">
                                {r ? (
                                  <span className="font-bold text-lg text-gray-800">{r.diem_so}</span>
                                ) : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-3 py-3 text-center">
                                {r ? <XepLoaiBadge xl={r.xep_loai} /> : <span className="text-gray-300 text-xs">—</span>}
                              </td>
                              <td className="px-3 py-3 text-gray-500 text-xs hidden md:table-cell max-w-xs truncate">
                                {r?.nhan_xet || '—'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => setEditingResult({ student_id: s.id, ho_ten: s.ho_ten, diem_so: r?.diem_so ?? '', nhan_xet: r?.nhan_xet || '', id: r?.id })}
                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title={r ? 'Sửa điểm' : 'Nhập điểm'}
                                  >
                                    {r ? <Edit2 size={14} /> : <TrendingUp size={14} />}
                                  </button>
                                  {r && (
                                    <button
                                      onClick={() => handleDeleteResult(r.id)}
                                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Xóa điểm"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Tabs.Content>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ClassesPage() {
  const [classes, setClasses] = useState([])
  const [filtered, setFiltered] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterNamHoc, setFilterNamHoc] = useState('')
  const [filterHocKy, setFilterHocKy] = useState('')

  const [viewId, setViewId] = useState(null)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    let result = classes
    if (filterNamHoc) result = result.filter(c => c.nam_hoc === filterNamHoc)
    if (filterHocKy)  result = result.filter(c => c.hoc_ky === filterHocKy)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        (c.ten_lop || '').toLowerCase().includes(q) ||
        (c.mo_ta || '').toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [classes, search, filterNamHoc, filterHocKy])

  const namHocList = useMemo(() => [...new Set(classes.map(c => c.nam_hoc).filter(Boolean))].sort().reverse(), [classes])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [classRes, teacherRes] = await Promise.allSettled([classService.getAll(), teacherService.getAll()])
      const cls = classRes.status === 'fulfilled' ? (classRes.value?.data || classRes.value || []) : []
      const tch = teacherRes.status === 'fulfilled' ? (teacherRes.value?.data || teacherRes.value || []) : []
      setClasses(Array.isArray(cls) ? cls : [])
      setTeachers(Array.isArray(tch) ? tch : [])
    } catch { toast.error('Không thể tải dữ liệu lớp học') }
    finally { setLoading(false) }
  }

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setOpen(true) }

  const openEdit = (c) => {
    setEditing(c)
    setForm({ ten_lop: c.ten_lop || '', mo_ta: c.mo_ta || '', hoc_phi_thang: c.hoc_phi_thang || '', teacher_id: c.teacher_id || '', lich_hoc: c.lich_hoc || '', hoc_ky: c.hoc_ky || 'HK1', nam_hoc: c.nam_hoc || currentNamHoc(), thang_bat_dau: c.thang_bat_dau || '', thang_ket_thuc: c.thang_ket_thuc || '' })
    setOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.ten_lop.trim()) { toast.error('Vui lòng nhập tên lớp'); return }
    setSaving(true)
    try {
      const payload = { ...form, hoc_phi_thang: form.hoc_phi_thang ? Number(form.hoc_phi_thang) : null, teacher_id: form.teacher_id ? Number(form.teacher_id) : null, hoc_ky: form.hoc_ky || null, nam_hoc: form.nam_hoc || null, thang_bat_dau: form.thang_bat_dau || null, thang_ket_thuc: form.thang_ket_thuc || null }
      if (editing) { await classService.update(editing.id, payload); toast.success('Cập nhật lớp học thành công') }
      else { await classService.create(payload); toast.success('Thêm lớp học thành công') }
      setOpen(false); fetchAll()
    } catch (err) { toast.error(err.message || 'Có lỗi xảy ra') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await classService.delete(deleteId)
      toast.success('Xóa lớp học thành công')
      setDeleteId(null); fetchAll()
    } catch (err) { toast.error(err.message || 'Không thể xóa lớp học') }
    finally { setDeleting(false) }
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Layout title="Quản lý lớp học">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <p className="text-gray-500 text-sm">Tổng cộng {filtered.length} lớp học</p>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm">
          <Plus size={18} /> Thêm lớp học
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Tìm theo tên lớp, mô tả..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <select value={filterNamHoc} onChange={e => setFilterNamHoc(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-36">
            <option value="">Tất cả năm học</option>
            {namHocList.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterHocKy} onChange={e => setFilterHocKy(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-28">
            <option value="">Tất cả HK</option>
            {HOC_KY_OPTIONS.map(hk => <option key={hk} value={hk}>{hk}</option>)}
          </select>
          {(filterNamHoc || filterHocKy) && (
            <button onClick={() => { setFilterNamHoc(''); setFilterHocKy('') }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <X size={14} /> Bỏ lọc
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-indigo-600">
          <Loader2 size={22} className="animate-spin" /><span className="text-sm">Đang tải dữ liệu...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl py-20 text-center text-gray-400 text-sm shadow-sm border border-gray-100">
          <BookOpen size={40} className="mx-auto mb-2 text-gray-200" />Không tìm thấy lớp học nào
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
              onClick={() => setViewId(c.id)}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 transition-colors">
                    <BookOpen size={18} className="text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-800 text-sm group-hover:text-indigo-700 transition-colors truncate">{c.ten_lop}</h3>
                    <p className="text-xs text-gray-400 truncate">{c.mo_ta || 'Không có mô tả'}</p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(c)}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => setDeleteId(c.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {(c.hoc_ky || c.nam_hoc || c.thang_bat_dau) && (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {c.hoc_ky && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{c.hoc_ky}</span>}
                  {c.nam_hoc && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{c.nam_hoc}</span>}
                  {(c.thang_bat_dau || c.thang_ket_thuc) && (
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <Calendar size={9} />
                      {fmtMonth(c.thang_bat_dau) || '?'} → {fmtMonth(c.thang_ket_thuc) || '?'}
                    </span>
                  )}
                </div>
              )}
              <div className="space-y-1.5 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1"><Users size={11} />Học sinh:</span>
                  <span className="font-semibold text-gray-700">{c.so_hoc_sinh || 0} em</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1"><GraduationCap size={11} />Giáo viên:</span>
                  <span className="font-medium text-gray-700 truncate max-w-28">{c.ten_giao_vien || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Học phí/tháng:</span>
                  <span className="font-medium text-indigo-600">{fmtCurrency(c.hoc_phi_thang)}</span>
                </div>
                {c.lich_hoc && (
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1"><Calendar size={11} />Lịch học:</span>
                    <span className="font-medium text-gray-700 truncate max-w-32">{c.lich_hoc}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 text-xs text-indigo-500 font-medium text-center opacity-0 group-hover:opacity-100 transition-opacity">
                Nhấn để xem chi tiết & quản lý →
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Class Detail Modal */}
      <ClassDetailModal
        classId={viewId}
        onClose={() => setViewId(null)}
        onEdit={c => openEdit(c)}
        onDelete={id => setDeleteId(id)}
      />

      {/* Add/Edit Modal */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" />
          <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <Dialog.Title className="text-base font-semibold text-gray-800">
                {editing ? 'Chỉnh sửa lớp học' : 'Thêm lớp học mới'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
              </Dialog.Close>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tên lớp <span className="text-red-500">*</span></label>
                <input value={form.ten_lop} onChange={e => setField('ten_lop', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Lớp Toán 10A" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mô tả</label>
                <textarea value={form.mo_ta} onChange={e => setField('mo_ta', e.target.value)} rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  placeholder="Mô tả lớp học..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Học phí/tháng (đ)</label>
                  <input type="number" min="0" value={form.hoc_phi_thang} onChange={e => setField('hoc_phi_thang', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="500000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Giáo viên</label>
                  <select value={form.teacher_id} onChange={e => setField('teacher_id', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="">-- Chọn giáo viên --</option>
                    {teachers.filter(t => t.trang_thai === 'dang_day').map(t => (
                      <option key={t.id} value={t.id}>{t.ho_ten}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Lịch học</label>
                <input value={form.lich_hoc} onChange={e => setField('lich_hoc', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Thứ 2, 4, 6 - 18:00-20:00" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Học kỳ</label>
                  <select value={form.hoc_ky} onChange={e => setField('hoc_ky', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {HOC_KY_OPTIONS.map(hk => <option key={hk} value={hk}>{hk}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Năm học</label>
                  <input value={form.nam_hoc} onChange={e => setField('nam_hoc', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="2025-2026" />
                </div>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                  <Calendar size={12} /> Thời gian hoạt động
                  <span className="font-normal text-indigo-400">(dùng tính học phí theo tháng)</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Tháng bắt đầu</label>
                    <input type="month" value={form.thang_bat_dau} onChange={e => setField('thang_bat_dau', e.target.value)}
                      className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Tháng kết thúc</label>
                    <input type="month" value={form.thang_ket_thuc} onChange={e => setField('thang_ket_thuc', e.target.value)}
                      min={form.thang_bat_dau || undefined}
                      className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
                  </div>
                </div>
                {form.thang_bat_dau && form.thang_ket_thuc && form.thang_bat_dau <= form.thang_ket_thuc && (() => {
                  const [by, bm] = form.thang_bat_dau.split('-').map(Number)
                  const [ey, em] = form.thang_ket_thuc.split('-').map(Number)
                  const months = (ey - by) * 12 + (em - bm) + 1
                  return (
                    <p className="text-xs text-indigo-600 font-medium">
                      Tổng {months} tháng · {fmtMonth(form.thang_bat_dau)} → {fmtMonth(form.thang_ket_thuc)}
                    </p>
                  )
                })()}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Dialog.Close asChild>
                  <button type="button" className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Hủy</button>
                </Dialog.Close>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-60">
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  {editing ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirm */}
      <Dialog.Root open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" />
          <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={20} className="text-red-600" />
              </div>
              <div>
                <Dialog.Title className="font-semibold text-gray-800 text-sm">Xác nhận xóa</Dialog.Title>
                <p className="text-gray-500 text-sm mt-1">Bạn có chắc chắn muốn xóa lớp học này? Toàn bộ dữ liệu liên quan sẽ bị xóa.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600">Hủy</button>
              </Dialog.Close>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-60">
                {deleting && <Loader2 size={14} className="animate-spin" />} Xóa
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Layout>
  )
}
