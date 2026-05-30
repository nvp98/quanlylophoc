import { useState, useEffect, useMemo } from 'react'
import { Layout } from '../components/Layout'
import {
  Plus, Edit2, Trash2, X, AlertCircle, Loader2,
  TrendingUp, TrendingDown, DollarSign, CheckCircle,
  Users, BookOpen, ChevronDown, ChevronRight, Clock,
  GraduationCap, Banknote, Phone,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import financeService from '../services/financeService'
import studentService from '../services/studentService'
import classService from '../services/classService'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3001'

const EMPTY_FORM = {
  loai: 'thu', danh_muc: 'hoc_phi', mo_ta: '', so_tien: '',
  student_id: '', class_id: '',
  ngay_giao_dich: format(new Date(), 'yyyy-MM-dd'),
}

const formatCurrency = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0)

function SummaryCard({ title, value, icon: Icon, color }) {
  return (
    <div className={`rounded-2xl p-5 ${color} flex items-center gap-4`}>
      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-white/80">{title}</p>
        <p className="text-xl font-bold text-white mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function StudentAvatar({ s, size = 7 }) {
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

// ── Class Tuition Card ───────────────────────────────────────────────────────
function ClassTuitionCard({ cls, month, onQuickCollect, onBulkCollect }) {
  const [expanded, setExpanded] = useState(true)
  const [collecting, setCollecting] = useState(false)
  const [bulkCollecting, setBulkCollecting] = useState(false)

  // inline confirm state
  const [confirmStudent, setConfirmStudent] = useState(null) // { student_id, so_tien, ghi_chu }
  const [bulkConfirm, setBulkConfirm]       = useState(null) // { so_tien, ghi_chu }

  const unpaidStudents = cls.students.filter(s => !s.da_dong)
  const paidStudents   = cls.students.filter(s => s.da_dong)
  const allPaid = unpaidStudents.length === 0

  const openConfirm = (s) => {
    setBulkConfirm(null)
    setConfirmStudent({ student_id: s.student_id, ho_ten: s.ho_ten, so_tien: String(cls.hoc_phi_thang || ''), ghi_chu: '' })
  }

  const handleConfirm = async () => {
    if (!confirmStudent) return
    const so_tien = Number(confirmStudent.so_tien)
    if (!so_tien || so_tien <= 0) return
    setCollecting(true)
    try {
      await onQuickCollect(
        { student_id: confirmStudent.student_id, ho_ten: confirmStudent.ho_ten },
        cls, so_tien, confirmStudent.ghi_chu
      )
      setConfirmStudent(null)
    } finally { setCollecting(false) }
  }

  const openBulkConfirm = (e) => {
    e.stopPropagation()
    setConfirmStudent(null)
    setBulkConfirm({ so_tien: String(cls.hoc_phi_thang || ''), ghi_chu: '' })
  }

  const handleBulk = async () => {
    if (!bulkConfirm) return
    const so_tien = Number(bulkConfirm.so_tien)
    if (!so_tien || so_tien <= 0) return
    setBulkCollecting(true)
    try {
      await onBulkCollect(cls, unpaidStudents.map(s => s.student_id), so_tien, bulkConfirm.ghi_chu)
      setBulkConfirm(null)
    } finally { setBulkCollecting(false) }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Card header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <BookOpen size={16} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-800 text-sm">{cls.ten_lop}</h3>
              {(cls.hoc_ky || cls.nam_hoc) && (
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                  {[cls.hoc_ky, cls.nam_hoc].filter(Boolean).join(' · ')}
                </span>
              )}
              {(cls.thang_bat_dau || cls.thang_ket_thuc) && (
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                  {[cls.thang_bat_dau, cls.thang_ket_thuc].filter(Boolean).map(m => {
                    try { return m.slice(5, 7) + '/' + m.slice(0, 4) } catch { return m }
                  }).join(' → ')}
                </span>
              )}
              <span className="text-xs font-medium text-indigo-700">{formatCurrency(cls.hoc_phi_thang)}/tháng</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
              <span className="flex items-center gap-1 text-green-600 font-medium">
                <CheckCircle size={11} />{cls.da_dong}/{cls.tong} đã đóng
              </span>
              {cls.chua_dong > 0 && (
                <span className="flex items-center gap-1 text-orange-500 font-medium">
                  <Clock size={11} />{cls.chua_dong} chưa đóng
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {/* Progress pill */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${allPaid ? 'bg-green-500' : 'bg-indigo-500'}`}
                style={{ width: `${cls.tong ? Math.round((cls.da_dong / cls.tong) * 100) : 0}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-8 text-right">
              {cls.tong ? Math.round((cls.da_dong / cls.tong) * 100) : 0}%
            </span>
          </div>
          {!allPaid && !bulkConfirm && (
            <button
              onClick={openBulkConfirm}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              <CheckCircle size={11} />
              Thu tất cả ({cls.chua_dong})
            </button>
          )}
          {allPaid && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <CheckCircle size={13} /> Đã thu đủ
            </span>
          )}
          {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        </div>
      </div>

      {/* Bulk confirm bar */}
      {bulkConfirm && (
        <div className="border-t border-emerald-100 bg-emerald-50 px-5 py-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-emerald-800">
            Thu {unpaidStudents.length} học sinh chưa đóng:
          </span>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-emerald-700">Số tiền/người:</label>
            <input
              type="number" min="0"
              value={bulkConfirm.so_tien}
              onChange={e => setBulkConfirm(v => ({ ...v, so_tien: e.target.value }))}
              className="w-32 border border-emerald-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
              placeholder={String(cls.hoc_phi_thang)}
            />
          </div>
          <div className="flex items-center gap-1.5 flex-1 min-w-40">
            <label className="text-xs text-emerald-700">Ghi chú:</label>
            <input
              value={bulkConfirm.ghi_chu}
              onChange={e => setBulkConfirm(v => ({ ...v, ghi_chu: e.target.value }))}
              className="flex-1 border border-emerald-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
              placeholder={`Học phí ${cls.ten_lop} tháng ${month}`}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setBulkConfirm(null)}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-white text-gray-600 transition-colors">
              Hủy
            </button>
            <button onClick={handleBulk} disabled={bulkCollecting || !bulkConfirm.so_tien}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-60">
              {bulkCollecting ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
              Xác nhận thu
            </button>
          </div>
        </div>
      )}

      {/* Student list */}
      {expanded && (
        <div className="border-t border-gray-50">
          {cls.students.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs">Chưa có học sinh trong lớp</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {/* Unpaid first */}
              {unpaidStudents.map(s => (
                <div key={s.student_id}>
                  <div className={`flex items-center justify-between px-5 py-3 transition-colors ${confirmStudent?.student_id === s.student_id ? 'bg-indigo-50' : 'hover:bg-orange-50/40'}`}>
                    <div className="flex items-center gap-3">
                      <StudentAvatar s={s} size={7} />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.ho_ten}</p>
                        {s.biet_danh && <p className="text-xs text-gray-400">"{s.biet_danh}"</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
                        Chưa đóng
                      </span>
                      <span className="text-sm font-semibold text-gray-700">{formatCurrency(cls.hoc_phi_thang)}</span>
                      {confirmStudent?.student_id === s.student_id ? (
                        <button onClick={() => setConfirmStudent(null)}
                          className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-white text-gray-500">
                          <X size={12} />
                        </button>
                      ) : (
                        <button
                          onClick={() => openConfirm(s)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                        >
                          <Plus size={11} /> Thu
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Inline confirm form */}
                  {confirmStudent?.student_id === s.student_id && (
                    <div className="mx-5 mb-3 bg-white border border-indigo-200 rounded-xl px-4 py-3 shadow-sm">
                      <p className="text-xs font-semibold text-indigo-700 mb-2">
                        Thu học phí — {s.ho_ten}
                      </p>
                      <div className="flex flex-wrap gap-3 items-end">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Số tiền (đ)</label>
                          <input
                            type="number" min="0"
                            value={confirmStudent.so_tien}
                            onChange={e => setConfirmStudent(v => ({ ...v, so_tien: e.target.value }))}
                            className="w-36 border border-indigo-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            autoFocus
                          />
                        </div>
                        <div className="flex-1 min-w-40">
                          <label className="text-xs text-gray-500 block mb-1">Ghi chú</label>
                          <input
                            value={confirmStudent.ghi_chu}
                            onChange={e => setConfirmStudent(v => ({ ...v, ghi_chu: e.target.value }))}
                            placeholder={`Học phí ${cls.ten_lop} tháng ${month}`}
                            className="w-full border border-indigo-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setConfirmStudent(null)}
                            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                            Hủy
                          </button>
                          <button onClick={handleConfirm} disabled={collecting || !confirmStudent.so_tien}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-60 transition-colors">
                            {collecting ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                            Xác nhận
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {/* Paid */}
              {paidStudents.map(s => (
                <div key={s.student_id} className="flex items-center justify-between px-5 py-3 opacity-60">
                  <div className="flex items-center gap-3">
                    <StudentAvatar s={s} size={7} />
                    <div>
                      <p className="text-sm font-medium text-gray-700">{s.ho_ten}</p>
                      {s.biet_danh && <p className="text-xs text-gray-400">"{s.biet_danh}"</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                      Đã đóng
                    </span>
                    <span className="text-sm font-semibold text-green-700">{formatCurrency(s.so_tien_dong || cls.hoc_phi_thang)}</span>
                    {s.ngay_dong && (
                      <span className="text-xs text-gray-400 hidden sm:block">
                        {format(new Date(s.ngay_dong), 'dd/MM')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Teacher Salary Card ──────────────────────────────────────────────────────
function TeacherSalaryCard({ teacher, month, onPay, onDelete }) {
  const [confirm, setConfirm] = useState(null) // { so_tien, ghi_chu }
  const [paying, setPaying] = useState(false)

  const openConfirm = () => setConfirm({
    so_tien: teacher.tong_luong > 0 ? String(teacher.tong_luong) : '',
    ghi_chu: '',
  })

  const handlePay = async () => {
    const so_tien = Number(confirm.so_tien)
    if (!so_tien || so_tien <= 0) return
    setPaying(true)
    try {
      await onPay(teacher, so_tien, confirm.ghi_chu)
      setConfirm(null)
    } finally { setPaying(false) }
  }

  const paid = teacher.da_tra

  return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${paid ? 'border-gray-100' : 'border-orange-100'}`}>
      <div className="flex items-start justify-between px-5 py-4">
        {/* Left: teacher info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${paid ? 'bg-green-100' : 'bg-orange-100'}`}>
            <GraduationCap size={18} className={paid ? 'text-green-600' : 'text-orange-600'} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-800 text-sm">{teacher.ho_ten}</h3>
              {teacher.sdt && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Phone size={10} />{teacher.sdt}
                </span>
              )}
            </div>
            {/* Buổi breakdown */}
            <div className="mt-1 space-y-0.5">
              {teacher.lops.length === 0 ? (
                <p className="text-xs text-gray-400">Chưa có buổi dạy nào tháng này</p>
              ) : (
                teacher.lops.map(lop => (
                  <p key={lop.class_id} className="text-xs text-gray-500">
                    {lop.ten_lop}: <span className="font-medium text-gray-700">{lop.so_buoi} buổi</span>
                    <span className="text-gray-400"> × {formatCurrency(teacher.luong_buoi)} = </span>
                    <span className="font-medium text-indigo-600">{formatCurrency(lop.so_buoi * teacher.luong_buoi)}</span>
                  </p>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: total + action */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">
              {teacher.tong_buoi} buổi × {formatCurrency(teacher.luong_buoi)}
            </p>
            <p className={`text-base font-bold ${paid ? 'text-green-700' : 'text-orange-700'}`}>
              {formatCurrency(paid ? teacher.so_tien_da_tra : teacher.tong_luong)}
            </p>
          </div>
          {paid ? (
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                <CheckCircle size={11} /> Đã trả
              </span>
              {teacher.ngay_tra && (
                <span className="text-xs text-gray-400">
                  {format(new Date(teacher.ngay_tra), 'dd/MM/yyyy')}
                </span>
              )}
              <button
                onClick={() => onDelete(teacher.finance_id)}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
                title="Hủy khoản đã trả"
              >
                Hủy
              </button>
            </div>
          ) : (
            <div>
              {confirm ? (
                <button onClick={() => setConfirm(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg">
                  <X size={14} />
                </button>
              ) : (
                <button
                  onClick={openConfirm}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  <Banknote size={12} /> Trả lương
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inline pay form */}
      {confirm && !paid && (
        <div className="border-t border-indigo-100 bg-indigo-50 px-5 py-3 space-y-2">
          {teacher.tong_buoi === 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
              <AlertCircle size={12} />
              Chưa có dữ liệu điểm danh tháng này — vui lòng nhập số tiền thủ công
            </p>
          )}
          <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-indigo-700 font-medium block mb-1">
              Số tiền trả (đ) <span className="text-red-500">*</span>
            </label>
            <input
              type="number" min="0"
              value={confirm.so_tien}
              onChange={e => setConfirm(v => ({ ...v, so_tien: e.target.value }))}
              className="w-44 border border-indigo-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              placeholder="Nhập số tiền..."
              autoFocus
            />
            {teacher.tong_luong > 0 && (
              <button
                type="button"
                onClick={() => setConfirm(v => ({ ...v, so_tien: String(teacher.tong_luong) }))}
                className="mt-1 text-xs text-indigo-500 hover:text-indigo-700 underline block"
              >
                Dùng số tính tự động ({formatCurrency(teacher.tong_luong)})
              </button>
            )}
          </div>
          <div className="flex-1 min-w-40">
            <label className="text-xs text-indigo-700 font-medium block mb-1">Ghi chú</label>
            <input
              value={confirm.ghi_chu}
              onChange={e => setConfirm(v => ({ ...v, ghi_chu: e.target.value }))}
              placeholder={`Lương ${teacher.ho_ten} tháng ${month}`}
              className="w-full border border-indigo-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              onKeyDown={e => e.key === 'Enter' && handlePay()}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setConfirm(null)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-white text-gray-600 transition-colors">
              Hủy
            </button>
            <button onClick={handlePay} disabled={paying || !confirm.so_tien}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-60 transition-colors">
              {paying ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
              Xác nhận trả
            </button>
          </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('thu_chi')
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))

  // Transactions tab
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)

  // Tuition status tab
  const [tuitionStatus, setTuitionStatus] = useState([])
  const [loadingTuition, setLoadingTuition] = useState(false)

  // Teacher salary tab
  const [teacherSalary, setTeacherSalary] = useState([])
  const [loadingTeacherSalary, setLoadingTeacherSalary] = useState(false)

  // Modal
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])

  // Delete
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchSupportData() }, [])

  useEffect(() => {
    if (activeTab === 'thu_chi')   fetchTransactions()
    if (activeTab === 'hoc_phi')   fetchTuitionStatus()
    if (activeTab === 'luong_gv')  fetchTeacherSalary()
  }, [activeTab, month])

  const fetchSupportData = async () => {
    try {
      const [sRes, cRes] = await Promise.allSettled([studentService.getAll(), classService.getAll()])
      const s = sRes.status === 'fulfilled' ? (sRes.value?.data || sRes.value || []) : []
      const c = cRes.status === 'fulfilled' ? (cRes.value?.data || cRes.value || []) : []
      setStudents(Array.isArray(s) ? s : [])
      setClasses(Array.isArray(c) ? c : [])
    } catch {}
  }

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const [txRes, sumRes] = await Promise.allSettled([
        financeService.getAll({ thang: month }),
        financeService.getSummary({ thang: month }),
      ])
      const tx = txRes.status === 'fulfilled' ? (txRes.value?.data || txRes.value || []) : []
      setTransactions(Array.isArray(tx) ? tx : [])
      setSummary(sumRes.status === 'fulfilled' ? sumRes.value?.data || sumRes.value : null)
    } catch { toast.error('Không thể tải dữ liệu tài chính') }
    finally { setLoading(false) }
  }

  const fetchTuitionStatus = async () => {
    setLoadingTuition(true)
    try {
      const res = await financeService.getTuitionStatus({ thang: month })
      setTuitionStatus(res?.data || [])
    } catch { toast.error('Không thể tải trạng thái học phí') }
    finally { setLoadingTuition(false) }
  }

  const fetchTeacherSalary = async () => {
    setLoadingTeacherSalary(true)
    try {
      const res = await financeService.getTeacherSalary({ thang: month })
      setTeacherSalary(res?.data || [])
    } catch { toast.error('Không thể tải dữ liệu lương giáo viên') }
    finally { setLoadingTeacherSalary(false) }
  }

  const handlePayTeacher = async (teacher, soTien, ghiChu) => {
    try {
      await financeService.create({
        loai: 'chi', danh_muc: 'luong_gv',
        teacher_id: teacher.teacher_id,
        so_tien: soTien,
        ngay: format(new Date(), 'yyyy-MM-dd'),
        mo_ta: ghiChu || `Lương ${teacher.ho_ten} tháng ${month}`,
      })
      toast.success(`Đã trả lương ${teacher.ho_ten}`)
      fetchTeacherSalary()
    } catch (err) { toast.error(err.message || 'Có lỗi xảy ra') }
  }

  const handleDeleteSalaryPayment = async (financeId) => {
    try {
      await financeService.delete(financeId)
      toast.success('Đã hủy khoản trả lương')
      fetchTeacherSalary()
    } catch (err) { toast.error(err.message || 'Không thể hủy') }
  }

  const openAdd = (prefill = {}) => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, ngay_giao_dich: format(new Date(), 'yyyy-MM-dd'), ...prefill })
    setOpen(true)
  }

  const openEdit = (t) => {
    setEditing(t)
    setForm({
      loai: t.loai || 'thu', danh_muc: t.danh_muc || 'hoc_phi',
      mo_ta: t.mo_ta || '', so_tien: t.so_tien || '',
      student_id: t.student_id || '', class_id: t.class_id || '',
      ngay_giao_dich: (t.ngay || t.ngay_giao_dich || '').slice(0, 10),
    })
    setOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.mo_ta.trim()) { toast.error('Vui lòng nhập mô tả'); return }
    if (!form.so_tien || Number(form.so_tien) <= 0) { toast.error('Vui lòng nhập số tiền hợp lệ'); return }
    setSaving(true)
    try {
      const payload = {
        loai: form.loai, danh_muc: form.danh_muc || 'hoc_phi',
        mo_ta: form.mo_ta, so_tien: Number(form.so_tien),
        student_id: form.student_id ? Number(form.student_id) : null,
        class_id: form.class_id ? Number(form.class_id) : null,
        ngay: form.ngay_giao_dich,
      }
      if (editing) {
        await financeService.update(editing.id, payload)
        toast.success('Cập nhật giao dịch thành công')
      } else {
        await financeService.create(payload)
        toast.success('Thêm giao dịch thành công')
      }
      setOpen(false)
      if (activeTab === 'thu_chi') fetchTransactions()
      else fetchTuitionStatus()
    } catch (err) { toast.error(err.message || 'Có lỗi xảy ra') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await financeService.delete(deleteId)
      toast.success('Xóa giao dịch thành công')
      setDeleteId(null); fetchTransactions()
    } catch (err) { toast.error(err.message || 'Không thể xóa giao dịch') }
    finally { setDeleting(false) }
  }

  // Quick collect one student for a class
  const handleQuickCollect = async (student, cls, customAmount, customNote) => {
    try {
      await financeService.create({
        loai: 'thu', danh_muc: 'hoc_phi',
        student_id: student.student_id,
        class_id: cls.class_id,
        so_tien: customAmount ?? cls.hoc_phi_thang,
        ngay: format(new Date(), 'yyyy-MM-dd'),
        mo_ta: customNote || `Học phí ${cls.ten_lop} tháng ${month}`,
      })
      toast.success(`Đã thu học phí của ${student.ho_ten}`)
      fetchTuitionStatus()
    } catch (err) { toast.error(err.message || 'Có lỗi xảy ra') }
  }

  // Bulk collect all unpaid in a class
  const handleBulkCollect = async (cls, studentIds, customAmount, customNote) => {
    if (!studentIds.length) return
    try {
      await financeService.bulkTuition({
        student_ids: studentIds,
        class_id: cls.class_id,
        thang: month,
        so_tien_tung_nguoi: customAmount || undefined,
        ghi_chu: customNote || undefined,
      })
      toast.success(`Thu học phí ${cls.ten_lop}: ${studentIds.length} học sinh`)
      fetchTuitionStatus()
    } catch (err) { toast.error(err.message || 'Có lỗi xảy ra') }
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // When class changes in form, auto-fill amount
  const handleClassChange = (classId) => {
    setField('class_id', classId)
    if (classId && form.loai === 'thu' && form.danh_muc === 'hoc_phi') {
      const cls = classes.find(c => String(c.id) === String(classId))
      if (cls?.hoc_phi_thang) setField('so_tien', String(cls.hoc_phi_thang))
    }
  }

  // Filter students: if class selected for tuition, show only enrolled students
  const filteredStudents = useMemo(() => {
    if (form.class_id && form.loai === 'thu' && form.danh_muc === 'hoc_phi') {
      // We don't have enrollment data readily, show all for now but hint class fee
      return students
    }
    return students
  }, [students, form.class_id, form.loai, form.danh_muc])

  const balance = (summary?.tong_thu || 0) - (summary?.tong_chi || 0)

  // Tuition summary stats
  const tuitionStats = useMemo(() => {
    const totalStudents = tuitionStatus.reduce((a, c) => a + c.tong, 0)
    const paidStudents  = tuitionStatus.reduce((a, c) => a + c.da_dong, 0)
    const unpaidStudents = tuitionStatus.reduce((a, c) => a + c.chua_dong, 0)
    const expectedTotal = tuitionStatus.reduce((a, c) => a + c.chua_dong * c.hoc_phi_thang, 0)
    return { totalStudents, paidStudents, unpaidStudents, expectedTotal }
  }, [tuitionStatus])

  return (
    <Layout title="Quản lý tài chính">
      {/* Tabs + Month picker */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {[
            { key: 'thu_chi',  label: 'Thu / Chi' },
            { key: 'hoc_phi',  label: 'Học phí theo lớp' },
            { key: 'luong_gv', label: 'Lương giáo viên' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.key ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
              {(() => {
                const unpaidHocPhi = tab.key === 'hoc_phi' && tuitionStats.unpaidStudents > 0 && activeTab !== 'hoc_phi'
                const unpaidLuong  = tab.key === 'luong_gv' && teacherSalary.filter(t => !t.da_tra && t.tong_buoi > 0).length > 0 && activeTab !== 'luong_gv'
                const badge = unpaidHocPhi ? tuitionStats.unpaidStudents : unpaidLuong ? teacherSalary.filter(t => !t.da_tra && t.tong_buoi > 0).length : 0
                return badge > 0 ? (
                  <span className="flex items-center gap-1.5">
                    {tab.label}
                    <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  </span>
                ) : tab.label
              })()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Tháng:</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
      </div>

      {/* ===== THU CHI TAB ===== */}
      {activeTab === 'thu_chi' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <SummaryCard title="Tổng thu" value={formatCurrency(summary?.tong_thu)} icon={TrendingUp} color="bg-emerald-500" />
            <SummaryCard title="Tổng chi" value={formatCurrency(summary?.tong_chi)} icon={TrendingDown} color="bg-rose-500" />
            <SummaryCard title="Số dư" value={formatCurrency(balance)} icon={DollarSign} color={balance >= 0 ? 'bg-indigo-600' : 'bg-orange-500'} />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-700">Danh sách giao dịch</h3>
              <button onClick={() => openAdd()}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                <Plus size={16} /> Thêm giao dịch
              </button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-indigo-600">
                <Loader2 size={20} className="animate-spin" /><span className="text-sm">Đang tải...</span>
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">Không có giao dịch nào trong tháng này</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Ngày</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Mô tả</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Loại</th>
                      <th className="text-right px-5 py-3 font-semibold text-gray-600">Số tiền</th>
                      <th className="text-right px-5 py-3 font-semibold text-gray-600">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t, idx) => (
                      <tr key={t.id} className={`border-b border-gray-50 hover:bg-indigo-50/20 ${idx % 2 !== 0 ? 'bg-gray-50/40' : ''}`}>
                        <td className="px-5 py-3 text-gray-500">
                          {t.ngay ? format(new Date(t.ngay), 'dd/MM/yyyy') : '-'}
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-gray-800">{t.mo_ta}</p>
                          {(t.ten_hoc_sinh || t.ten_lop) && (
                            <p className="text-xs text-gray-400">
                              {[t.ten_hoc_sinh, t.ten_lop].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3 hidden md:table-cell">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium
                            ${t.loai === 'thu' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {t.loai === 'thu' ? 'Thu' : 'Chi'}
                          </span>
                        </td>
                        <td className={`px-5 py-3 text-right font-semibold ${t.loai === 'thu' ? 'text-green-700' : 'text-red-600'}`}>
                          {t.loai === 'chi' ? '-' : '+'}{formatCurrency(t.so_tien)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEdit(t)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={15} /></button>
                            <button onClick={() => setDeleteId(t.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== HOC PHI THEO LOP TAB ===== */}
      {activeTab === 'hoc_phi' && (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Users size={16} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Tổng học sinh</p>
                <p className="text-lg font-bold text-gray-800">{tuitionStats.totalStudents}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle size={16} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Đã đóng</p>
                <p className="text-lg font-bold text-green-600">{tuitionStats.paidStudents}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
                <Clock size={16} className="text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Chưa đóng</p>
                <p className="text-lg font-bold text-orange-600">{tuitionStats.unpaidStudents}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                <DollarSign size={16} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Còn cần thu</p>
                <p className="text-sm font-bold text-indigo-600">{formatCurrency(tuitionStats.expectedTotal)}</p>
              </div>
            </div>
          </div>

          {loadingTuition ? (
            <div className="flex items-center justify-center py-20 gap-2 text-indigo-600">
              <Loader2 size={22} className="animate-spin" /><span className="text-sm">Đang tải...</span>
            </div>
          ) : tuitionStatus.length === 0 ? (
            <div className="bg-white rounded-2xl py-20 text-center text-gray-400 text-sm shadow-sm border border-gray-100">
              <BookOpen size={40} className="mx-auto mb-2 text-gray-200" />
              Không có lớp nào đang hoạt động
            </div>
          ) : (
            <div className="space-y-4">
              {tuitionStatus.map(cls => (
                <ClassTuitionCard
                  key={cls.class_id}
                  cls={cls}
                  month={month}
                  onQuickCollect={handleQuickCollect}
                  onBulkCollect={handleBulkCollect}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== LUONG GIAO VIEN TAB ===== */}
      {activeTab === 'luong_gv' && (
        <>
          {/* Summary */}
          {teacherSalary.length > 0 && (() => {
            const tongLuong   = teacherSalary.reduce((s, t) => s + t.tong_luong, 0)
            const daTra       = teacherSalary.filter(t => t.da_tra).reduce((s, t) => s + (t.so_tien_da_tra || 0), 0)
            const chuaTra     = teacherSalary.filter(t => !t.da_tra).reduce((s, t) => s + t.tong_luong, 0)
            const soGvChuaTra = teacherSalary.filter(t => !t.da_tra && t.tong_buoi > 0).length
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-400">Tổng giáo viên</p>
                  <p className="text-xl font-bold text-gray-800 mt-0.5">{teacherSalary.length}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-400">Tổng lương tháng</p>
                  <p className="text-base font-bold text-gray-800 mt-0.5">{formatCurrency(tongLuong)}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-400">Đã trả</p>
                  <p className="text-base font-bold text-green-600 mt-0.5">{formatCurrency(daTra)}</p>
                </div>
                <div className={`rounded-2xl p-4 shadow-sm border ${soGvChuaTra > 0 ? 'bg-orange-50 border-orange-100' : 'bg-white border-gray-100'}`}>
                  <p className="text-xs text-gray-400">Chưa trả{soGvChuaTra > 0 ? ` (${soGvChuaTra} GV)` : ''}</p>
                  <p className={`text-base font-bold mt-0.5 ${soGvChuaTra > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                    {formatCurrency(chuaTra)}
                  </p>
                </div>
              </div>
            )
          })()}

          {loadingTeacherSalary ? (
            <div className="flex items-center justify-center py-20 gap-2 text-indigo-600">
              <Loader2 size={22} className="animate-spin" /><span className="text-sm">Đang tải...</span>
            </div>
          ) : teacherSalary.length === 0 ? (
            <div className="bg-white rounded-2xl py-20 text-center text-gray-400 text-sm shadow-sm border border-gray-100">
              <GraduationCap size={40} className="mx-auto mb-2 text-gray-200" />
              Không có giáo viên nào đang dạy
            </div>
          ) : (
            <div className="space-y-3">
              {/* Chưa trả trước */}
              {[...teacherSalary].sort((a, b) => Number(a.da_tra) - Number(b.da_tra)).map(teacher => (
                <TeacherSalaryCard
                  key={teacher.teacher_id}
                  teacher={teacher}
                  month={month}
                  onPay={handlePayTeacher}
                  onDelete={handleDeleteSalaryPayment}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" />
          <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <Dialog.Title className="text-base font-semibold text-gray-800">
                {editing ? 'Chỉnh sửa giao dịch' : 'Thêm giao dịch mới'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
              </Dialog.Close>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Loại giao dịch</label>
                  <select value={form.loai} onChange={e => setField('loai', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="thu">Thu</option>
                    <option value="chi">Chi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Danh mục</label>
                  <select value={form.danh_muc} onChange={e => setField('danh_muc', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="hoc_phi">Học phí</option>
                    <option value="luong_gv">Lương giáo viên</option>
                    <option value="van_phong">Văn phòng phẩm</option>
                    <option value="khac">Khác</option>
                  </select>
                </div>
              </div>

              {/* Lớp học - shows when loai=thu */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Lớp học
                  {form.loai === 'thu' && form.danh_muc === 'hoc_phi' && <span className="text-orange-500 ml-1">*</span>}
                </label>
                <select value={form.class_id} onChange={e => handleClassChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="">-- Chọn lớp --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.ten_lop}{c.hoc_phi_thang ? ` (${new Intl.NumberFormat('vi-VN').format(c.hoc_phi_thang)} đ/tháng)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Học sinh</label>
                <select value={form.student_id} onChange={e => setField('student_id', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="">-- Không chọn --</option>
                  {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.ho_ten}{s.biet_danh ? ` (${s.biet_danh})` : ''}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mô tả <span className="text-red-500">*</span></label>
                <input value={form.mo_ta} onChange={e => setField('mo_ta', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Thu học phí tháng 6..." required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Số tiền (đ) <span className="text-red-500">*</span></label>
                  <input type="number" min="0" value={form.so_tien} onChange={e => setField('so_tien', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="500000" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ngày giao dịch</label>
                  <input type="date" value={form.ngay_giao_dich} onChange={e => setField('ngay_giao_dich', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
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
                <p className="text-gray-500 text-sm mt-1">Bạn có chắc muốn xóa giao dịch này?</p>
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
