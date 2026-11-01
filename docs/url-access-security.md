# Bảo vệ đường dẫn và dữ liệu

Cập nhật ngày 16/10/2026.

## Phạm vi đã triển khai

- Hoạt động: giữ URL công khai `/a/<mã>` và `/o/<mã>`.
- Người dùng: `/dashboard/admin/users/<mã>`.
- Các trang chi tiết còn lại: đợt xét, hồ sơ, xét duyệt, sinh viên, hồ sơ cán bộ, khung tiêu chuẩn; bao gồm chỉnh sửa, ứng viên và cấu hình.
- Các API chi tiết hoạt động/hồ sơ và tải minh chứng: hỗ trợ mã URL và tự chuyển GET từ ID số sang mã ngẫu nhiên.
- Các đường dẫn cũ trong thông báo và liên kết vẫn hoạt động bằng chuyển hướng. Các biểu mẫu đang mở được phép gửi tới địa chỉ cũ; Server Actions/API vẫn phải xác thực và kiểm tra quyền trước khi xử lý.

Mã được tạo bằng `crypto.randomBytes(16)`, tương đương 128 bit ngẫu nhiên, lưu ánh xạ trong SQLite. Mã ổn định qua các lần mở; không dùng Base64 để giả làm mã hóa. Mã trang chi tiết được ràng buộc với đường dẫn/vai trò/thao tác, không thể lấy mã xem hồ sơ để ghép thành mã chỉnh sửa đợt xét. Query bộ lọc và phân trang được giữ nguyên.

## Kiểm soát truy cập

Proxy kiểm tra phiên đăng nhập còn hiệu lực và tài khoản còn hoạt động trước khi giải mã ánh xạ. Các trang và Server Actions tiếp tục kiểm tra quyền riêng; Proxy không thay thế các lớp này. Hồ sơ sinh viên kiểm tra người sở hữu; cán bộ lớp kiểm tra lớp hiện tại; cán bộ khoa kiểm tra phân công lớp. API quản trị yêu cầu cả vai trò admin và giao diện admin.

Các API POST đang dùng ID số trong biểu mẫu được giữ tương thích; ID không phải mật khẩu hay quyền truy cập. Các trường lọc lớp, học kỳ, phân trang cũng không được coi là bí mật. Không thể ngăn mọi cuộc tấn công chỉ bằng che ID.

## Minh chứng

Minh chứng mới được ghi vào `uploads/submissions` ngoài thư mục công khai. API tải tệp kiểm tra chủ hồ sơ hoặc quyền quản lý lớp; người duyệt không được mở minh chứng của bản nháp chưa nộp và không có yêu cầu hỗ trợ. Admin phải ở giao diện admin để xem hồ sơ người khác. Phản hồi tệp có `Cache-Control: private, no-store`.

Tệp cũ trong `public/uploads/submissions` vẫn được đọc dự phòng để tránh mất dữ liệu. Proxy chuyển tất cả lượt truy cập trực tiếp `/uploads/submissions/*` qua API kiểm tra quyền, kể cả khi người dùng có đường dẫn tệp cũ.

Khi triển khai, mọi yêu cầu phải đi qua Next.js. Không cấu hình Nginx/CDN phục vụ trực tiếp thư mục minh chứng cũ hoặc bỏ qua Proxy. Docker Compose có volume riêng cho `uploads` và giữ volume cũ để tương thích. Hai thư mục được loại khỏi Git và Docker build context. Cần sao lưu cả cơ sở dữ liệu và hai volume tệp.

## Kiểm tra

`node tests/url-access-security.test.cjs` kiểm tra các nhóm trang động hiện có, chuyển hướng/viết lại, giữ query, mã sai, tráo mã giữa vai trò/thao tác, phiên hết hạn/bị thu hồi và phạm vi đọc minh chứng. Các bộ kiểm thử `platform-features` và `public-user-url` tiếp tục kiểm tra URL hoạt động/người dùng và bảo vệ chức năng đã có.

Đây là gia cố ở mức mã nguồn và kiểm thử hồi quy; không phải chứng nhận không còn lỗ hổng hay một đợt kiểm thử xâm nhập độc lập. Khi lên host cần HTTPS, bảo vệ bí mật cấu hình, giới hạn truy cập máy chủ/cơ sở dữ liệu, cập nhật phụ thuộc và theo dõi lỗi truy cập.

Tham khảo: [OWASP IDOR Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html).
