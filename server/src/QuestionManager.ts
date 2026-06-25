import fs from 'fs';
import path from 'path';
import { Question } from './types';

export class QuestionManager {
  questions: Question[] = [];

  constructor() {
    this.loadQuestions();
  }

  loadQuestions(): void {
    const filePath = path.join(__dirname, '..', 'data', 'questions.json');
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      this.questions = JSON.parse(data);
      console.log(`Loaded ${this.questions.length} questions`);
    } catch (error) {
      console.error('Error loading questions:', (error as Error).message);
      this.questions = this.getDefaultQuestions();
    }
  }

  getCards(count: number, excludeIds: string[] = []): Question[] {
    const available = this.questions.filter(q => !excludeIds.includes(q.id));

    const selected: Question[] = [];
    const difficulties = ['easy', 'easy', 'medium', 'medium', 'hard'];

    for (let i = 0; i < count && available.length > 0; i++) {
      const targetDifficulty = difficulties[i % difficulties.length];
      const candidates = available.filter(q => q.difficulty === targetDifficulty);

      if (candidates.length > 0) {
        const randomIndex = Math.floor(Math.random() * candidates.length);
        const question = candidates[randomIndex];
        selected.push(question);
        available.splice(available.indexOf(question), 1);
      } else {
        const randomIndex = Math.floor(Math.random() * available.length);
        selected.push(available[randomIndex]);
        available.splice(randomIndex, 1);
      }
    }

    return selected;
  }

  getDefaultQuestions(): Question[] {
    return [
      { id: 'q_001', topic: 'science', difficulty: 'easy', question: 'Hình dạng của Trái Đất?', answers: { A: 'Tròn', B: 'Phẳng', C: 'Vuông', D: 'Tam giác' }, correct: 'A' },
      { id: 'q_002', topic: 'science', difficulty: 'medium', question: 'Tốc độ ánh sáng là bao nhiêu?', answers: { A: '300,000 km/s', B: '150,000 km/s', C: '500,000 km/s', D: '1,000,000 km/s' }, correct: 'A' },
      { id: 'q_003', topic: 'science', difficulty: 'hard', question: 'Nguyên tố nào chiếm phần lớn trong vũ trụ?', answers: { A: 'Oxygen', B: 'Carbon', C: 'Hydrogen', D: 'Helium' }, correct: 'C' },
      { id: 'q_004', topic: 'geography', difficulty: 'easy', question: 'Thủ đô của Việt Nam là gì?', answers: { A: 'Hồ Chí Minh', B: 'Hà Nội', C: 'Đà Nẵng', D: 'Hải Phòng' }, correct: 'B' },
      { id: 'q_005', topic: 'geography', difficulty: 'medium', question: 'Sông dài nhất thế giới là?', answers: { A: 'Amazon', B: 'Yangtze', C: 'Nile', D: 'Mississippi' }, correct: 'C' },
      { id: 'q_006', topic: 'geography', difficulty: 'hard', question: 'Quốc gia nào có nhiều đảo nhất?', answers: { A: 'Indonesia', B: 'Philippines', C: 'Nhật Bản', D: 'Thụy Điển' }, correct: 'D' },
      { id: 'q_007', topic: 'history', difficulty: 'easy', question: 'Năm chiến tranh thế giới II kết thúc?', answers: { A: '1943', B: '1944', C: '1945', D: '1946' }, correct: 'C' },
      { id: 'q_008', topic: 'history', difficulty: 'medium', question: 'Ai là người phát minh ra đèn điện?', answers: { A: 'Nikola Tesla', B: 'Thomas Edison', C: 'Albert Einstein', D: 'Isaac Newton' }, correct: 'B' },
      { id: 'q_009', topic: 'history', difficulty: 'hard', question: 'Đế chế La Mã sụp đổ vào thế kỷ nào?', answers: { A: 'Thế kỷ 3', B: 'Thế kỷ 4', C: 'Thế kỷ 5', D: 'Thế kỷ 6' }, correct: 'C' },
      { id: 'q_010', topic: 'entertainment', difficulty: 'easy', question: 'Phim "Avatar" do đạo diễn nào?', answers: { A: 'Steven Spielberg', B: 'James Cameron', C: 'Christopher Nolan', D: 'Martin Scorsese' }, correct: 'B' },
      { id: 'q_011', topic: 'entertainment', difficulty: 'medium', question: 'Bộ phim nào đoạt giải Oscar 2024 cho Phim hay nhất?', answers: { A: 'Oppenheimer', B: 'Killers of the Flower Moon', C: 'Poor Things', D: 'The Holdovers' }, correct: 'A' },
      { id: 'q_012', topic: 'entertainment', difficulty: 'hard', question: 'Ca sĩ nào có album bán chạy nhất mọi thời đại?', answers: { A: 'Michael Jackson', B: 'Elvis Presley', C: 'The Beatles', D: 'AC/DC' }, correct: 'C' },
      { id: 'q_013', topic: 'gaming', difficulty: 'easy', question: 'Nhân vật chính của Mario tên đầy đủ là?', answers: { A: 'Mario Mario', B: 'Luigi Mario', C: 'Mario Brothers', D: 'Mario Peach' }, correct: 'A' },
      { id: 'q_014', topic: 'gaming', difficulty: 'medium', question: 'Game nào được coi là game bán chạy nhất mọi thời đại?', answers: { A: 'Tetris', B: 'Minecraft', C: 'GTA V', D: 'Wii Sports' }, correct: 'B' },
      { id: 'q_015', topic: 'gaming', difficulty: 'hard', question: 'Năm nào game The Legend of Zelda ra mắt?', answers: { A: '1985', B: '1986', C: '1987', D: '1988' }, correct: 'B' },
      { id: 'q_016', topic: 'technology', difficulty: 'easy', question: 'iPhone ra mắt năm nào?', answers: { A: '2005', B: '2006', C: '2007', D: '2008' }, correct: 'C' },
      { id: 'q_017', topic: 'technology', difficulty: 'medium', question: 'Người sáng lập Facebook là?', answers: { A: 'Bill Gates', B: 'Steve Jobs', C: 'Mark Zuckerberg', D: 'Elon Musk' }, correct: 'C' },
      { id: 'q_018', topic: 'technology', difficulty: 'hard', question: 'Ngôn ngữ lập trình nào được tạo ra đầu tiên?', answers: { A: 'C', B: 'Python', C: 'Java', D: 'Fortran' }, correct: 'D' },
    ];
  }
}
