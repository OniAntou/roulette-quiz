# Spec Thiết Kế: Cải Tiến Chỉ Báo Lượt Và Trạng Thái Trận Đấu

Tài liệu này mô tả các chỉnh sửa UI/UX nhằm tối giản giao diện GameBoard và đưa toàn bộ chỉ báo lượt chơi, trạng thái hành động về hiển thị tập trung tại profile của từng người chơi.

## 1. Mục Tiêu
* **Tối giản giao diện**: Xoá bỏ thanh header trên cùng (chứa vòng chơi, trạng thái link và tên phase) để màn hình game rộng rãi, tập trung hơn.
* **Định vị trực quan chỉ báo**: Chuyển các nhãn trạng thái (`DECRYPTING...`, `SUCCESS!`, `FAILED!`, `PULL TRIGGER!`) về hiển thị ngay phía trên cụm profile của người chơi tương ứng, tránh việc bị đè lên tên hoặc bị che khuất.
* **Đồng bộ hóa các phase**: Hiển thị rõ ràng lượt hành động của từng người chơi trong suốt các phase của game tại profile của họ.

## 2. Chi Tiết Thay Đổi

### A. Xoá bỏ Header trên cùng
* Trong file `client/src/components/GameBoard.tsx`, tiến hành xoá bỏ phần JSX của thanh header (từ dòng 443 đến 453):
```tsx
<div className="w-full flex items-center justify-between pb-4 border-b border-border-theme z-30">
  <span className="text-xs font-bold text-text-theme tracking-widest uppercase">
    PROTOCOL // 0{round}
  </span>
  ...
</div>
```

### B. Cải tiến hàm `renderProfileIndicator`
Cập nhật hàm `renderProfileIndicator(playerId: string)` để hỗ trợ thêm phase bóp cò súng (`trigger`):
* **Phase trả lời (`questioning` / `answering`)**: Hiển thị tag `DECRYPTING...` (màu amber, nhấp nháy) cho người đang trả lời câu hỏi (`targetPlayer`).
* **Phase bóp cò (`trigger`)**: Hiển thị tag `PULL TRIGGER!` (màu đỏ, nhấp nháy mạnh) cho người phải bóp cò súng (`triggerResult.playerId`).
* **Phase kết quả (`result`)**: Hiển thị tag `SUCCESS!` (màu emerald) hoặc `FAILED!` (màu đỏ) cho người vừa trả lời câu hỏi.

### C. Định vị lại Vị trí hiển thị Indicator trên Profile
Di chuyển vị trí gọi `renderProfileIndicator` ra ngoài avatar container để hiển thị phía trên toàn bộ cụm profile thay vì đè lên avatar hay tên người chơi:
* **Đối với đối thủ**:
  * Thêm class `relative` vào container ngoài cùng của đối thủ (`pos.className`).
  * Đặt `renderProfileIndicator(opponent.id)` ở trên cùng của container này với style absolute (`-top-8 left-1/2 -translate-x-1/2`).
* **Đối với local player**:
  * Thêm class `relative` vào box profile (`flex items-center gap-4 bg-surface-2 ...`).
  * Đặt `renderProfileIndicator(localId)` ở trên cùng của box profile này với style absolute (`-top-8 left-1/2 -translate-x-1/2`).

## 3. Kế Hoạch Kiểm Tra
1. Chạy `npm run typecheck` trong thư mục client để đảm bảo code TypeScript không bị lỗi kiểu dữ liệu.
2. Chạy thử nghiệm trực tiếp trên giao diện để kiểm tra trực quan các tag hiển thị đúng vị trí trên đầu profile của người chơi khi đến lượt tương ứng.
