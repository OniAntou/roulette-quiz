# Cải Tiến Chỉ Báo Lượt Và Trạng Thái Trận Đấu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xoá bỏ thanh header trên cùng của GameBoard và đồng bộ hóa các tag chỉ báo hành động (DECRYPTING, SUCCESS, FAILED, PULL TRIGGER) hiển thị ở phía trên cụm profile của mỗi người chơi một cách trực quan, đẹp mắt.

**Architecture:** 
1. Loại bỏ cấu trúc JSX header trên cùng của `GameBoard.tsx`.
2. Mở rộng `renderProfileIndicator` để hỗ trợ thêm nhãn tag `PULL TRIGGER!` khi game chuyển sang phase `trigger` và người chơi đó là người phải bóp cò (`triggerResult.playerId`).
3. Điều chỉnh CSS class và vị trí render của `renderProfileIndicator` để hiển thị tương đối với box container của profile thay vì lồng trong avatar, tránh đè chữ.

**Tech Stack:** React 19, TailwindCSS, Framer Motion, TypeScript.

---

### Task 1: Xoá bỏ Header trên cùng và Điều chỉnh khoảng cách layout

**Files:**
- Modify: `client/src/components/GameBoard.tsx`

- [ ] **Step 1: Xoá phần JSX của Header**
  Mở file `client/src/components/GameBoard.tsx`, tìm đoạn code header trên cùng (từ dòng 443 đến 453) và xoá bỏ nó:
  ```tsx
  // Tìm và xoá:
  <div className="w-full flex items-center justify-between pb-4 border-b border-border-theme z-30">
    <span className="text-xs font-bold text-text-theme tracking-widest uppercase">
      PROTOCOL // 0{round}
    </span>
    <span className="text-xs font-bold text-emerald-theme tracking-wider">
      ● LINK SECURED
    </span>
    <span className={`text-xs font-bold tracking-widest uppercase ${getHUDPhaseColor()}`}>
      {getHUDPhaseLabel()}
    </span>
  </div>
  ```

- [ ] **Step 2: Chạy kiểm tra TypeScript**
  Chạy lệnh sau tại thư mục `client/` để đảm bảo code compile thành công không bị lỗi:
  Run: `npm run typecheck` (trong thư mục `D:\roulette-quiz\client`)
  Expected: Command completed successfully with no errors.

- [ ] **Step 3: Commit**
  ```bash
  git add client/src/components/GameBoard.tsx
  git commit -m "style: remove game board header and clean up layout"
  ```

---

### Task 2: Nâng cấp `renderProfileIndicator` hỗ trợ trạng thái `PULL TRIGGER!`

**Files:**
- Modify: `client/src/components/GameBoard.tsx`

- [ ] **Step 1: Thêm tag PULL TRIGGER! vào hàm `renderProfileIndicator`**
  Cập nhật hàm `renderProfileIndicator` (từ dòng 381 đến 428) để xử lý thêm phase `trigger`:
  ```tsx
  const renderProfileIndicator = (playerId: string) => {
    // 1. Xử lý trạng thái giải mã (Answering)
    if (phase === 'questioning' || phase === 'answering') {
      const target = getTargetPlayer();
      if (target && target.id === playerId) {
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 border border-amber-theme-border bg-surface text-amber-theme font-mono text-[7px] font-black tracking-wider uppercase rounded shadow-[0_0_10px_rgba(245,158,11,0.15)] whitespace-nowrap z-30 animate-pulse flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-theme" />
            DECRYPTING...
          </motion.div>
        );
      }
    }

    // 2. Xử lý trạng thái kết quả trả lời (Result)
    if (phase === 'result' && questionResult) {
      const target = getTargetPlayer();
      if (target && target.id === playerId) {
        if (questionResult.correct) {
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 border border-emerald-theme-border bg-surface text-emerald-theme font-mono text-[7px] font-black tracking-wider uppercase rounded shadow-[0_0_10px_rgba(16,185,129,0.15)] whitespace-nowrap z-30 flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-theme animate-ping" />
              SUCCESS!
            </motion.div>
          );
        } else {
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 border border-red-theme-border bg-surface text-red-theme font-mono text-[7px] font-black tracking-wider uppercase rounded shadow-[0_0_10px_rgba(239,68,68,0.15)] whitespace-nowrap z-30 flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-theme animate-ping" />
              FAILED!
            </motion.div>
          );
        }
      }
    }

    // 3. Xử lý trạng thái bóp cò súng (Trigger)
    if (phase === 'trigger' && triggerResult) {
      if (triggerResult.playerId === playerId) {
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 border border-red-theme-border bg-surface text-red-theme font-mono text-[7px] font-black tracking-wider uppercase rounded shadow-[0_0_15px_rgba(239,68,68,0.25)] whitespace-nowrap z-30 animate-pulse flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-theme animate-ping" />
            PULL TRIGGER!
          </motion.div>
        );
      }
    }

    return null;
  };
  ```

