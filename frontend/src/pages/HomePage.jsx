import { useEffect, useState } from 'react'
import { Layout, Card, CardHeader, CardTitle, CardContent, Loading, Alert } from '../components'
import { BarChart, Users, BookOpen, DollarSign } from 'lucide-react'

export function HomePage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // TODO: Fetch statistics from API
    setTimeout(() => {
      setStats({
        totalStudents: 250,
        totalClasses: 15,
        totalTeachers: 30,
        totalRevenue: 125000000
      })
      setLoading(false)
    }, 500)
  }, [])

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Trang chủ</h1>
        <p className="text-gray-600 mt-2">Chào mừng đến với hệ thống quản lý lớp học</p>
      </div>

      {error && (
        <Alert
          type="error"
          title="Lỗi"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Students Card */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Tổng học sinh</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalStudents}</p>
            </div>
            <Users className="text-blue-600" size={32} />
          </div>
        </Card>

        {/* Classes Card */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Tổng lớp học</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalClasses}</p>
            </div>
            <BookOpen className="text-green-600" size={32} />
          </div>
        </Card>

        {/* Teachers Card */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Tổng giáo viên</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalTeachers}</p>
            </div>
            <Users className="text-purple-600" size={32} />
          </div>
        </Card>

        {/* Revenue Card */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Tổng doanh thu</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{(stats?.totalRevenue / 1000000).toFixed(1)}M</p>
            </div>
            <DollarSign className="text-yellow-600" size={32} />
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Hoạt động gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 py-3 border-b">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users size={18} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Thêm học sinh mới</p>
                <p className="text-xs text-gray-500">Hôm qua</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 py-3 border-b">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <BookOpen size={18} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Cập nhật điểm học tập</p>
                <p className="text-xs text-gray-500">2 ngày trước</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 py-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <DollarSign size={18} className="text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Thanh toán học phí</p>
                <p className="text-xs text-gray-500">3 ngày trước</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Layout>
  )
}
