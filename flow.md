# Lập kế hoạch triển khai API cho hệ thống Task Management đa khách thuê (Multi-tenant)

## Bối cảnh dự án

Xây dựng backend cho một hệ thống quản lý task dạng SaaS đa khách thuê (multi-tenant), cho phép nhiều công ty/tổ chức (Workspace) độc lập cùng sử dụng chung 1 hệ thống mà không nhìn thấy dữ liệu của nhau.

**Tech stack:**
- Backend: Spring Boot 3.x, package gốc `com.example.taskmanagement`, context-path `/taskmanager`, port 8080
- Database: Microsoft SQL Server
- Frontend: React + TypeScript + Vite, port 5173
- Auth: JWT stateless (HttpOnly cookie, không dùng localStorage), có hỗ trợ OAuth2 (Google, GitHub)

## Mô hình dữ liệu (đã thiết kế xong, dựa trên ERD)

Các bảng chính: `users`, `roles`, `workspaces`, `workspace_memberships`, `refresh_tokens`, `verification_tokens`, `projects`, `project_members`, `tasks`, `comments`, `notifications`, `activity_logs`.

**Quyết định kiến trúc quan trọng — role KHÔNG gắn vào `users`:**
- Bảng `users` chỉ chứa thông tin định danh (email, password, username, provider, is_active, is_email_verified). KHÔNG có cột `role_id`.
- Role được gắn qua bảng trung gian `workspace_memberships (user_id, workspace_id, role_id, is_active)`.
- Lý do: 1 user có thể thuộc nhiều Workspace, với role khác nhau ở mỗi nơi (VD: là Leader ở công ty A, Member ở công ty B).
- Ngoại lệ: `SUPER_ADMIN` không thuộc workspace nào — xử lý qua cột riêng hoặc role đặc biệt không gắn membership.

**4 role trong bảng `roles`:**
| ID | Role | Phạm vi |
|----|------|---------|
| 1 | SUPER_ADMIN | Toàn platform, quản lý danh sách Workspace, quản lý danh sách user, KHÔNG can thiệp Project/Task bên trong |
| 2 | WORKSPACE_ADMIN | 1 Workspace cụ thể — user in WORKSPACE & settings |
| 3 | LEADER | Quản lý Project/Task trong Workspace |
| 4 | MEMBER | Thực hiện Task được giao |

**Nguyên tắc bắt buộc:** mọi API (trừ Super Admin) phải scope theo `workspaceId` lấy từ JWT claim của session hiện tại, KHÔNG lấy từ path/body — tránh 1 user thao tác chéo sang workspace khác.

## Luồng nghiệp vụ đã chốt

### 1. Đăng ký & tạo Workspace
- User tự đăng ký (`POST /auth/register`) → chỉ tạo `User`, chưa có membership nào, chưa có role.
- User đăng ký Workspace mới (`POST /auth/register-workspace`) → tạo `Workspace` + tự động tạo `WorkspaceMembership` với role `WORKSPACE_ADMIN` cho chính user đó.

### 2. Invite — role gán theo phân cấp người mời (không mặc định luôn là Member)
| Người invite | Được phép gán role |
|---|---|
| WORKSPACE_ADMIN | LEADER hoặc MEMBER |
| LEADER | chỉ MEMBER |
| MEMBER | không được invite |

Nếu email đã có account (từng đăng ký hoặc đang ở workspace khác) → chỉ tạo thêm membership mới, không đụng vào account gốc hay các membership khác.

### 3. Login & xử lý multi-workspace
- Nếu user chỉ có 1 membership active → tự động route vào workspace đó, JWT phát hành ngay với `workspaceId` + `role` tương ứng.
- Nếu user có nhiều membership active (nhiều workspace) → cần bước "chọn workspace" trước khi cấp JWT đầy đủ, hoặc endpoint `POST /auth/switch-workspace/{workspaceId}` để đổi context và cấp lại JWT.
- JWT payload cần chứa: `sub` (userId), `workspaceId`, `role`, `membershipId`.
- Super Admin: JWT có `role=SUPER_ADMIN`, `workspaceId=null`.

### 4. Email verification & Forgot password
- Dùng chung bảng `verification_tokens` với cột `type` (EMAIL_VERIFICATION / PASSWORD_RESET / WORKSPACE_INVITE), token random, có `expiry_date`, single-use.
- `forgot-password` luôn trả response giống nhau dù email tồn tại hay không (chống user enumeration).

## Yêu cầu: lập kế hoạch chi tiết các API cần viết

Hãy lập kế hoạch triển khai đầy đủ backend theo các module dưới đây. Với mỗi API, xác định: HTTP method, path, role được phép gọi, input DTO, output DTO, và các validate/business rule cần áp dụng (đặc biệt là workspace-scoping và role hierarchy).

### Module 1 — Auth
- Register (account trơn, chưa role)
- Register workspace (tạo workspace + Admin)
- Login (xử lý cả case multi-workspace)
- Switch workspace
- Logout
- Refresh token
- Verify email
- Forgot password / Reset password
- OAuth2 callback (Google, GitHub) — cần map user OAuth vào luồng workspace này

### Module 2 — Workspace (Super Admin + Workspace Admin)
- Super Admin: xem danh sách toàn bộ workspace, khóa/mở khóa 1 workspace
- Workspace Admin: xem/sửa thông tin workspace của mình

### Module 3 — User & Membership (theo hierarchy invite ở trên)
- Invite user vào workspace (theo bảng phân quyền invite)
- CRUD user trong workspace, khóa/mở khóa user
- Đổi role nội bộ của 1 membership
- Xem/cập nhật profile cá nhân, đổi password

### Module 4 — Project
- CRUD project (Leader/Workspace Admin), luôn scope theo workspace hiện tại
- Thêm/xóa member vào project (qua `project_members`)

### Module 5 — Task
- CRUD task (Leader tạo, gán priority/deadline/assignee)
- Member cập nhật status (To Do → In Progress → Review → Done, cho phép chuyển linh hoạt)

### Module 6 — Comment, Notification, Activity Log
- Comment theo task (reference thẳng task_id, user_id)
- Notification khi được giao task
- Activity log dùng polymorphic (`target_id`, `target_type`) cho mọi hành động CRUD quan trọng

### Module 7 — Dashboard, Search, Filter, Pagination
- Dashboard: Super Admin xem tổng platform; Workspace Admin/Leader xem scoped theo workspace
- Search project/task/user trong phạm vi workspace
- Filter theo status/priority
- Pagination cho danh sách task (không load hết 1 lần)

## Yêu cầu bổ sung khi lập kế hoạch
- Đề xuất thứ tự triển khai hợp lý (module nào phụ thuộc module nào).
- Chỉ rõ những chỗ cần custom authorization logic (không chỉ `@PreAuthorize` theo role suông) do phải kiểm tra thêm `workspaceId` khớp — có thể qua AOP/interceptor dùng chung.
- Với mỗi entity liên quan, xác nhận lại quan hệ JPA (`@ManyToOne`/`@OneToMany`) có khớp với ERD đã có không trước khi sinh code.