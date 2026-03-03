# OSM MBTiles Extractor

**OSM MBTiles Extractor** là một công cụ mã nguồn mở chạy trực tiếp trên trình duyệt, cho phép bạn tải xuống và trích xuất dữ liệu bản đồ offline (MBTiles) một cách dễ dàng và hoàn toàn cục bộ (không cần đẩy dữ liệu lên server).

## 🌟 Tính năng chính

Công cụ cung cấp 2 tính năng chính:

1. **Download Map (Tải bản đồ)**:
   - Cung cấp danh sách phân cấp hoặc công cụ tìm kiếm trên toàn thế giới để chọn các khu vực cụ thể (quốc gia, thành phố, châu lục).
   - Dễ dàng tải trực tiếp các tệp `.mbtiles` từ dữ liệu OpenStreetMap (OSM) của MapTiler.
   - Hỗ trợ xem trước bản đồ khu vực bằng bounding box ngay trên giao diện trước khi tải.

2. **Extract by Zoom Level (Trích xuất theo mức Zoom)**:
   - Cho phép kéo thả (Drag & Drop) hoặc chọn các tệp `.mbtiles` có sẵn từ máy tính.
   - Lọc và loại bỏ các dữ liệu hình ảnh bản đồ nằm ngoài khoảng Min Zoom và Max Zoom mong muốn.
   - Giúp tạo ra các phiên bản bản đồ "Lite" (nhẹ nhàng hơn) nhằm tiết kiệm dung lượng lưu trữ trên các thiết bị di động hoặc máy chủ cá nhân.

## 🚀 Công nghệ sử dụng

Công cụ này được thiết kế theo hướng client-side hoàn toàn, xử lý dữ liệu nặng ngay tại máy chủ của người dùng:
- **[SQL.js (WebAssembly)](https://sql.js.org/)**: Dùng để phân tích và chỉnh sửa cơ sở dữ liệu SQLite/MBTiles ngay trên RAM của trình duyệt, xuất dữ liệu tốc độ cao.
- **[MapLibre GL JS](https://maplibre.org/)**: Cho phép kết xuất không gian và vẽ ranh giới xem trước của các bản đồ khu vực.
- **Tailwind CSS**: Cho một giao diện người dùng chuyên nghiệp, đẹp mắt và tốc độ cao.

## 🛠 Cách sử dụng (Local & GitHub Pages)

### Chạy qua trình duyệt Online
Chỉ cần mở trang GitHub Pages (nếu bạn đã deploy) có chứa file `index.html`. Giao diện trực quan sẽ hướng dẫn bạn.

### Chạy trực tiếp trên máy (Offline)
Bạn có thể tải hoặc clone toàn bộ thư mục mã nguồn về máy tính và click đúp vào file `index.html` (hoặc `lite_extractor.html` nếu bạn dùng file gộp) để chạy công cụ. 
Các file logic và JSON đã được cấu hình để không bị lỗi bảo mật CORS khi chạy dạng Local (File URL).

## 💡 Lưu ý về cấu hình phần cứng
Vì công cụ tải và giải quyết SQLite database hoàn toàn qua trình duyệt bằng WebAssembly, nó phụ thuộc vào RAM máy tính của bạn:
- Khuyến cáo sử dụng công cụ nén với các file `.mbtiles` có kích thước **dưới 1GB** tới **2GB**.
- Quá trình chạy tính năng "Extract" có thể gây đơ màn hình tạm thời (khoảng một vài giây tới vài phút tùy dung lượng file) do trình duyệt đang tập trung sức mạnh CPU vào thuật toán VACUUM nén file SQLite. Xin vui lòng chờ đợi thông báo hoàn tất.

## 📦 Cấu trúc File

- `index.html` / `lite_extractor.html`: Giao diện chính và bố cục.
- `script.js`: Xử lý logic đọc file, WebAssembly SQL.js, điều khiển UI và DOM.
- `style.css`: Giao diện tùy chỉnh (custom scrollbar, animations, glassmorphism).
- `metadata.json` / `metadata.js`: Danh sách lưu trữ tọa độ Bounding Box và tên của các vùng/lãnh thổ trên Thế giới.
