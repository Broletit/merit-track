# Các thay đổi về giao diện, thông báo, URL và khôi phục tài khoản

## 1. Báo thiếu lý do mà không làm giật trang

Form nhập danh sách tham gia có vùng lỗi riêng bên dưới Lý do, với chiều cao được dành sẵn. Thông báo xuất hiện/biến mất trong vùng đó nên tiêu đề và các ô cùng hàng không bị đẩy lên xuống. `FormUxGuard` nhận diện form có `data-stable-validation`, tập trung vào trường sai bằng `focus({preventScroll:true})` và không gọi `scrollIntoView` cho form này. Các form khác chỉ cuộn tới trường lỗi nếu trường nằm ngoài màn hình.

Nhập thành công làm mới trạng thái form bằng React key và cập nhật dữ liệu qua `router.refresh()`, giữ vị trí trang. Việc kiểm tra required vẫn xảy ra ngay tại trường và không đổi thành modal.

## 2. Thông báo thuộc tài khoản và ngữ cảnh vai trò

Một tài khoản có thể đang dùng vai trò sinh viên hoặc cán bộ. Chỉ `user_id` không đủ để quyết định nơi hiển thị thông báo, vì cùng một người có nhiều ngữ cảnh sử dụng.

Database bổ sung `role_context` cho lượt đăng ký hoạt động và thông báo. Khi đăng ký hoạt động sinh viên, ngữ cảnh được lưu là student; khi đăng ký hoạt động cán bộ, hệ thống lưu ngữ cảnh cán bộ đang sử dụng. Khi điểm danh bằng QR, thủ công hoặc nhập file, thông báo lấy ngữ cảnh từ lượt đăng ký, không đơn thuần lấy chức danh hiện tại của người đó.

Danh sách thông báo, tổng số bản ghi, số chưa đọc, đánh dấu từng thông báo và đánh dấu tất cả đều kiểm tra cả `user_id` và `role_context`. Thông báo cũ được phân loại theo đường dẫn đích đã lưu; dữ liệu cũ không lưu lịch sử vai trò tại thời điểm đăng ký thì chỉ có thể suy ra từ loại hoạt động và vai trò hiện tại. Từ bản cập nhật này ngữ cảnh được ghi nhận trực tiếp.

Migration SQLite có thể chạy lại và không xóa các thông báo cũ. Trigger phân loại các thông báo tạo bởi những luồng hiện có nếu chưa truyền ngữ cảnh rõ ràng. Thông báo xét hồ sơ sinh viên vẫn thuộc vai trò sinh viên; xét hồ sơ cán bộ thuộc ngữ cảnh cán bộ của hồ sơ.

## 3. URL công khai của hoạt động

Đường dẫn `/dashboard/admin/activities/23` là đường dẫn ứng dụng, không phải địa chỉ thư mục trên ổ đĩa. Việc nhìn thấy số 23 không tự cấp quyền xem hoặc sửa dữ liệu. Tuy vậy, thay số tuần tự bằng mã ngẫu nhiên giúp tránh việc đoán hàng loạt URL.

Bản cập nhật dùng mã công khai 128 bit từ `crypto.randomBytes`, lưu ánh xạ trong bảng `activity_public_ids`. Đây là mã định danh ngẫu nhiên, không phải mã hóa mật khẩu hay mã hóa nội dung database.

- Hoạt động thông thường: `/a/<32 ký tự hex>`.
- Hoạt động dành cho cán bộ: `/o/<32 ký tự hex>`.
- Chỉnh sửa hoạt động: thêm `/edit`, chỉ dành cho ngữ cảnh quản trị viên.

Next.js Proxy chuyển đường dẫn cũ sang đường dẫn công khai khi truy cập, rồi rewrite bên trong tới trang tương ứng với ngữ cảnh phiên đăng nhập. Các phần quản lý, tham gia và giới hạn phạm vi vẫn dùng kiểm tra quyền của trang/server action. Mã công khai không thay thế kiểm tra quyền và không được coi là bí mật xác thực. API và dữ liệu nghiệp vụ bên trong vẫn sử dụng ID database; bản cập nhật này áp dụng cho URL trang hoạt động, không đổi mọi loại bản ghi khác trong hệ thống.

Menu được đồng bộ để vẫn đánh dấu đúng mục đang mở khi dùng URL công khai. Cần giữ cả bảng ánh xạ khi sao lưu/chuyển hosting để link không thay đổi.

## 4. Footer

Footer chung xuất hiện trong phần nội dung của dashboard và trên các trang xác thực. Thiết kế co giãn theo chiều rộng điện thoại, có tên hệ thống, phạm vi chức năng, hướng dẫn liên hệ quản trị viên của đơn vị và tên nhà phát triển **DAO HOA ANH THU**. Không tạo email/số điện thoại hỗ trợ giả hoặc cam kết pháp lý chưa có.

## 5. Quên mật khẩu qua email

### Cách người dùng thực hiện

1. Tại trang đăng nhập chọn Quên mật khẩu.
2. Nhập MSSV/tên đăng nhập và email đã có trong hồ sơ.
3. Hệ thống gửi mã 6 chữ số đến đúng email đã đăng ký nếu thông tin khớp với tài khoản hoạt động.
4. Nhập mã và mật khẩu mới gồm ít nhất 8 ký tự. Mật khẩu không được vượt quá giới hạn 72 byte của bcrypt.
5. Đổi thành công thì mã không dùng lại được; các phiên đăng nhập của tài khoản bị thu hồi. Người dùng đăng nhập lại bằng mật khẩu mới.

