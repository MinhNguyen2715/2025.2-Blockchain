Đề bài: Xây dựng hệ thống cung cấp và xác thực bằng tốt nghiệp điện tử. Một sinh viên (holder) có thể chứng minh đã tốt nghiệp 1 lĩnh vực cụ thể mà không cần tiết lộ bảng điểm / thông tin cá nhân
- Sử dụng ECC để ký bằng được cấp bởi đại học
- Sử dụng kiến trúc Merkel Tree. Mỗi môn / điểm là 1 node lá. Sinh viên chỉ cung cấp Merkle Proof cho những môn học được yêu cầu, mà không cần tiết lộ toàn bộ bảng điểm.
- On-chain Registry: Triển khai một smart contract để:
+ Quản lý danh sách các tổ chức phát hành hợp lệ (các trường đại học)
+ Duy trì danh sách thu hồi (Revocation List) cho các chứng chỉ không còn hợp lệ

Mình chia việc như này:
Anh Minh: làm smart contract
Nhật Minh: ECC + Merkle tree
Duy: Backend
Nam Anh: Frontend + slide
