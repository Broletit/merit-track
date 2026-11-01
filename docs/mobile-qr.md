# Quét QR trên điện thoại

Camera yêu cầu HTTPS có chứng chỉ được tin cậy và quyền truy cập camera trên điện thoại.

## HTTPS tạm để thử

Chỉ chạy sau khi đồng ý chia sẻ web cục bộ qua Cloudflare. Ai có đường dẫn đều có thể mở trang đăng nhập; quyền truy cập dữ liệu vẫn do tài khoản và phân quyền của ứng dụng kiểm soát. Không chia sẻ tài khoản hoặc đường dẫn cho người không liên quan.

1. Giữ máy tính chạy web bằng npm run dev.
2. Chạy npm run mobile:share. Công cụ cloudflared phải có tại node_modules/.cache/cloudflared/cloudflared.exe (đã tải cho máy hiện tại).
3. Mở đường dẫn PHONE in trên terminal bằng Chrome trên Android hoặc Safari trên iPhone. Không mở trong trình duyệt tích hợp của ứng dụng nhắn tin.
4. Đăng nhập tài khoản cán bộ khoa có quyền điểm danh, chọn hoạt động đang diễn ra, nhấn Mở camera và cho phép camera.
5. Đưa QR cá nhân của sinh viên vào khung, chờ kết quả điểm danh.
6. Chạy npm run mobile:stop để đóng truy cập qua Internet. Web trên máy tính vẫn chạy.

Đường dẫn thay đổi mỗi lần tạo tunnel. Máy tính phải bật và có Internet. Tệp tmp/mobile-access.json lưu đường dẫn và tiến trình của tunnel; .env.local lưu đúng hostname để Next.js cho phép tải tài nguyên phát triển qua địa chỉ này.

## Dùng lâu dài

Triển khai ứng dụng lên máy chủ có tên miền và HTTPS được tin cậy. Với mạng nội bộ, cần chứng chỉ gồm đúng địa chỉ IP/tên miền của máy chủ và cài CA tin cậy lên từng điện thoại; bỏ qua cảnh báo chứng chỉ không đủ để bảo đảm quyền camera.

Tài liệu: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia ; https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/
