# Đưa hệ thống lên hosting và dùng camera điện thoại

Ứng dụng cần Node.js chạy lâu dài, SQLite và ổ đĩa lưu dữ liệu bền vững. Cấu hình Docker/Caddy trong repository dành cho VPS Linux có Docker Compose. Không dùng hosting chỉ phục vụ HTML tĩnh. Nếu chọn serverless với ổ đĩa tạm, phải chuyển SQLite và tệp minh chứng sang dịch vụ lưu trữ phù hợp trước.

## Cấu hình đã có

- Next.js xuất bản standalone, chạy production bằng `node server.js` trong Docker.
- Caddy dùng tên miền thật để cấp/gia hạn HTTPS và chuyển HTTP sang HTTPS.
- Header `Permissions-Policy` cho phép camera trên chính website, không yêu cầu microphone.
- Camera dùng `playsInline` thông qua html5-qrcode, ưu tiên camera sau, yêu cầu người dùng nhấn Mở camera và đồng ý cấp quyền.
- Cookie đăng nhập production đã bật Secure, HttpOnly và SameSite Lax.
- Database và minh chứng nằm ở volume riêng, không nằm trong image và không mất khi rebuild.
- Không cần Cloudflare Quick Tunnel hoặc cài chứng chỉ vào iPhone.

## Trước khi chạy trên VPS

1. Trỏ DNS A của tên miền về IPv4 của VPS; chỉ đặt AAAA nếu IPv6 của VPS hoạt động. Mở cổng TCP 80/443 và tùy chọn UDP 443. Không công khai cổng 3000.
2. Sao chép mã nguồn lên VPS, không sao chép node_modules của Windows. Docker cài dependency/native SQLite cho Linux.
3. Sao chép `deploy/hosting.env.example` thành `.env` tại thư mục gốc. Đặt `APP_DOMAIN` bằng tên miền thật, ví dụ `doan.example.edu.vn`, không gồm https hoặc đường dẫn. Không đưa `.env.local` dùng thử trên máy cá nhân lên VPS.
4. Chạy `docker compose build` và `docker compose create app`.
5. Trước lần mở website, phục hồi dữ liệu hiện tại và minh chứng như phần dưới; kiểm tra tài khoản demo và đổi mật khẩu mặc định. Không công khai database trắng đang có cơ chế tự tạo dữ liệu/tài khoản demo.
6. Chạy `docker compose up -d`. Caddy tự lấy chứng chỉ khi DNS/cổng đã đúng.

## Giữ dữ liệu hiện tại

Tạm dừng ứng dụng nguồn trước khi sao chép cả thư mục `data/` và `public/uploads/` sang VPS để SQLite không bị sao chép giữa lúc đang ghi. Giữ thêm bản sao lưu độc lập.

Sau `docker compose create app`, trong thư mục dự án trên VPS:

```sh
docker compose cp ./data/. app:/app/data/
docker compose cp ./public/uploads/. app:/app/public/uploads/
docker compose run --rm --user root app chown -R node:node /app/data /app/public/uploads
docker compose up -d
```

Các lệnh phục hồi này dành cho lần chuyển dữ liệu đầu tiên, khi app đích chưa chạy. Không ghi đè SQLite đang hoạt động. Với các lần cập nhật mã, chỉ chạy `docker compose up -d --build`; không phục hồi lại bản database cũ. Không dùng `docker compose down -v` vì tùy chọn đó xóa volume dữ liệu.

## Kiểm tra sau khi triển khai

```sh
docker compose logs --tail=100 app https
curl -I https://TEN-MIEN/login
```

Kết quả cần có chứng chỉ tin cậy và header `Permissions-Policy: camera=(self), microphone=(), geolocation=()`; truy cập HTTP phải chuyển sang HTTPS. Đăng nhập, kiểm tra danh sách sinh viên/hồ sơ/minh chứng cũ trước khi đưa vào sử dụng.

Trên iPhone: mở tên miền bằng Safari, đăng nhập tài khoản cán bộ khoa, vào Điểm danh, chọn hoạt động đang diễn ra, nhấn Mở camera, chọn Cho phép. Dùng QR sinh viên hợp lệ để kiểm tra điểm danh thành công và kiểm tra thông báo khi quét mã không hợp lệ. Việc cấp quyền và thử camera thật cần thực hiện trên điện thoại.

Nếu Safari từng bị từ chối camera: mở cài đặt website trong Safari và đổi Camera thành Cho phép/Hỏi, sau đó mở lại trang. Không dùng trình duyệt nhúng của ứng dụng nhắn tin.

## Hosting Node.js đã có HTTPS sẵn

Có thể bỏ Caddy/Docker và dùng HTTPS do hosting cấp. Hosting vẫn phải chạy Next.js server, giữ database cùng thư mục uploads qua mỗi lần deploy, và không đặt header `Permissions-Policy` chặn camera. Dùng `npm ci`, `npm run build`, `npm start` trên hosting Node.js thông thường; bản standalone dành cho Docker tự chép static/public/schema trong Dockerfile.

Tài liệu: https://caddyserver.com/docs/automatic-https ; https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
