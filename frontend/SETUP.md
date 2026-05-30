# Quản Lý Lớp Học - Frontend

Ứng dụng web quản lý lớp học xây dựng với React, Vite và Tailwind CSS.

## Tính Năng

- 📚 **Quản lý học sinh** - Thêm, chỉnh sửa, xóa học sinh
- 👥 **Quản lý lớp học** - Tạo và quản lý các lớp học
- 📋 **Điểm danh** - Ghi nhận sự có mặt của học sinh
- 📊 **Quản lý điểm** - Theo dõi kết quả học tập
- 💰 **Quản lý tài chính** - Ghi nhận học phí và các khoản chi

## Yêu Cầu

- Node.js >= 16
- npm >= 8

## Cài Đặt

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình môi trường

Tạo file `.env` với nội dung:

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Quản Lý Lớp Học
```

### 3. Khởi động server development

```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:5174/`

## Cấu Trúc Dự Án

```
frontend/
├── src/
│   ├── components/          # Các component UI dùng chung
│   │   ├── Navbar.jsx      # Thanh điều hướng
│   │   ├── Layout.jsx      # Layout chính của trang
│   │   ├── Card.jsx        # Component thẻ
│   │   ├── Button.jsx      # Component nút
│   │   ├── Input.jsx       # Component input
│   │   ├── Select.jsx      # Component select
│   │   ├── Table.jsx       # Component bảng
│   │   ├── Alert.jsx       # Component thông báo
│   │   ├── Loading.jsx     # Component loading
│   │   └── index.js        # Export tất cả components
│   ├── pages/              # Các trang của ứng dụng
│   │   ├── HomePage.jsx    # Trang chủ
│   │   ├── StudentsPage.jsx # Trang quản lý học sinh
│   │   ├── ClassesPage.jsx  # Trang quản lý lớp học
│   │   └── index.js        # Export tất cả pages
│   ├── services/           # API services
│   │   ├── api.js          # Cấu hình axios
│   │   ├── studentService.js
│   │   ├── classService.js
│   │   ├── attendanceService.js
│   │   ├── resultService.js
│   │   └── financeService.js
│   ├── hooks/              # Custom React hooks
│   │   ├── useAsync.js     # Hook để xử lý async operations
│   │   ├── useFetch.js     # Hook để fetch dữ liệu
│   │   ├── useForm.js      # Hook để quản lý form
│   │   └── index.js        # Export tất cả hooks
│   ├── utils/              # Utilities
│   │   ├── cn.js           # Merge Tailwind classes
│   │   ├── constants.js    # Các hằng số
│   │   └── formatters.js   # Các hàm format dữ liệu
│   ├── assets/             # Hình ảnh, icon, v.v.
│   ├── App.jsx             # Root component
│   ├── main.jsx            # Entry point
│   ├── App.css             # CSS cho App
│   └── index.css           # CSS global
├── public/                 # Static files
├── package.json            # Dependencies
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── postcss.config.js       # PostCSS configuration
├── .env                    # Environment variables
├── .env.development        # Development environment
├── .env.production         # Production environment
└── eslint.config.js        # ESLint configuration
```

## Lệnh

### Development

```bash
npm run dev       # Khởi động server development
```

### Build

```bash
npm run build     # Build cho production
```

### Preview

```bash
npm run preview   # Xem preview production build
```

### Lint

```bash
npm run lint      # Kiểm tra linting
```

## API Integration

### API Configuration

File `src/services/api.js` cấu hình Axios instance với:

- Base URL từ environment variable `VITE_API_URL`
- Request interceptor để thêm token authentication
- Response interceptor để xử lý lỗi 401 (redirect to login)

### Services

Mỗi module trong `src/services/` cung cấp các hàm để gọi API:

```javascript
import studentService from "../services/studentService";

// Lấy tất cả học sinh
const students = await studentService.getAll();

// Lấy học sinh theo ID
const student = await studentService.getById(id);

// Tạo học sinh mới
const newStudent = await studentService.create(data);

// Cập nhật học sinh
const updated = await studentService.update(id, data);

// Xóa học sinh
await studentService.delete(id);

// Tìm kiếm
const results = await studentService.search(query);
```

## Custom Hooks

### useAsync

```javascript
import { useAsync } from "../hooks";

function MyComponent() {
  const { execute, status, data, error } = useAsync(asyncFunction);

  return (
    <div>
      {status === "pending" && <p>Loading...</p>}
      {status === "success" && <p>{data}</p>}
      {status === "error" && <p>{error.message}</p>}
    </div>
  );
}
```

### useFetch

```javascript
import { useFetch } from "../hooks";

function MyComponent() {
  const { fetchData, status, data, error } = useFetch(asyncFunction);

  useEffect(() => {
    fetchData();
  }, []);

  return <div>{/* ... */}</div>;
}
```

### useForm

```javascript
import { useForm } from "../hooks";

function MyForm() {
  const { formData, errors, handleChange, handleSubmit } = useForm(
    { name: "", email: "" },
    async (data) => {
      await api.post("/submit", data);
    },
  );

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" value={formData.name} onChange={handleChange} />
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Utils

### Formatters

```javascript
import { formatCurrency, formatDate, formatPhone } from "../utils/formatters";

formatCurrency(100000); // 100.000 ₫
formatDate(new Date()); // 29/05/2026
formatPhone("0123456789"); // 012 345 6789
```

### Constants

```javascript
import { GENDER_OPTIONS, STATUS_OPTIONS } from "../utils/constants";

// Sử dụng cho Select component
<Select options={GENDER_OPTIONS} />;
```

## Technologies

- **React 19** - UI Framework
- **Vite** - Build tool
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Radix UI** - Headless UI components
- **Lucide React** - Icons
- **ESLint** - Code linting

## Authentication

Token được lưu trong localStorage. Hệ thống sẽ tự động:

- Gửi token trong header `Authorization: Bearer {token}` cho mỗi request
- Redirect đến login nếu token hết hạn (401 response)

## Responsive Design

Ứng dụng sử dụng Tailwind CSS breakpoints:

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Port 5173 đã được sử dụng

Vite sẽ tự động sử dụng port khác (e.g., 5174). Kiểm tra console để biết port được sử dụng.

### Dependencies không cài đặt

```bash
rm -rf node_modules
npm install
```

### Module not found errors

Đảm bảo đã cài đặt tất cả dependencies:

```bash
npm install
```

## Contributing

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

Dự án này được cấp phép dưới MIT License.
