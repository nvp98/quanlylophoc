import { useState, useEffect, useRef } from 'react'
import { Layout } from '../components/Layout'
import {
  Plus, Edit2, Trash2, Search, X, AlertCircle, Loader2,
  User, Phone, MapPin, Calendar, BookOpen, Camera, Eye,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import studentService from '../services/studentService'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3001'

const EMPTY_FORM = {
  ho_ten: '', biet_danh: '', ngay_sinh: '', gioi_tinh: 'nam',
  dia_chi: '', ten_phu_huynh: '', sdt_phu_huynh: '',
  ghi_chu: '', trang_thai: 'dang_hoc', ngay_nhap_hoc: '',
}

function StatusBadge({ status }) {
  const map = {
    dang_hoc: { label: 'Đang học', cls: 'bg-green-100 text-green-700' },
    nghi_hoc: { label: 'Nghỉ học', cls: 'bg-red-100 text-red-600' },
  }
  const { label, cls } = map[status] || { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
}

function EnrollBadge({ status }) {
  const map = {
    dang_hoc: { label: 'Đang học', cls: 'bg-indigo-100 text-indigo-700' },
    nghi_hoc: { label: 'Đã nghỉ', cls: 'bg-gray-100 text-gray-500' },
  }
  const { label, cls } = map[status] || { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
}

function Avatar({ student, size = 'md' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-20 h-20 text-2xl' }
  const imgUrl = student?.hinh_anh ? `${API_BASE}/${student.hinh_anh}` : null
  if (imgUrl) {
    return (
      <img
        src={imgUrl}
        alt={student.ho_ten}
        className={`${sizes[size]} rounded-full object-cover flex-shrink-0 border-2 border-white shadow`}
        onError={e => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
      />
    )
  }
  return (
    <div className={`${sizes[size]} rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 font-semibold text-indigo-700`}>
      {(student?.ho_ten || '?').charAt(0)}
    </div>
  )
}

// ── Student Detail Modal ─────────────────────────────────────────────────────
function StudentDetailModal({ studentId, onClose, onEdit, onDelete }) {
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) return
    setLoading(true)
    studentService.getById(studentId)
      .then(res => setStudent(res?.data || res))
      .catch(() => toast.error('Không thể tải thông tin học sinh'))
      .finally(() => setLoading(false))
  }, [studentId])

  const imgUrl = student?.hinh_anh ? `${API_BASE}/${student.hinh_anh}` : null

  const info = (label, value, icon) => value ? (
    <div className="flex items-start gap-2">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-800 font-medium">{value}</p>
      </div>
    </div>
  ) : null

  return (
    <Dialog.Root open={!!studentId} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
          {/* Close */}
          <div className="flex items-center justify-between px-6 pt-5 pb-0">
            <Dialog.Title className="text-base font-semibold text-gray-800">Thông tin học sinh</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-indigo-600">
              <Loader2 size={22} className="animate-spin" />
              <span className="text-sm">Đang tải...</span>
            </div>
          ) : student ? (
            <div className="px-6 pb-6">
              {/* Profile header */}
              <div className="flex flex-col items-center gap-3 py-6 border-b border-gray-100">
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={student.ho_ten}
                    className="w-24 h-24 rounded-full object-cover border-4 border-indigo-100 shadow-md"
                    onError={e => {
                      e.target.onerror = null
                      e.target.replaceWith(Object.assign(document.createElement('div'), {
                        className: 'w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-3xl font-bold text-indigo-600',
                        textContent: (student.ho_ten || '?').charAt(0)
                      }))
                    }}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-3xl font-bold text-indigo-600">
                    {(student.ho_ten || '?').charAt(0)}
                  </div>
                )}
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900">{student.ho_ten}</h2>
                  {student.biet_danh && (
                    <p className="text-sm text-gray-500 mt-0.5">"{student.biet_danh}"</p>
                  )}
                  <div className="mt-2"><StatusBadge status={student.trang_thai} /></div>
                </div>
              </div>

              {/* Info grid */}
              <div className="py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-gray-100">
                {info('Ngày sinh', student.ngay_sinh ? format(new Date(student.ngay_sinh), 'dd/MM/yyyy') : null, <Calendar size={14} />)}
                {info('Giới tính', student.gioi_tinh, <User size={14} />)}
                {info('Ngày nhập học', student.ngay_nhap_hoc ? format(new Date(student.ngay_nhap_hoc), 'dd/MM/yyyy') : null, <Calendar size={14} />)}
                {info('Địa chỉ', student.dia_chi, <MapPin size={14} />)}
                {info('Tên phụ huynh', student.ten_phu_huynh, <User size={14} />)}
                {info('SĐT phụ huynh', student.sdt_phu_huynh, <Phone size={14} />)}
                {student.ghi_chu && (
                  <div className="sm:col-span-2 bg-amber-50 rounded-xl px-3 py-2 text-sm text-amber-800">
                    <span className="font-medium">Ghi chú: </span>{student.ghi_chu}
                  </div>
                )}
              </div>

              {/* Enrolled classes */}
              <div className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen size={15} className="text-indigo-500" />
                  <span className="text-sm font-semibold text-gray-700">Lớp đang tham gia</span>
                </div>
                {(student.enrollments || []).length === 0 ? (
                  <p className="text-sm text-gray-400 pl-5">Chưa đăng ký lớp nào</p>
                ) : (
                  <div className="space-y-2">
                    {student.enrollments.map(e => (
                      <div key={e.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{e.ten_lop}</p>
                          <p className="text-xs text-gray-400">
                            Học phí: {e.hoc_phi_thang?.toLocaleString('vi-VN')}đ/tháng
                            {e.ngay_vao && ` · Vào: ${format(new Date(e.ngay_vao), 'dd/MM/yyyy')}`}
                          </p>
                        </div>
                        <EnrollBadge status={e.trang_thai} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { onClose(); onDelete(student.id) }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} /> Xóa
                </button>
                <button
                  onClick={() => { onClose(); onEdit(student) }}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  <Edit2 size={14} /> Chỉnh sửa
                </button>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-gray-400 text-sm">Không tìm thấy học sinh</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Detail modal
  const [viewId, setViewId] = useState(null)

  // Add/Edit modal
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  // Delete confirm
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchStudents() }, [])

  useEffect(() => {
    let data = students
    if (filterStatus !== 'all') data = data.filter(s => s.trang_thai === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter(s =>
        (s.ho_ten || '').toLowerCase().includes(q) ||
        (s.biet_danh || '').toLowerCase().includes(q) ||
        (s.sdt_phu_huynh || '').includes(q)
      )
    }
    setFiltered(data)
  }, [students, search, filterStatus])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const res = await studentService.getAll()
      const data = res?.data || res || []
      setStudents(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Không thể tải danh sách học sinh')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, ngay_nhap_hoc: format(new Date(), 'yyyy-MM-dd') })
    setImageFile(null)
    setImagePreview(null)
    setOpen(true)
  }

  const openEdit = (student) => {
    setEditing(student)
    setForm({
      ho_ten: student.ho_ten || '',
      biet_danh: student.biet_danh || '',
      ngay_sinh: student.ngay_sinh ? student.ngay_sinh.slice(0, 10) : '',
      gioi_tinh: student.gioi_tinh || 'nam',
      dia_chi: student.dia_chi || '',
      ten_phu_huynh: student.ten_phu_huynh || '',
      sdt_phu_huynh: student.sdt_phu_huynh || '',
      ghi_chu: student.ghi_chu || '',
      trang_thai: student.trang_thai || 'dang_hoc',
      ngay_nhap_hoc: student.ngay_nhap_hoc ? student.ngay_nhap_hoc.slice(0, 10) : '',
    })
    setImageFile(null)
    setImagePreview(student.hinh_anh ? `${API_BASE}/${student.hinh_anh}` : null)
    setOpen(true)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.ho_ten.trim()) { toast.error('Vui lòng nhập họ tên'); return }
    setSaving(true)
    try {
      if (editing) {
        await studentService.update(editing.id, form, imageFile)
        toast.success('Cập nhật học sinh thành công')
      } else {
        await studentService.create(form, imageFile)
        toast.success('Thêm học sinh thành công')
      }
      setOpen(false)
      fetchStudents()
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
      await studentService.delete(deleteId)
      toast.success('Xóa học sinh thành công')
      setDeleteId(null)
      fetchStudents()
    } catch (err) {
      toast.error(err.message || 'Không thể xóa học sinh')
    } finally {
      setDeleting(false)
    }
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Layout title="Quản lý học sinh">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <p className="text-gray-500 text-sm">Tổng cộng {filtered.length} học sinh</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={18} /> Thêm học sinh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, biệt danh, SĐT..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="dang_hoc">Đang học</option>
          <option value="nghi_hoc">Nghỉ học</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-indigo-600">
            <Loader2 size={22} className="animate-spin" />
            <span className="text-sm">Đang tải dữ liệu...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">
            <Search size={40} className="mx-auto mb-2 text-gray-200" />
            Không tìm thấy học sinh nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">#</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Học sinh</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Phụ huynh</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden sm:table-cell">SĐT PH</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden lg:table-cell">Ngày nhập học</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Trạng thái</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <tr
                    key={s.id}
                    className={`border-b border-gray-50 hover:bg-indigo-50/40 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}
                  >
                    <td className="px-5 py-3 text-gray-400">{idx + 1}</td>
                    <td className="px-5 py-3">
                      {/* Clickable name to view detail */}
                      <button
                        onClick={() => setViewId(s.id)}
                        className="flex items-center gap-2.5 group text-left"
                      >
                        <div className="relative flex-shrink-0">
                          {s.hinh_anh ? (
                            <img
                              src={`${API_BASE}/${s.hinh_anh}`}
                              alt={s.ho_ten}
                              className="w-9 h-9 rounded-full object-cover border border-gray-200"
                              onError={e => { e.target.onerror = null; e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                            />
                          ) : null}
                          <div
                            className="w-9 h-9 rounded-full bg-indigo-100 items-center justify-center flex-shrink-0"
                            style={{ display: s.hinh_anh ? 'none' : 'flex' }}
                          >
                            <span className="text-indigo-700 font-semibold text-xs">{(s.ho_ten || '?').charAt(0)}</span>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 group-hover:text-indigo-600 transition-colors">{s.ho_ten}</p>
                          {s.biet_danh && <p className="text-xs text-gray-400">{s.biet_danh}</p>}
                        </div>
                      </button>
                    </td>
                    <td className="px-5 py-3 text-gray-600 hidden md:table-cell">{s.ten_phu_huynh || '-'}</td>
                    <td className="px-5 py-3 text-gray-600 hidden sm:table-cell">{s.sdt_phu_huynh || '-'}</td>
                    <td className="px-5 py-3 text-gray-500 hidden lg:table-cell">
                      {s.ngay_nhap_hoc ? format(new Date(s.ngay_nhap_hoc), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={s.trang_thai} /></td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewId(s.id)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteId(s.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={16} />
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

      {/* Detail Modal */}
      <StudentDetailModal
        studentId={viewId}
        onClose={() => setViewId(null)}
        onEdit={s => openEdit(s)}
        onDelete={id => setDeleteId(id)}
      />

      {/* Add/Edit Modal */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" />
          <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <Dialog.Title className="text-base font-semibold text-gray-800">
                {editing ? 'Chỉnh sửa học sinh' : 'Thêm học sinh mới'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {/* Image Upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" className="w-20 h-20 rounded-full object-cover border-4 border-indigo-100" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                      <User size={28} className="text-gray-300" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow hover:bg-indigo-700 transition-colors"
                  >
                    <Camera size={13} />
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <p className="text-xs text-gray-400">Nhấn vào biểu tượng máy ảnh để tải ảnh lên (JPG, PNG, WEBP, tối đa 5MB)</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Họ tên <span className="text-red-500">*</span></label>
                  <input value={form.ho_ten} onChange={e => setField('ho_ten', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="Nguyễn Văn A" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Biệt danh</label>
                  <input value={form.biet_danh} onChange={e => setField('biet_danh', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="Tên hay gọi..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ngày sinh</label>
                  <input type="date" value={form.ngay_sinh} onChange={e => setField('ngay_sinh', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Giới tính</label>
                  <select value={form.gioi_tinh} onChange={e => setField('gioi_tinh', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="nam">Nam</option>
                    <option value="nu">Nữ</option>
                    <option value="khac">Khác</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Địa chỉ</label>
                  <input value={form.dia_chi} onChange={e => setField('dia_chi', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="Số nhà, đường, phường/xã..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tên phụ huynh</label>
                  <input value={form.ten_phu_huynh} onChange={e => setField('ten_phu_huynh', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="Tên phụ huynh" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SĐT phụ huynh</label>
                  <input value={form.sdt_phu_huynh} onChange={e => setField('sdt_phu_huynh', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="0901234567" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ngày nhập học</label>
                  <input type="date" value={form.ngay_nhap_hoc} onChange={e => setField('ngay_nhap_hoc', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Trạng thái</label>
                  <select value={form.trang_thai} onChange={e => setField('trang_thai', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="dang_hoc">Đang học</option>
                    <option value="nghi_hoc">Nghỉ học</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú</label>
                  <textarea value={form.ghi_chu} onChange={e => setField('ghi_chu', e.target.value)} rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                    placeholder="Ghi chú thêm..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Dialog.Close asChild>
                  <button type="button" className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    Hủy
                  </button>
                </Dialog.Close>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60">
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  {editing ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirm Modal */}
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
                <p className="text-gray-500 text-sm mt-1">Bạn có chắc chắn muốn xóa học sinh này? Hành động này không thể hoàn tác.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors">
                  Hủy
                </button>
              </Dialog.Close>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60">
                {deleting && <Loader2 size={14} className="animate-spin" />}
                Xóa
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Layout>
  )
}
