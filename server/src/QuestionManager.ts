import path from 'path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { Question } from './types';

export class QuestionManager {
  private dbPath = path.join(__dirname, '..', 'data', 'questions.db');
  private db: Database | null = null;
  private totalQuestions: number = 0;

  constructor() {}

  async init(): Promise<void> {
    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });
    const result = await this.db.get('SELECT COUNT(*) as count FROM questions');
    this.totalQuestions = result.count || 0;
    console.log(`QuestionManager initialized with SQLite. Total questions: ${this.totalQuestions}`);
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
        excludeIds.push(row.id); // ensure we don't pick it again in this batch
      } else {
        break; // no more questions available
      }
    }

    return selected;
  }
}
