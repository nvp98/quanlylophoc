import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { Users, GraduationCap, BookOpen, TrendingUp, AlertCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import studentService from '../services/studentService'
import teacherService from '../services/teacherService'
import classService from '../services/classService'
import financeService from '../services/financeService'

function StatCard({ title, value, icon: Icon, color, sub }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={26} className="text-white" />
      </div>
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0 })
  const [financeSummary, setFinanceSummary] = useState(null)
  const [chartData, setChartData] = useState([])
  const [recentStudents, setRecentStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const currentMonth = format(new Date(), 'yyyy-MM')

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [studentsRes, teachersRes, classesRes, financeRes] = await Promise.allSettled([
        studentService.getAll(),
        teacherService.getAll(),
        classService.getAll(),
        financeService.getSummary({ thang: currentMonth }),
      ])

      const students = studentsRes.status === 'fulfilled' ? (studentsRes.value?.data || studentsRes.value || []) : []
      const teachers = teachersRes.status === 'fulfilled' ? (teachersRes.value?.data || teachersRes.value || []) : []
      const classes = classesRes.status === 'fulfilled' ? (classesRes.value?.data || classesRes.value || []) : []
      const finance = financeRes.status === 'fulfilled' ? financeRes.value : null

      setStats({
        students: Array.isArray(students) ? students.filter(s => s.trang_thai === 'dang_hoc').length : 0,
        teachers: Array.isArray(teachers) ? teachers.filter(t => t.trang_thai === 'dang_day').length : 0,
        classes: Array.isArray(classes) ? classes.length : 0,
      })
      setFinanceSummary(finance)

      // Recent students (last 5)
      const sorted = Array.isArray(students)
        ? [...students].sort((a, b) => new Date(b.ngay_nhap_hoc || 0) - new Date(a.ngay_nhap_hoc || 0)).slice(0, 5)
        : []
      setRecentStudents(sorted)

      // Build last 6 months chart data
      const months = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        months.push(format(d, 'yyyy-MM'))
      }
      const chartResults = await Promise.allSettled(
        months.map(m => financeService.getSummary({ thang: m }))
      )
      setChartData(
        months.map((m, idx) => {
          const val = chartResults[idx].status === 'fulfilled' ? chartResults[idx].value : {}
          return {
            thang: format(new Date(m + '-01'), 'MM/yyyy'),
            'Thu nhập': val?.tong_thu || 0,
            'Chi phí': val?.tong_chi || 0,
          }
        })
      )
    } catch (err) {
      setError('Không thể tải dữ liệu tổng quan')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0)

  return (
    <Layout title="Tổng quan">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex gap-2 text-red-700">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Học sinh đang học"
          value={loading ? '...' : stats.students}
          icon={Users}
          color="bg-indigo-500"
          sub="học sinh tích cực"
        />
        <StatCard
          title="Giáo viên đang dạy"
          value={loading ? '...' : stats.teachers}
          icon={GraduationCap}
          color="bg-emerald-500"
          sub="giáo viên tích cực"
        />
        <StatCard
          title="Tổng số lớp"
          value={loading ? '...' : stats.classes}
          icon={BookOpen}
          color="bg-amber-500"
          sub="lớp học đang hoạt động"
        />
        <StatCard
          title="Doanh thu tháng này"
          value={loading ? '...' : formatCurrency(financeSummary?.tong_thu)}
          icon={TrendingUp}
          color="bg-rose-500"
          sub={`Tháng ${format(new Date(), 'MM/yyyy')}`}
        />
      </div>

      {/* Chart + Recent */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Finance Chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Thu chi 6 tháng gần đây</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-gray-400">Đang tải...</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="thang" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Legend />
                <Bar dataKey="Thu nhập" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Chi phí" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent students */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Học sinh mới nhập học</h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentStudents.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-3">
              {recentStudents.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-700 font-semibold text-xs">
                      {(s.ho_ten || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.ho_ten}</p>
                    <p className="text-xs text-gray-400">
                      {s.ngay_nhap_hoc
                        ? format(new Date(s.ngay_nhap_hoc), 'dd/MM/yyyy', { locale: vi })
                        : 'N/A'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                    ${s.trang_thai === 'dang_hoc'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600'}`}>
                    {s.trang_thai === 'dang_hoc' ? 'Đang học' : 'Nghỉ học'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
