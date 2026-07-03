import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { Question } from './types';

export class QuestionManager {
  private get dbPath(): string {
    // Try multiple possible locations based on rootDir changes
    const paths = [
      path.join(__dirname, '..', '..', '..', 'data', 'questions.db'),
      path.join(__dirname, '..', 'data', 'questions.db'),
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) return p;
    }
    return paths[0]; // fallback to first
  }
  private db: Database | null = null;
  private totalQuestions: number = 0;
  private initPromise: Promise<void> | null = null;

  constructor() {}

  async init(): Promise<void> {
    // Nếu đang init thì chờ luôn, tránh gọi 2 lần
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });
      const result = await this.db.get('SELECT COUNT(*) as count FROM questions');
      this.totalQuestions = result.count || 0;
      console.log(`QuestionManager initialized with SQLite. Total questions: ${this.totalQuestions}`);
    })();
    return this.initPromise;
  }

  getTotalQuestions(): number {
    return this.totalQuestions;
  }

  async getCards(count: number, excludeIds: string[] = []): Promise<Question[]> {
    if (!this.db) await this.init();

    // Prevent SQLite max variable limit (usually 999)
    const safeExclude = excludeIds.slice(-900);

    const selected: Question[] = [];
    const difficulties = ['easy', 'easy', 'medium', 'medium', 'hard'];

    for (let i = 0; i < count; i++) {
      const targetDifficulty = difficulties[i % difficulties.length];
      const placeholders = safeExclude.map(() => '?').join(',');
      
      let query = `SELECT * FROM questions WHERE difficulty = ?`;
      const params: any[] = [targetDifficulty];

      if (safeExclude.length > 0) {
        query += ` AND id NOT IN (${placeholders})`;
        params.push(...safeExclude);
      }

      query += ` ORDER BY RANDOM() LIMIT 1`;

      let row = await this.db!.get(query, ...params);

      // If not enough questions for target difficulty, fallback to any random available question
      if (!row) {
        let fallbackQuery = `SELECT * FROM questions`;
        const fallbackParams: any[] = [];
        if (safeExclude.length > 0) {
          fallbackQuery += ` WHERE id NOT IN (${placeholders})`;
          fallbackParams.push(...safeExclude);
        }
        fallbackQuery += ` ORDER BY RANDOM() LIMIT 1`;
        row = await this.db!.get(fallbackQuery, ...fallbackParams);
      }

      if (row) {
        selected.push({
          id: row.id,
          topic: row.topic,
          difficulty: row.difficulty,
          question: row.question,
          answers: {
            A: row.answer_a,
            B: row.answer_b,
            C: row.answer_c,
            D: row.answer_d,
          },
          correct: row.correct
        });
        safeExclude.push(row.id); // keep dedup within this batch, avoid mutating caller's array
      } else {
        break; // no more questions available
      }
    }

    return selected;
  }
}
