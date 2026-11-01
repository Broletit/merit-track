# Ràng buộc lớp theo khóa

- Khóa sinh viên được giữ theo khóa nhập ban đầu; chuyển lớp không đổi khóa.
- Danh sách lớp chuyển trong Người dùng và Sinh viên chỉ lấy lớp đang hoạt động cùng khóa với sinh viên. Danh sách phân công quản lý lớp cho cán bộ khoa vẫn độc lập, không bị giới hạn theo khóa cá nhân của cán bộ.
- Hai Server Action chuyển lớp kiểm tra lại khóa ở máy chủ, kể cả khi tự sửa ID lớp trong yêu cầu. Import cũng kiểm tra khóa và giữ lịch sử lớp cũ.
- Bảng `class_cohort_links` có khóa ngoại đến `classes(id)` và `cohorts(cohort)`, mỗi lớp chỉ có một dòng liên kết. Trigger đồng bộ khi tạo lớp và ngăn sửa khóa của lớp đã xác định hoặc sửa liên kết sang khóa khác.
- Trigger chặn thêm, đổi hoặc mở lại một quan hệ lớp đang hiệu lực nếu khóa sinh viên khác khóa lớp. Khóa đã nhập của sinh viên không được đổi để lách điều kiện chuyển lớp.
- Lớp mới phải chọn khóa. Tài khoản hoặc lớp chưa xác định khóa không được phân lớp mới bằng cách bỏ qua kiểm tra.

Đây là thay đổi bổ sung, không xây dựng lại bảng người dùng/lớp và không tự động phân lớp lại hàng loạt. Một trường hợp chuyển nhầm từ `DHHTTT17B` sang `DHIOT21A_CQ` đã được xác minh từ lịch sử và khôi phục về lớp cũ, giữ nguyên khóa 17. Thao tác có bản sao lưu trong `tmp/before-verified-cohort-repair-1792215169970.sqlite` và bản ghi audit `user.class.cohort_repair`.

Kiểm thử: `node tests/class-cohort-integrity.test.cjs` kiểm tra lọc lớp, hai luồng chuyển lớp, import, khóa ngoại, chặn SQL khác khóa, bảo toàn lịch sử và khởi tạo dữ liệu mới. Tham khảo cơ chế khóa ngoại trong [tài liệu SQLite](https://www.sqlite.org/foreignkeys.html).
