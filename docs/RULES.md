# Cẩm Nang Luật Chơi - Roulette Quiz (UNO x Buckshot Roulette)

## 1. Mục Tiêu Trò Chơi
Sống sót đến cuối cùng! Trò chơi là sự kết hợp giữa UNO và Buckshot Roulette. Người chơi sử dụng các thẻ bài để "né" lượt của mình hoặc ép người khác phải bóp cò súng. Người sống sót duy nhất sẽ giành chiến thắng.

## 2. Luật Đánh Bài (Card Rules)
Khi đến lượt, người chơi bắt buộc phải đánh ra 1 lá bài hợp lệ. Các lá bài kỹ năng (Action cards) có thể được đánh bất chấp con số hiện tại trên bàn là bao nhiêu.

- **Thẻ Số (NUMBER - 1 đến 9):**
  - Lá bài số đánh ra phải **LỚN HƠN HOẶC BẰNG** con số hiện tại trên bàn (Current Number).
  - *Ví dụ:* Bàn đang là số 5, bạn chỉ được đánh số 5, 6, 7, 8, 9 (hoặc thẻ kỹ năng). Nếu đánh số nhỏ hơn sẽ bị lỗi.
  - Khi đánh thẻ số, Current Number trên bàn sẽ cập nhật thành số đó.

- **Thẻ JOKER:**
  - Có tác dụng như một bức tường bất tử. Khi JOKER được đánh ra, **KHÔNG MỘT LÁ SỐ NÀO** được phép đè lên nó.
  - Người tiếp theo BẮT BUỘC phải đè 1 lá JOKER khác lên, hoặc xài các thẻ kỹ năng như SKIP, REVERSE. (KHÔNG thể dùng STANDOFF để đè lên JOKER). Nếu không có bài, họ phải dùng Mulligan hoặc Bóp Cò!

- **Thẻ SKIP:**
  - Dùng để **bỏ qua lượt của BẢN THÂN** (pass). Bạn không cần phải đánh lá số nào cả, lượt sẽ được chuyển sang người bên cạnh.
  - Current Number KHÔNG thay đổi.

- **Thẻ BLOCK:**
  - Đây là lá bùa hộ mệnh của bạn! Nó hoàn toàn là một lá bị động (Passive).
  - **CỰC KỲ HIẾM:** Chỉ có DUY NHẤT 1 lá BLOCK trong toàn bộ xấp bài. Hơn nữa, luật chơi cũng quy định mỗi người chỉ được phép ôm tối đa 1 lá BLOCK trên tay.
  - Bạn **KHÔNG THỂ** chủ động đánh lá này ra bàn dưới bất kỳ hình thức nào.
  - Tác dụng duy nhất: Nếu bạn bị bắn trúng (viên đạn thật nổ) khi Bóp Cò hoặc trong sự kiện Đấu Súng (STANDOFF), lá BLOCK trên tay bạn sẽ tự động kích hoạt để chặn đạn, cứu bạn 1 mạng!
  - Lượt chơi sẽ tiếp tục bình thường (tính như bạn đã sống sót).

- **Thẻ REVERSE (Đảo Chiều):**
  - Đảo ngược chiều đánh hiện tại của bàn.
  - **Lưu ý:** Trong ván chỉ có 2 người chơi (hoặc khi chỉ còn 2 người sống sót), lá REVERSE chỉ đơn giản là chuyển lượt sang cho đối thủ (vì đảo chiều 2 người thì cũng như không).
  - Current Number KHÔNG thay đổi.

- **Thẻ STANDOFF (Đấu Súng):**
  - Ngay lập tức kích hoạt sự kiện "Đọ Súng" toàn bàn.
  - **TẤT CẢ** những người chơi còn sống đều phải đối mặt với tỷ lệ sinh tử: Mỗi người có ngẫu nhiên `1/TOTAL_CHAMBERS` cơ hội bị trúng đạn chết ngay lập tức.
  - Người đánh lá STANDOFF cũng không ngoại lệ. Sự kiện kết thúc, ai sống sót sẽ chơi tiếp, người đánh lá bài sẽ được kết thúc lượt và chuyển sang người kế tiếp.

## 3. Cơ Chế Bóp Cò (Pull Trigger) & Mulligan (Đổi Bài)
Nếu đến lượt mà bạn **KHÔNG CÓ BÀI HỢP LỆ** để đánh:

1. **Mulligan (Đổi bài):**
   - Khi tới lượt, người chơi được phép đánh bài hoặc lựa chọn rút 1 lá từ bộ bài bằng cách hy sinh 1 lá bất kì đang có trên tay.
   - Nếu như trên tay không có bài để hy sinh thì sẽ không được đổi bài.

2. **Pull Trigger (Bóp Cò):**
   - Nếu bạn không thể đánh bài VÀ đã hết quyền Mulligan, bạn BẮT BUỘC phải Bóp Cò (Pull Trigger).
   - Tỷ lệ chết phụ thuộc vào khẩu súng (mặc định có 1 viên đạn thật trong tổng số ổ đạn).
   - **Sống sót (Click):** Bạn may mắn không trúng đạn. Tuy nhiên, lượt của bạn VẪN CHƯA KẾT THÚC. Bạn phải tiếp tục đánh bài. Vì bạn đang hết bài, bạn sẽ phải tiếp tục Bóp Cò liên tục cho đến khi nào viên đạn thật nổ (hoặc thắng game). Đây là cái giá rất đắt nếu để hết bài!
   - **Chết (Bang):** Bạn bị loại. Lượt được chuyển sang người tiếp theo. Trò chơi nạp lại khẩu súng mới (Reset lại viên đạn) và bắt đầu Vòng (Round) mới, **con số trên bàn được reset về 1, và TOÀN BỘ NGƯỜI CHƠI CÒN SỐNG ĐƯỢC NẠP LẠI 10 LÁ BÀI MỚI** (không cần biết trước đó có bao nhiêu lá).

## 4. Các Lưu Ý Kỹ Thuật (Cho Coder)
- State `direction` là `1` hoặc `-1`.
- State `handCards` của Local Player phải luôn được trả về dưới dạng tham chiếu mảng mới (new array `[...hand]`) sau mỗi lần đánh bài để React có thể re-render đúng đắn. Tránh mutate in-place như `splice` trực tiếp vào mảng.
- Thẻ BLOCK hiện tại đang xài chung nhánh logic với SKIP, nó sẽ gọi `getNextAliveIndex(nextIndex)` hai lần để lướt qua người tiếp theo.

## Thời gian (Timer)
- Mỗi người chơi có tối đa **20 giây** để thực hiện hành động (đánh bài, đổi bài, bóp cò).
- Hết 20 giây mà chưa làm gì, người chơi sẽ tự động bị ép bóp cò súng.

## Hết bài (Cạn kiệt)
- Nếu bạn đánh hết toàn bộ số bài trên tay, hệ thống sẽ KHÔNG tự động phát bài mới ở lượt tiếp theo.
- Bạn sẽ phải dùng quyền Đổi Bài (Mulligan) để lấy 6 lá mới, hoặc nếu đã dùng rồi thì chỉ còn nước liên tục Bóp Cò.