Email phải khớp với MSSV trong tài khoản đang hoạt động. Nếu không khớp, giao diện báo rõ và không gửi mã. Chỉ thông báo đã gửi sau khi Resend chấp nhận thư. Hệ thống không gửi mật khẩu hiện tại qua email và không tự đăng nhập sau khi đổi mật khẩu.

### Kiểm soát an toàn

- Sinh mã bằng `crypto.randomInt`, sinh mã yêu cầu bằng `crypto.randomBytes`.
- Mã hết hạn sau 10 phút, giới hạn 5 lần nhập sai cho mỗi yêu cầu.
- Giới hạn 3 yêu cầu trong 15 phút cho một tài khoản và 10 yêu cầu trong 15 phút theo địa chỉ IP được proxy chuyển tiếp.
- Database chỉ lưu HMAC-SHA256 của mã, dùng khóa bí mật riêng của máy chủ; không lưu OTP rõ.
- Đổi mật khẩu, đánh dấu mã đã dùng và thu hồi phiên được thực hiện trong transaction SQLite.
- Mật khẩu mới được hash bằng bcrypt; có kiểm tra tài khoản đang hoạt động khi thực hiện đổi.
- Email được gửi và chờ xác nhận từ Resend trước khi phản hồi thành công; không đưa mã vào URL, phản hồi client hoặc log. Lỗi gửi thư được báo rõ, không lộ thông tin Resend.
- Cấu hình reverse proxy phải bảo đảm X-Forwarded-For do proxy đáng tin cậy cung cấp. Hạn mức theo tài khoản vẫn được kiểm tra độc lập.

### Email gửi và email nhận là hai phần khác nhau

Email sinh viên đã có trong hồ sơ là email **nhận**. Hệ thống cần một email **gửi**, tốt nhất là Gmail dành riêng cho ứng dụng. Gmail dùng mật khẩu ứng dụng sau khi bật xác minh hai bước; không dùng mật khẩu Gmail thông thường và không gửi mật khẩu đó trong chat.

Tham khảo `deploy/mail.env.example`. Trên máy phát triển, điền Resend_HOST, Resend_PORT, Resend_USER, Resend_PASS và Resend_FROM trong `.env.local`. Khóa PASSWORD_RESET_SECRET đã được tạo ngẫu nhiên trên máy hiện tại và không đưa vào Git. Trên hosting phải tạo khóa riêng bằng lệnh trong file mẫu, lưu bền vững cùng cấu hình server và truyền các biến qua Compose/runtime.

Resend SDK không thu phí thư viện. Gmail có thể dùng cho thử nghiệm trong hạn mức gửi của tài khoản; không phải dịch vụ gửi thư không giới hạn. Khi triển khai thật cần theo dõi hạn mức, lỗi gửi và khả năng thư rơi vào Spam. Nếu chưa cấu hình Resend, giao diện báo chức năng gửi mã chưa sẵn sàng; không coi việc viết mã nguồn là đã gửi email thật thành công.

### Công cụ được sử dụng

Next.js App Router, Server Actions, Proxy, React, TypeScript, Tailwind CSS, SQLite/better-sqlite3, Node.js crypto, Resend SDK Resend và bcryptjs. Không cần SMS trả phí hoặc dịch vụ xác thực bên ngoài để thực hiện luồng này.

## Kiểm tra và giới hạn xác nhận

Các bài kiểm tra bằng SQLite trong bộ nhớ kiểm tra việc tách thông báo theo vai trò, không đánh dấu đọc chéo, ánh xạ URL và chặn chỉnh sửa không đúng vai trò, hạn OTP, số lần nhập sai, hạn mức gửi, dùng một lần và thu hồi đúng phiên. Kiểm tra form mô phỏng xác nhận không cuộn trang, không chèn thêm chiều cao khi báo lỗi và xóa cảnh báo khi sửa đúng.

```sh
node tests/platform-features.test.cjs
node tests/stable-form-validation.test.cjs
node node_modules/typescript/bin/tsc --noEmit
npm run build
```

Cần kiểm thử gửi thư thật sau khi có cấu hình Resend và kiểm tra bố cục trên thiết bị thực tế. Các bài kiểm tra tự động không khẳng định Gmail đã nhận được thư khi chưa có tài khoản gửi.

## Tài liệu nền tảng

- Next.js Proxy: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- Next.js after: https://nextjs.org/docs/app/api-reference/functions/after
- OWASP Forgot Password: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- Resend SDK Gmail: https://Resend SDK.com/guides/using-gmail
- Google App Passwords: https://support.google.com/mail/answer/185833

Cập nhật luồng khôi phục: hiển thị đếm ngược hiệu lực mã 10 phút; gửi lại sau 60 giây ngay tại bước nhập mã; mã cũ chỉ mất hiệu lực sau khi gửi mã mới thành công. Đổi mật khẩu thành công hiển thị modal 7 giây rồi tự về đăng nhập; đóng modal, nhấn Esc hoặc nhấn ngoài cũng chuyển ngay. Trang đổi mật khẩu có nút quay về đúng giao diện vai trò; tài khoản buộc đổi mật khẩu tạm có thể quay lại đăng nhập bằng thao tác đăng xuất.
