import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoomManager } from './RoomManager';

describe('RoomManager', () => {
  let rm: RoomManager;

  beforeEach(() => {
    rm = new RoomManager();
  });

  describe('createRoom', () => {
    it('tạo phòng với dữ liệu hợp lệ', () => {
      const room = rm.createRoom('socket-1', 'Alice');
      expect(room.id).toBeDefined();
      expect(room.id).toHaveLength(6);
      expect(room.id).toMatch(/^[A-Z0-9]+$/);
      expect(room.state).toBe('waiting');
      expect(room.players).toHaveLength(1);
      expect(room.players[0].id).toBe('socket-1');
      expect(room.players[0].name).toBe('Alice');
      expect(room.players[0].isReady).toBe(false);
      expect(room.players[0].isAlive).toBe(true);
      expect(room.isPublic).toBe(true);
      expect(room.createdAt).toBeLessThanOrEqual(Date.now());
    });

    it('tạo phòng private khi isPublic=false', () => {
      const room = rm.createRoom('socket-2', 'Bob', false);
      expect(room.isPublic).toBe(false);
    });

    it('làm sạch tên người chơi (trim + escape HTML)', () => {
      const room = rm.createRoom('s1', '  <script>alert("xss")</script>  ');
      expect(room.players[0].name).not.toContain('<');
      expect(room.players[0].name).not.toContain('>');
      expect(room.players[0].name).not.toContain('"');
      expect(room.players[0].name).not.toContain('&');
      expect(room.players[0].name).not.toContain('(');
      expect(room.players[0].name).not.toContain(')');
      // Input " <script>alert("xss")</script> " gets trimmed → escaped → non-word chars removed
      // Should only contain word chars + spaces, no HTML entities
      expect(room.players[0].name).toMatch(/^[\w\s]+$/);
    });

    it('fallback về GUEST + random khi tên rỗng', () => {
      const room = rm.createRoom('s2', '');
      expect(room.players[0].name).toMatch(/^GUEST\d{4}$/);
    });

    it('fallback khi tên chỉ toàn ký tự đặc biệt sau sanitize', () => {
      const room = rm.createRoom('s3', '@#$%^*()');
      expect(room.players[0].name).toMatch(/^GUEST\d{4}$/);
    });

    it('cắt tên ở 12 ký tự, giữ nguyên phần đầu', () => {
      const room = rm.createRoom('s4', 'AAAAAAAAAAAAAABBBBB'); // 20 ký tự
      expect(room.players[0].name).toHaveLength(12);
      // Kiểm tra nó là 12 ký tự A đầu tiên
      expect(room.players[0].name).toMatch(/^A{12}$/);
    });

    it('escape HTML entities trong tên', () => {
      const room = rm.createRoom('s5', '&<>"\'');
      expect(room.players[0].name).not.toContain('&');
      expect(room.players[0].name).not.toContain('<');
      expect(room.players[0].name).not.toContain('>');
      expect(room.players[0].name).not.toContain('"');
      expect(room.players[0].name).not.toContain("'");
    });

    it('cắt tên ở 12 ký tự', () => {
      const room = rm.createRoom('s3', 'A'.repeat(20));
      expect(room.players[0].name).toHaveLength(12);
    });

    it('cập nhật playerRooms map', () => {
      rm.createRoom('s4', 'Test');
      expect(rm.getPlayerRoom('s4')).toBeDefined();
      expect(rm.getPlayerRoom('s4')!.id).toBeDefined();
    });

    it('sinh room ID unique khi có conflict', () => {
      // Tạo nhiều rooms để kiểm tra unique ID
      const ids = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const room = rm.createRoom(`s-${i}`, `P${i}`);
        expect(ids.has(room.id)).toBe(false);
        ids.add(room.id);
      }
    });

    it('vẫn tạo được room ngay cả khi ID bị conflict nhiều lần', () => {
      // Mock hasRoom để luôn trả về true 9 lần đầu, sau đó false
      const originalHasRoom = rm.hasRoom.bind(rm);
      let callCount = 0;
      rm.hasRoom = vi.fn(() => {
        callCount++;
        return callCount < 10;
      }) as any;

      const room = rm.createRoom('s1', 'P1');
      expect(room).toBeDefined();
      expect(room.id).toBeDefined();
    });
  });

  describe('joinRoom', () => {
    it('join phòng tồn tại thành công', () => {
      const room = rm.createRoom('host', 'Host');
      const result = rm.joinRoom(room.id, 'guest', 'Guest');
      expect(result.success).toBe(true);
      expect(result.players).toHaveLength(2);
      expect(result.players![1].name).toBe('Guest');
    });

    it('thất bại khi phòng không tồn tại', () => {
      const result = rm.joinRoom('XXXXX', 's1', 'Test');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Room not found');
    });

    it('thất bại khi phòng đầy (4 players)', () => {
      const room = rm.createRoom('h1', 'H1');
      const roomId = room.id;
      rm.joinRoom(roomId, 'p2', 'P2');
      rm.joinRoom(roomId, 'p3', 'P3');
      rm.joinRoom(roomId, 'p4', 'P4');
      const result = rm.joinRoom(roomId, 'p5', 'P5');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Room is full');
    });

    it('thất bại khi game đã bắt đầu', () => {
      const room = rm.createRoom('h1', 'H1');
      room.state = 'playing';
      const result = rm.joinRoom(room.id, 'p2', 'P2');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Game already started');
    });

    it('thất bại khi đã ở trong phòng', () => {
      const room = rm.createRoom('h1', 'H1');
      const result = rm.joinRoom(room.id, 'h1', 'H1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Already in room');
    });

    it('xử lý trùng tên bằng cách thêm số', () => {
      const room = rm.createRoom('h1', 'Alice');
      const r1 = rm.joinRoom(room.id, 'p2', 'Alice');
      expect(r1.players![1].name).toBe('Alice2');
      const r2 = rm.joinRoom(room.id, 'p3', 'Alice');
      expect(r2.players![2].name).toBe('Alice3');
    });

    it('sanitize tên khi join', () => {
      const room = rm.createRoom('h1', 'Host');
      const result = rm.joinRoom(room.id, 'p2', '<b>Bad</b>');
      expect(result.players![1].name).not.toContain('<');
      expect(result.players![1].name).not.toContain('>');
    });

    it('xử lý trùng tên với số đã tồn tại (Alice2, Alice3 → Alice4)', () => {
      const room = rm.createRoom('h1', 'Alice');
      rm.joinRoom(room.id, 'p2', 'Alice');  // → Alice2
      rm.joinRoom(room.id, 'p3', 'Alice');  // → Alice3
      const r3 = rm.joinRoom(room.id, 'p4', 'Alice');  // → Alice4
      expect(r3.players![3].name).toBe('Alice4');
    });

    it('xử lý trùng tên khi tên đã có số suffix (Bob2 join với Bob2 khác → Bob22)', () => {
      // Note: current implementation appends counter without parsing existing number suffix
      const room = rm.createRoom('h1', 'Bob');
      rm.joinRoom(room.id, 'p2', 'Bob');    // → Bob2
      const r2 = rm.joinRoom(room.id, 'p3', 'Bob2'); // → Bob22 (Bob2 + counter 2)
      expect(r2.players![2].name).toBe('Bob22');
    });
  });

  describe('toggleReady', () => {
    it('toggle trạng thái ready', () => {
      const room = rm.createRoom('h1', 'H1');
      rm.joinRoom(room.id, 'p2', 'P2');
      const r1 = rm.toggleReady(room.id, 'h1');
      expect(r1.success).toBe(true);
      expect(r1.players![0].isReady).toBe(true);
      expect(r1.allReady).toBe(false);
      const r2 = rm.toggleReady(room.id, 'h1');
      expect(r2.players![0].isReady).toBe(false);
    });

    it('allReady = true khi >=2 players và tất cả ready', () => {
      const room = rm.createRoom('h1', 'H1');
      rm.joinRoom(room.id, 'p2', 'P2');
      rm.toggleReady(room.id, 'h1');
      const result = rm.toggleReady(room.id, 'p2');
      expect(result.allReady).toBe(true);
    });

    it('allReady = false khi chỉ 1 player', () => {
      const room = rm.createRoom('h1', 'H1');
      const result = rm.toggleReady(room.id, 'h1');
      expect(result.allReady).toBe(false);
    });

    it('thất bại khi phòng không tồn tại', () => {
      const result = rm.toggleReady('XXXXX', 's1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Room not found');
    });

    it('thất bại khi game đã bắt đầu', () => {
      const room = rm.createRoom('h1', 'H1');
      room.state = 'playing';
      const result = rm.toggleReady(room.id, 'h1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Game already started');
    });

    it('thất bại khi player không trong phòng', () => {
      const room = rm.createRoom('h1', 'H1');
      const result = rm.toggleReady(room.id, 'ghost');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Player not in room');
    });

    it('toggle ready nhiều lần không crash', () => {
      const room = rm.createRoom('h1', 'H1');
      rm.joinRoom(room.id, 'p2', 'P2');
      for (let i = 0; i < 10; i++) {
        const r = rm.toggleReady(room.id, 'h1');
        expect(r.success).toBe(true);
      }
    });
  });

  describe('leaveRoom', () => {
    it('xoá player khỏi phòng', () => {
      const room = rm.createRoom('h1', 'H1');
      rm.joinRoom(room.id, 'p2', 'P2');
      rm.leaveRoom(room.id, 'p2');
      expect(room.players).toHaveLength(1);
    });

    it('xoá phòng khi không còn player nào', () => {
      const room = rm.createRoom('h1', 'H1');
      rm.leaveRoom(room.id, 'h1');
      expect(rm.hasRoom(room.id)).toBe(false);
    });

    it('không crash khi phòng không tồn tại', () => {
      expect(() => rm.leaveRoom('XXXXX', 's1')).not.toThrow();
    });
  });

  describe('handleDisconnect', () => {
    it('leave phòng khi disconnect', () => {
      const room = rm.createRoom('h1', 'H1');
      rm.handleDisconnect('h1');
      expect(rm.getRoomCount()).toBe(0);
    });

    it('không crash khi disconnect không trong phòng nào', () => {
      expect(() => rm.handleDisconnect('ghost')).not.toThrow();
    });
  });

  describe('getAvailableRooms', () => {
    it('trả về phòng waiting và public', () => {
      rm.createRoom('h1', 'H1');
      rm.createRoom('h2', 'H2', false); // private
      const rooms = rm.getAvailableRooms();
      expect(rooms).toHaveLength(1);
      expect(rooms[0].players).toBe(1);
    });

    it('không trả về phòng đang chơi', () => {
      const room = rm.createRoom('h1', 'H1');
      room.state = 'playing';
      const rooms = rm.getAvailableRooms();
      expect(rooms).toHaveLength(0);
    });

    it('không trả về phòng đầy', () => {
      const room = rm.createRoom('h1', 'H1');
      const rid = room.id;
      rm.joinRoom(rid, 'p2', 'P2');
      rm.joinRoom(rid, 'p3', 'P3');
      rm.joinRoom(rid, 'p4', 'P4');
      const rooms = rm.getAvailableRooms();
      expect(rooms).toHaveLength(0);
    });

    it('trả về phòng public với slot còn trống, bỏ qua private đầy và playing', () => {
      // Public + slot còn
      rm.createRoom('h1', 'H1');
      // Private + slot còn
      rm.createRoom('h2', 'H2', false);
      // Playing
      const pRoom = rm.createRoom('h3', 'H3');
      pRoom.state = 'playing';
      // Đầy
      const fRoom = rm.createRoom('h4', 'H4');
      rm.joinRoom(fRoom.id, 'p2', 'P2');
      rm.joinRoom(fRoom.id, 'p3', 'P3');
      rm.joinRoom(fRoom.id, 'p4', 'P4');

      const rooms = rm.getAvailableRooms();
      expect(rooms).toHaveLength(1);
      expect(rooms[0].players).toBe(1);
    });

    it('trả về mảng rỗng khi không có phòng', () => {
      const rooms = rm.getAvailableRooms();
      expect(rooms).toEqual([]);
    });
  });

  describe('cleanupStaleRooms', () => {
    it('xoá phòng waiting cũ hơn 5 phút', () => {
      const room = rm.createRoom('h1', 'H1');
      // Giả sử phòng đã tồn tại 6 phút
      room.createdAt = Date.now() - 6 * 60 * 1000;
      rm.cleanupStaleRooms();
      expect(rm.hasRoom(room.id)).toBe(false);
    });

    it('xoá phòng playing cũ hơn 30 phút', () => {
      const room = rm.createRoom('h1', 'H1');
      room.state = 'playing';
      room.createdAt = Date.now() - 31 * 60 * 1000;
      rm.cleanupStaleRooms();
      expect(rm.hasRoom(room.id)).toBe(false);
    });

    it('giữ phòng chưa cũ', () => {
      const room = rm.createRoom('h1', 'H1');
      rm.cleanupStaleRooms();
      expect(rm.hasRoom(room.id)).toBe(true);
    });

    it('xoá đúng phòng, giữ phòng chưa cũ', () => {
      const oldRoom = rm.createRoom('h1', 'Old');
      oldRoom.createdAt = Date.now() - 6 * 60 * 1000; // 6 phút
      const freshRoom = rm.createRoom('h2', 'Fresh');
      rm.cleanupStaleRooms();
      expect(rm.hasRoom(oldRoom.id)).toBe(false);
      expect(rm.hasRoom(freshRoom.id)).toBe(true);
    });

    it('xoá phòng playing ở biên 30 phút', () => {
      const room = rm.createRoom('h1', 'H1');
      room.state = 'playing';
      room.createdAt = Date.now() - 30 * 60 * 1000 - 1; // 30 phút + 1ms
      rm.cleanupStaleRooms();
      expect(rm.hasRoom(room.id)).toBe(false);
    });

    it('giữ phòng playing ở biên dưới 30 phút', () => {
      const room = rm.createRoom('h1', 'H1');
      room.state = 'playing';
      room.createdAt = Date.now() - 29 * 60 * 1000; // 29 phút
      rm.cleanupStaleRooms();
      expect(rm.hasRoom(room.id)).toBe(true);
    });

    it('không crash khi rooms map rỗng', () => {
      expect(() => rm.cleanupStaleRooms()).not.toThrow();
    });
  });

  describe('getters', () => {
    it('hasRoom', () => {
      const room = rm.createRoom('h1', 'H1');
      expect(rm.hasRoom(room.id)).toBe(true);
      expect(rm.hasRoom('XXXXX')).toBe(false);
    });

    it('getRoom', () => {
      const room = rm.createRoom('h1', 'H1');
      expect(rm.getRoom(room.id)).toBe(room);
      expect(rm.getRoom('XXXXX')).toBeUndefined();
    });

    it('getRoomCount', () => {
      expect(rm.getRoomCount()).toBe(0);
      rm.createRoom('h1', 'H1');
      expect(rm.getRoomCount()).toBe(1);
      rm.createRoom('h2', 'H2');
      expect(rm.getRoomCount()).toBe(2);
    });

    it('getPlayerRoom', () => {
      const room = rm.createRoom('h1', 'H1');
      expect(rm.getPlayerRoom('h1')).toBe(room);
      expect(rm.getPlayerRoom('ghost')).toBeUndefined();
    });
  });
});
