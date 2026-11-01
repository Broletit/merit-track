# Gia cố yêu cầu API và Server Actions

Cập nhật ngày 16/10/2026. Phạm vi: ngăn bỏ qua giao diện để xem, sửa, duyệt hoặc xóa dữ liệu trái quyền.

## Các sửa đổi

- Các Server Action chuyển lớp, đặt lại mật khẩu sinh viên và xem trước import yêu cầu quyền admin ngay tại hàm, trước khi truy cập cơ sở dữ liệu.
- Duyệt hồ sơ và duyệt tiêu chí dùng chung kiểm tra vai trò thực, giao diện đang sử dụng, vòng xét, trạng thái đợt xét và lớp được phân công. Cán bộ khoa đang dùng giao diện sinh viên không được gọi thao tác duyệt. Tiêu chí hồ sơ cán bộ chỉ được admin duyệt ở đúng luồng và thời gian cho phép.
- Tạo hồ sơ sinh viên kiểm tra phạm vi lớp của đợt xét và lớp sinh hoạt còn hiệu lực. Lưu, nộp và yêu cầu hỗ trợ từ giao diện sinh viên chỉ áp dụng hồ sơ thuộc đợt xét sinh viên.
- Mã tiêu chí gửi từ trình duyệt phải có trong đợt xét của hồ sơ. Không chấp nhận tiêu chí giả, tiêu chí đợt khác hoặc danh sách bị trùng. Tên tệp lưu được tạo ngẫu nhiên bằng UUID, không ghép mã tiêu chí do trình duyệt gửi vào đường dẫn đĩa.
- Sau khi đọc tệp tải lên, giao dịch ghi minh chứng kiểm tra lại chủ sở hữu, trạng thái hồ sơ và thời gian nhận hồ sơ; không ghi nếu hồ sơ đã bị khóa trong lúc tải tệp.
- Xác nhận điểm danh thủ công dùng cùng luồng kiểm tra với máy quét. Không điểm danh lượt đăng ký đã hủy; người tham gia phải còn hoạt động; không bỏ qua thời gian điểm danh bằng cách gọi nút thủ công.
- API được kiểm tra phiên trước khi xử lý; API quản trị yêu cầu vai trò và giao diện admin, trả 401/403 cho yêu cầu không đủ quyền. `/api/auth/me` vẫn cho phép truy vấn trạng thái chưa đăng nhập và trả `user: null`.
- API thay đổi dữ liệu từ nguồn khác bị từ chối bằng kiểm tra Origin và Fetch Metadata. Công cụ CLI có thể không gửi Origin, nhưng vẫn phải có phiên và quyền hợp lệ. Không coi Origin là bằng chứng xác thực.
- Yêu cầu API có Content-Length khai báo quá 50 MB bị từ chối sớm. Đây không phải giới hạn đọc luồng cho mọi trường hợp chunked; khi lên host cần cấu hình giới hạn request body tại reverse proxy. Server Actions đã có giới hạn body của Next.js.
- Đặt lại mật khẩu và thay đổi quyền/trạng thái tài khoản thu hồi các phiên hiện có. Đổi mật khẩu cũng thu hồi mọi phiên cũ rồi tạo lại phiên cho chính người đang đổi.
- Tài khoản có cờ `must_change_pw` phải đổi mật khẩu tạm trước khi dùng chức năng được bảo vệ. Mật khẩu mới tối thiểu 8 ký tự, tối đa 72 byte theo giới hạn bcrypt.
- Đăng nhập không giới hạn theo IP và không tạm chặn tài khoản do nhập sai mật khẩu. Người dùng nhập đúng vẫn đăng nhập được sau nhiều lần sai; trạng thái khóa do admin quản lý vẫn có hiệu lực.

## Kiểm thử

`node tests/direct-request-security.test.cjs` tự duyệt các file Server Action được bảo vệ và xác nhận 62 hàm từ chối người chưa đăng nhập trước khi truy cập cơ sở dữ liệu. Kiểm tra thêm bằng phiên sinh viên/cán bộ/admin giả lập, SQLite trong bộ nhớ và gọi trực tiếp các hàm thật:

- Sinh viên không đặt lại mật khẩu, chuyển lớp, sửa quyền, xóa hoạt động hoặc xem trước dữ liệu import được.
- Cán bộ không duyệt lớp ngoài phân công hoặc khi đang ở giao diện sinh viên.
- Không chỉnh sửa minh chứng của người khác hoặc dùng mã tiêu chí giả; sau yêu cầu bị từ chối dữ liệu không thay đổi.
- Không duyệt hồ sơ ngoài trạng thái/thời gian cho phép.
- Đặt lại mật khẩu chỉ thu hồi phiên của đúng tài khoản và không sửa tài khoản admin.
- Đăng nhập đúng vẫn thành công sau nhiều lần nhập sai; nhiều tài khoản dùng cùng IP không bị chặn bởi bộ đếm đăng nhập.
- Từ chối Origin lạ, nguồn cross-site và dung lượng khai báo quá lớn.

`tests/url-access-security.test.cjs`, `tests/platform-features.test.cjs`, `tests/submission-required-evidence.test.cjs` và `tests/camera-inline.test.cjs` kiểm tra hồi quy URL, phiên, quyền tải minh chứng, quy trình hồ sơ và máy quét.

Đây là kiểm thử mã nguồn và tích hợp trong môi trường thử nghiệm; không phải chứng nhận không có lỗ hổng hoặc kiểm thử xâm nhập độc lập trên host thật. Hạ tầng triển khai cần HTTPS, reverse proxy ghi đè đúng header IP/host, giới hạn kích thước/tần suất request, giữ bí mật cấu hình và không phục vụ minh chứng trực tiếp ngoài ứng dụng.

Tham khảo: [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), tài liệu Next.js `node_modules/next/dist/docs/01-app/02-guides/data-security.md`.