- [ ] **Step 2: Chạy kiểm tra TypeScript**
  Run: `npm run typecheck` (trong thư mục `D:\roulette-quiz\client`)
  Expected: PASS

- [ ] **Step 3: Commit**
  ```bash
  git add client/src/components/GameBoard.tsx
  git commit -m "feat: upgrade profile status indicator with trigger state"
  ```

---

### Task 3: Di chuyển vị trí hiển thị Indicator ra phía trên cụm profile

**Files:**
- Modify: `client/src/components/GameBoard.tsx`

- [ ] **Step 1: Định vị lại Indicator cho đối thủ**
  Mở file `client/src/components/GameBoard.tsx`.
  1. Trong `pos.className` của đối thủ, đảm bảo có chứa class `relative` để làm mốc toạ độ cho nhãn (nhưng vì `pos.className` có `absolute` nên bản thân nó đã là mốc tọa độ tuyệt đối).
  2. Di chuyển thẻ gọi `{renderProfileIndicator(opponent.id)}` từ trong avatar container (ở dòng 472) ra ngoài avatar container, đặt ở dòng đầu tiên ngay bên trong thẻ container ngoài cùng của đối thủ:
  ```tsx
  {/* Đoạn code mới của đối thủ: */}
  return (
    <div key={opponent.id} className={`${pos.className} relative`}>
      {/* Di chuyển renderProfileIndicator ra đây */}
      <AnimatePresence>
        {renderProfileIndicator(opponent.id)}
      </AnimatePresence>
      
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold font-mono text-text-theme-secondary tracking-wider relative z-10">
          {opponent.name}
        </span>
        <div className="relative">
          {/* ĐÃ XOÁ renderProfileIndicator ở đây */}
          
          {/* Turn arrow indicator for opponent */}
          <AnimatePresence>
            ...
  ```

- [ ] **Step 2: Định vị lại Indicator cho local player**
  Tìm đoạn render local player avatar (ở dòng 805).
  1. Thêm class `relative` vào thẻ container profile của local player:
  ```tsx
  <div className="flex items-center gap-4 bg-surface-2 border border-cyan-theme-muted rounded-none p-3 shadow-none relative">
  ```
  2. Di chuyển thẻ gọi `{renderProfileIndicator(localId)}` từ trong avatar container (ở dòng 840) ra ngoài, đặt ở dòng đầu tiên ngay bên trong container profile:
  ```tsx
  {/* Đoạn code mới của local player: */}
  <div className="absolute bottom-6 left-6 z-20">
    ...
    <div className="flex items-center gap-4 bg-surface-2 border border-cyan-theme-muted rounded-none p-3 shadow-none relative">
      {/* Di chuyển renderProfileIndicator ra đây */}
      <AnimatePresence>
        {renderProfileIndicator(localId)}
      </AnimatePresence>

      <div className={`w-12 h-12 rounded-none bg-surface-3 border flex items-center justify-center font-mono font-black text-base relative transition-all duration-300 ${
        !localPlayer.isAlive ? 'border-red-theme-border opacity-30 bg-red-theme-bg' : 'border-cyan-theme-light'
      }`}>
        {/* ĐÃ XOÁ renderProfileIndicator ở đây */}
        {localPlayer.name.substring(0, 2).toUpperCase()}
        ...
  ```

- [ ] **Step 3: Chạy kiểm tra TypeScript**
  Run: `npm run typecheck` (trong thư mục `D:\roulette-quiz\client`)
  Expected: PASS

- [ ] **Step 4: Commit**
  ```bash
  git add client/src/components/GameBoard.tsx
  git commit -m "style: position status indicators above player profile containers"
  ```
