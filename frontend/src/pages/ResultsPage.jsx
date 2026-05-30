import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { Plus, Edit2, Trash2, X, AlertCircle, Loader2, BarChart2, Save } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import toast from 'react-hot-toast'
import resultService from '../services/resultService'
import classService from '../services/classService'
import studentService from '../services/studentService'

const XEP_LOAI_OPTIONS = [
  { value: 'gioi', label: 'Giỏi', cls: 'bg-blue-100 text-blue-700' },
  { value: 'kha', label: 'Khá', cls: 'bg-green-100 text-green-700' },
  { value: 'trung_binh', label: 'Trung bình', cls: 'bg-yellow-100 text-yellow-700' },
  { value: 'yeu', label: 'Yếu', cls: 'bg-red-100 text-red-600' },
]

function getXepLoai(diem) {
  if (diem >= 8) return 'gioi'
  if (diem >= 6.5) return 'kha'
  if (diem >= 5) return 'trung_binh'
  return 'yeu'
}

function XepLoaiBadge({ value }) {
  const opt = XEP_LOAI_OPTIONS.find(x => x.value === value) || { label: value, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${opt.cls}`}>{opt.label}</span>
}

const EMPTY_FORM = {
  student_id: '', class_id: '', ky: '', diem_so: '', xep_loai: '', nhan_xet: '',
}

export default function ResultsPage() {
  const [activeTab, setActiveTab] = useState('danh_sach') // danh_sach | bao_cao | nhap_diem

  // Lists
  const [results, setResults] = useState([])
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)

  // Filters
  const [filterClass, setFilterClass] = useState('')
  const [filterKy, setFilterKy] = useState('')

  // Report
  const [reportClass, setReportClass] = useState('')
  const [reportKy, setReportKy] = useState('')
  const [report, setReport] = useState(null)
  const [loadingReport, setLoadingReport] = useState(false)

  // Bulk entry
  const [bulkClass, setBulkClass] = useState('')
  const [bulkKy, setBulkKy] = useState('')
  const [bulkStudents, setBulkStudents] = useState([]) // [{student_id, ho_ten, diem_so, nhan_xet}]
  const [loadingBulk, setLoadingBulk] = useState(false)
  const [savingBulk, setSavingBulk] = useState(false)

  // Modal
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Delete
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchSupport() }, [])
  useEffect(() => { if (activeTab === 'danh_sach') fetchResults() }, [activeTab, filterClass, filterKy])

  const fetchSupport = async () => {
    try {
      const [cRes, sRes] = await Promise.allSettled([classService.getAll(), studentService.getAll()])
      const c = cRes.status === 'fulfilled' ? (cRes.value?.data || cRes.value || []) : []
      const s = sRes.status === 'fulfilled' ? (sRes.value?.data || sRes.value || []) : []
      setClasses(Array.isArray(c) ? c : [])
      setStudents(Array.isArray(s) ? s : [])
    } catch {}
  }

  const fetchResults = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterClass) params.class_id = filterClass
      if (filterKy) params.ky = filterKy
      const res = await resultService.getAll(params)
      const data = res?.data || res || []
      setResults(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Không thể tải kết quả')
    } finally {
      setLoading(false)
    }
  }

  const loadReport = async () => {
    if (!reportClass || !reportKy) { toast.error('Vui lòng chọn lớp và kỳ'); return }
    setLoadingReport(true)
    try {
      const res = await resultService.getReport({ class_id: reportClass, ky: reportKy })
      setReport(res?.data || res)
    } catch (err) {
      toast.error(err.message || 'Không thể tải báo cáo')
    } finally {
      setLoadingReport(false)
    }
  }

  const loadBulkStudents = async () => {
    if (!bulkClass) { toast.error('Vui lòng chọn lớp'); return }
    setLoadingBulk(true)
    try {
      // Get students of this class from results or students list
      const classStudents = students.filter(s => s.trang_thai === 'dang_hoc')
      setBulkStudents(classStudents.map(s => ({
        student_id: s.id,
        ho_ten: s.ho_ten,
        diem_so: '',
        nhan_xet: '',
      })))
    } catch {
      toast.error('Không thể tải danh sách học sinh')
    } finally {
      setLoadingBulk(false)
    }
  }

  const updateBulkRow = (studentId, field, value) => {
    setBulkStudents(prev => prev.map(s =>
      s.student_id === studentId ? { ...s, [field]: value } : s
    ))
  }

  const handleSaveBulk = async () => {
    if (!bulkKy.trim()) { toast.error('Vui lòng nhập tên kỳ'); return }
    const records = bulkStudents
      .filter(s => s.diem_so !== '' && s.diem_so !== null)
      .map(s => ({
        student_id: s.student_id,
        class_id: Number(bulkClass),
        ky: bulkKy,
        diem_so: Number(s.diem_so),
        xep_loai: getXepLoai(Number(s.diem_so)),
        nhan_xet: s.nhan_xet,
      }))
    if (records.length === 0) { toast.error('Chưa có điểm nào để lưu'); return }
    setSavingBulk(true)
    try {
      await resultService.bulkCreate({ results: records })
      toast.success(`Lưu ${records.length} kết quả thành công`)
      setBulkStudents([])
      setBulkKy('')
      setBulkClass('')
    } catch (err) {
      toast.error(err.message || 'Có lỗi khi lưu kết quả')
    } finally {
      setSavingBulk(false)
    }
  }

  const openEdit = (r) => {
    setEditing(r)
    setForm({
      student_id: r.student_id || '',
      class_id: r.class_id || '',
      ky: r.ky || '',
      diem_so: r.diem_so ?? '',
      xep_loai: r.xep_loai || '',
      nhan_xet: r.nhan_xet || '',
    })
    setOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const diem = Number(form.diem_so)
    if (isNaN(diem) || diem < 0 || diem > 10) { toast.error('Điểm số phải từ 0 đến 10'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        diem_so: diem,
        xep_loai: form.xep_loai || getXepLoai(diem),
        student_id: Number(form.student_id),
        class_id: Number(form.class_id),
      }
      await resultService.update(editing.id, payload)
      toast.success('Cập nhật kết quả thành công')
      setOpen(false)
      fetchResults()
    } catch (err) {
      toast.error(err.message || 'Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await resultService.delete(deleteId)
      toast.success('Xóa kết quả thành công')
      setDeleteId(null)
      fetchResults()
    } catch (err) {
      toast.error(err.message || 'Không thể xóa kết quả')
    } finally {
      setDeleting(false)
    }
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const getStudentName = (id) => students.find(s => s.id === id)?.ho_ten || '-'
  const getClassName = (id) => classes.find(c => c.id === id)?.ten_lop || '-'

  return (
    <Layout title="Kết quả học tập">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'danh_sach', label: 'Danh sách' },
          { key: 'nhap_diem', label: 'Nhập điểm' },
          { key: 'bao_cao', label: 'Báo cáo lớp' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.key ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== DANH SACH ===== */}
      {activeTab === 'danh_sach' && (
        <>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4 flex flex-col sm:flex-row gap-3">
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 flex-1">
              <option value="">Tất cả lớp</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.ten_lop}</option>)}
            </select>
            <input value={filterKy} onChange={e => setFilterKy(e.target.value)}
              placeholder="Lọc theo kỳ..."
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-indigo-600">
                <Loader2 size={20} className="animate-spin" /><span className="text-sm">Đang tải...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">
                <BarChart2 size={40} className="mx-auto mb-2 text-gray-200" />
                Chưa có kết quả nào
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">#</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Học sinh</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden sm:table-cell">Lớp</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Kỳ</th>
                      <th className="text-center px-5 py-3 font-semibold text-gray-600">Điểm</th>
                      <th className="text-center px-5 py-3 font-semibold text-gray-600">Xếp loại</th>
                      <th className="text-right px-5 py-3 font-semibold text-gray-600">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, idx) => (
                      <tr key={r.id} className={`border-b border-gray-50 hover:bg-indigo-50/20 ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                        <td className="px-5 py-3 text-gray-400">{idx + 1}</td>
                        <td className="px-5 py-3 font-medium text-gray-800">{r.ho_ten || getStudentName(r.student_id)}</td>
                        <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{r.ten_lop || getClassName(r.class_id)}</td>
                        <td className="px-5 py-3 text-gray-500 hidden md:table-cell">{r.ky}</td>
                        <td className="px-5 py-3 text-center">
                          <span className="font-bold text-gray-800 text-base">{r.diem_so}</span>
                        </td>
                        <td className="px-5 py-3 text-center"><XepLoaiBadge value={r.xep_loai} /></td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEdit(r)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                              <Edit2 size={15} />
                            </button>
                            <button onClick={() => setDeleteId(r.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                              <Trash2 size={15} />
                            </button>
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

      {/* ===== NHAP DIEM ===== */}
      {activeTab === 'nhap_diem' && (
        <>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-5 flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Lớp học</label>
              <select value={bulkClass} onChange={e => { setBulkClass(e.target.value); setBulkStudents([]) }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">-- Chọn lớp --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.ten_lop}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Tên kỳ</label>
              <input value={bulkKy} onChange={e => setBulkKy(e.target.value)}
                placeholder="Kỳ 1, Kỳ 2, Cuối năm..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <button onClick={loadBulkStudents} disabled={loadingBulk || !bulkClass}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
              {loadingBulk ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Tải danh sách
            </button>
          </div>

          {bulkStudents.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">#</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Học sinh</th>
                      <th className="text-center px-5 py-3 font-semibold text-gray-600">Điểm số (0-10)</th>
                      <th className="text-center px-5 py-3 font-semibold text-gray-600 hidden sm:table-cell">Xếp loại</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Nhận xét</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkStudents.map((s, idx) => {
                      const diem = Number(s.diem_so)
                      const xepLoai = s.diem_so !== '' ? getXepLoai(diem) : null
                      return (
                        <tr key={s.student_id} className={`border-b border-gray-50 ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                          <td className="px-5 py-3 text-gray-400">{idx + 1}</td>
                          <td className="px-5 py-3 font-medium text-gray-800">{s.ho_ten}</td>
                          <td className="px-5 py-2.5 text-center">
                            <input
                              type="number" min="0" max="10" step="0.1"
                              value={s.diem_so}
                              onChange={e => updateBulkRow(s.student_id, 'diem_so', e.target.value)}
                              className="w-24 border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-300"
                              placeholder="0-10"
                            />
                          </td>
                          <td className="px-5 py-3 text-center hidden sm:table-cell">
                            {xepLoai && <XepLoaiBadge value={xepLoai} />}
                          </td>
                          <td className="px-5 py-2.5">
                            <input
                              value={s.nhan_xet}
                              onChange={e => updateBulkRow(s.student_id, 'nhan_xet', e.target.value)}
                              className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                              placeholder="Nhận xét..."
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
                <button onClick={handleSaveBulk} disabled={savingBulk}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
                  {savingBulk ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Lưu kết quả
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== BAO CAO ===== */}
      {activeTab === 'bao_cao' && (
        <>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-5 flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Lớp học</label>
              <select value={reportClass} onChange={e => setReportClass(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">-- Chọn lớp --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.ten_lop}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Kỳ học</label>
              <input value={reportKy} onChange={e => setReportKy(e.target.value)}
                placeholder="Kỳ 1, Kỳ 2..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <button onClick={loadReport} disabled={loadingReport}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
              {loadingReport ? <Loader2 size={16} className="animate-spin" /> : <BarChart2 size={16} />}
              Xem báo cáo
            </button>
          </div>

          {report && (
            <div className="space-y-5">
              {/* Stats */}
              {report.thong_ke && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Tổng học sinh', value: report.thong_ke.tong || 0, cls: 'bg-indigo-50 text-indigo-700' },
                    { label: 'Giỏi', value: report.thong_ke.gioi || 0, cls: 'bg-blue-50 text-blue-700' },
                    { label: 'Khá', value: report.thong_ke.kha || 0, cls: 'bg-green-50 text-green-700' },
                    { label: 'Yếu', value: report.thong_ke.yeu || 0, cls: 'bg-red-50 text-red-700' },
                  ].map(item => (
                    <div key={item.label} className={`rounded-2xl p-4 ${item.cls}`}>
                      <p className="text-sm opacity-75">{item.label}</p>
                      <p className="text-2xl font-bold mt-1">{item.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-700">Chi tiết kết quả - Kỳ {reportKy}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-5 py-3 font-semibold text-gray-600">Học sinh</th>
                        <th className="text-center px-5 py-3 font-semibold text-gray-600">Điểm</th>
                        <th className="text-center px-5 py-3 font-semibold text-gray-600">Xếp loại</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Nhận xét</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(report.ket_qua || report) && (report.ket_qua || report).map((r, idx) => (
                        <tr key={idx} className={`border-b border-gray-50 ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                          <td className="px-5 py-3 font-medium text-gray-800">{r.ho_ten}</td>
                          <td className="px-5 py-3 text-center font-bold text-gray-800 text-base">{r.diem_so}</td>
                          <td className="px-5 py-3 text-center"><XepLoaiBadge value={r.xep_loai} /></td>
                          <td className="px-5 py-3 text-gray-500 hidden md:table-cell">{r.nhan_xet || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" />
          <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <Dialog.Title className="text-base font-semibold text-gray-800">Chỉnh sửa kết quả</Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
              </Dialog.Close>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Điểm số (0-10)</label>
                  <input type="number" min="0" max="10" step="0.1" value={form.diem_so}
                    onChange={e => { setField('diem_so', e.target.value); setField('xep_loai', getXepLoai(Number(e.target.value))) }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Xếp loại</label>
                  <select value={form.xep_loai} onChange={e => setField('xep_loai', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {XEP_LOAI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kỳ học</label>
                <input value={form.ky} onChange={e => setField('ky', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Kỳ 1, Kỳ 2..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nhận xét</label>
                <textarea value={form.nhan_xet} onChange={e => setField('nhan_xet', e.target.value)} rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  placeholder="Nhận xét học sinh..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Dialog.Close asChild>
                  <button type="button" className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Hủy</button>
                </Dialog.Close>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-60">
                  {saving && <Loader2 size={15} className="animate-spin" />} Cập nhật
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
                <p className="text-gray-500 text-sm mt-1">Bạn có chắc muốn xóa kết quả này?</p>
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
