import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { Plus, Edit2, Trash2, Search, X, AlertCircle, Loader2 } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import toast from 'react-hot-toast'
import teacherService from '../services/teacherService'

const EMPTY_FORM = {
  ho_ten: '', sdt: '', dia_chi: '',
  luong_buoi: '', trang_thai: 'dang_day', ghi_chu: '',
}

function StatusBadge({ status }) {
  const map = {
    dang_day: { label: 'Đang dạy', cls: 'bg-green-100 text-green-700' },
    nghi: { label: 'Nghỉ', cls: 'bg-red-100 text-red-600' },
  }
  const { label, cls } = map[status] || { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
}

const formatCurrency = (v) =>
  v ? new Intl.NumberFormat('vi-VN').format(v) + ' đ' : '-'

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchTeachers() }, [])

  useEffect(() => {
    let data = teachers
    if (filterStatus !== 'all') data = data.filter(t => t.trang_thai === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter(t =>
        (t.ho_ten || '').toLowerCase().includes(q) ||
        (t.sdt || '').includes(q)
      )
    }
    setFiltered(data)
  }, [teachers, search, filterStatus])

  const fetchTeachers = async () => {
    setLoading(true)
    try {
      const res = await teacherService.getAll()
      const data = res?.data || res || []
      setTeachers(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Không thể tải danh sách giáo viên')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    setOpen(true)
  }

  const openEdit = (t) => {
    setEditing(t)
    setForm({
      ho_ten: t.ho_ten || '',
      sdt: t.sdt || '',
      dia_chi: t.dia_chi || '',
      luong_buoi: t.luong_buoi || '',
      trang_thai: t.trang_thai || 'dang_day',
      ghi_chu: t.ghi_chu || '',
    })
    setOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.ho_ten.trim()) { toast.error('Vui lòng nhập họ tên'); return }
    setSaving(true)
    try {
      const payload = { ...form, luong_buoi: form.luong_buoi ? Number(form.luong_buoi) : null }
      if (editing) {
        await teacherService.update(editing.id, payload)
        toast.success('Cập nhật giáo viên thành công')
      } else {
        await teacherService.create(payload)
        toast.success('Thêm giáo viên thành công')
      }
      setOpen(false)
      fetchTeachers()
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
      await teacherService.delete(deleteId)
      toast.success('Xóa giáo viên thành công')
      setDeleteId(null)
      fetchTeachers()
    } catch (err) {
      toast.error(err.message || 'Không thể xóa giáo viên')
    } finally {
      setDeleting(false)
    }
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Layout title="Quản lý giáo viên">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <p className="text-gray-500 text-sm">Tổng cộng {filtered.length} giáo viên</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={18} /> Thêm giáo viên
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT..."
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
          <option value="dang_day">Đang dạy</option>
          <option value="nghi">Nghỉ</option>
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
            Không tìm thấy giáo viên nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">#</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Họ tên</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden sm:table-cell">SĐT</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Địa chỉ</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden lg:table-cell">Lương/buổi</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Trạng thái</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, idx) => (
                  <tr key={t.id} className={`border-b border-gray-50 hover:bg-indigo-50/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                    <td className="px-5 py-3 text-gray-400">{idx + 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-emerald-700 font-semibold text-xs">
                            {(t.ho_ten || '?').charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium text-gray-800">{t.ho_ten}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600 hidden sm:table-cell">{t.sdt || '-'}</td>
                    <td className="px-5 py-3 text-gray-500 hidden md:table-cell truncate max-w-xs">{t.dia_chi || '-'}</td>
                    <td className="px-5 py-3 text-gray-700 font-medium hidden lg:table-cell">{formatCurrency(t.luong_buoi)}</td>
                    <td className="px-5 py-3"><StatusBadge status={t.trang_thai} /></td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(t)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setDeleteId(t.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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

      {/* Add/Edit Modal */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" />
          <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <Dialog.Title className="text-base font-semibold text-gray-800">
                {editing ? 'Chỉnh sửa giáo viên' : 'Thêm giáo viên mới'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Họ tên <span className="text-red-500">*</span></label>
                  <input value={form.ho_ten} onChange={e => setField('ho_ten', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="Nguyễn Văn B" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Số điện thoại</label>
                  <input value={form.sdt} onChange={e => setField('sdt', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="0901234567" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lương/buổi (đ)</label>
                  <input type="number" min="0" value={form.luong_buoi} onChange={e => setField('luong_buoi', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="150000" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Địa chỉ</label>
                  <input value={form.dia_chi} onChange={e => setField('dia_chi', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="Số nhà, đường, phường/xã..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Trạng thái</label>
                  <select value={form.trang_thai} onChange={e => setField('trang_thai', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="dang_day">Đang dạy</option>
                    <option value="nghi">Nghỉ</option>
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
                <p className="text-gray-500 text-sm mt-1">Bạn có chắc chắn muốn xóa giáo viên này?</p>
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
