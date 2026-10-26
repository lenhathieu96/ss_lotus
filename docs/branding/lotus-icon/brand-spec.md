# SS Lotus — Thiết kế icon hoa sen

Ngày: 2026-10-26. Trạng thái: logo được người dùng chốt; đã tích hợp vào ứng dụng và theme xanh–trắng. Tên thương hiệu hiển thị vẫn là **SS Lotus**, không đổi.

## Nguồn và hướng thiết kế

- Tham chiếu người dùng cung cấp: `/Users/hieule/Documents/favicon.svg`; bản sao giữ nguyên tại `reference-original.svg`.
- Màu thiết kế mới lấy trực tiếp từ gradient trong `reference-original.svg`. Theme ứng dụng hiện tại vẫn được mô tả trong [design guidelines](../../design-guidelines.md).
- Giữ đường cong hoa sen, dáng người và nét S từ mẫu gốc. Bỏ sáu cánh phụ; giữ lại gradient xanh–tím của mẫu gốc theo yêu cầu mới. Tọa độ hình được làm tròn còn hai chữ số thập phân.
- Phạm vi gồm biểu tượng ứng dụng và theme xanh–trắng; giữ typography, bố cục, navigation và nghiệp vụ.

## Bảng màu thiết kế mới

| Vai trò | Vị trí trong gradient gốc | HEX |
| --- | --- | --- |
| Xanh lá chủ đạo | 0% | `#53B175` |
| Xanh ngọc chuyển tiếp | 50% | `#5B897D` |
| Tím điểm nhấn | 100% | `#69428B` |
| Biểu tượng trên nền gradient | Màu tương phản hỗ trợ | `#FFFFFF` |

HEX là giá trị RGB 8-bit làm tròn từ phần trăm RGB của SVG gốc. Các SVG bàn giao giữ toàn bộ điểm màu và giá trị phần trăm RGB ban đầu, không chỉ dùng ba màu đại diện. Icon dùng gradient từ xanh lá ở trên xuống tím ở dưới, nghiêng nhẹ theo mẫu gốc; logo nền trong dùng gradient theo tọa độ của mẫu gốc.

Theo lựa chọn mới nhất của người dùng, theme ưu tiên xanh và trắng: primary xanh `#287A4B`, hover xanh đậm `#21653E`, chữ trắng và nền xanh nhạt. Xanh logo `#53B175` và tím `#69428B` giữ nguyên trong logo; trắng trên xanh logo chỉ 2,65:1 nên nút dùng sắc xanh đậm hơn. Chi tiết nằm trong [design guidelines](../../design-guidelines.md).

## Tệp bàn giao

- `lotus-design-board.png`: bảng duyệt 1440 × 980, gồm tham chiếu, đề xuất, màu và mẫu kích thước nhỏ.
- `lotus-mark-primary.svg`: logo gradient xanh–tím nền trong; giữ tên file để không làm hỏng liên kết bàn giao.
- `lotus-mark-white.svg`: logo trắng nền trong, dùng trên nền màu.
- `lotus-app-icon.svg`: icon bo góc 512 × 512.
- `lotus-app-icon-square.svg`: icon vuông không bo góc, dành cho hệ thống tự áp mặt nạ.
- `lotus-app-icon-512.png`, `lotus-app-icon-192.png`: xuất PNG.
- `lotus-favicon.svg`, `lotus-favicon-32.png`, `lotus-favicon.ico`: favicon với biểu tượng lớn hơn và nét dày hơn. ICO chứa 16, 32, 48px.

Giữ nguyên tỷ lệ, dùng khoảng trống quanh logo. Dùng logo gradient trên nền trắng hoặc sáng; trên nền gradient dùng bản trắng.

## Kiểm tra

Đã đọc cấu trúc XML, đối chiếu toàn bộ điểm màu với SVG gốc, render bằng librsvg và kiểm tra trực quan bảng duyệt. Không thấy clipping. PNG đã kiểm tra kích thước; ICO có đủ ba cỡ. Bản logo chính rõ ở 32–64px; 16px giảm chi tiết nét S nên có favicon riêng với hình lớn hơn và nét dày hơn. Logo đã áp dụng qua `src/components/brand-logo.tsx`; metadata trỏ tới favicon và touch icon thật. Không triển khai production.
