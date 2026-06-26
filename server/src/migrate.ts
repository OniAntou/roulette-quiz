import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function migrate() {
  const jsonPath = path.join(__dirname, '..', 'data', 'questions.json');
  const dbPath = path.join(__dirname, '..', 'data', 'questions.db');
  
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      topic TEXT,
      difficulty TEXT,
      question TEXT,
      answer_a TEXT,
      answer_b TEXT,
      answer_c TEXT,
      answer_d TEXT,
      correct TEXT
    );
  `);

  try {
    const data = fs.readFileSync(jsonPath, 'utf8');
    const questions = JSON.parse(data);

    const stmt = await db.prepare(`
      INSERT OR REPLACE INTO questions (id, topic, difficulty, question, answer_a, answer_b, answer_c, answer_d, correct)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const q of questions) {
      await stmt.run(
        q.id,
        q.topic,
        q.difficulty,
        q.question,
        q.answers.A,
        q.answers.B,
        q.answers.C,
        q.answers.D,
        q.correct
      );
    }
    await stmt.finalize();
    console.log(`Migrated ${questions.length} questions to SQLite!`);
  } catch (err: any) {
    console.error('Migration failed:', err.message);
  }

  await db.close();
}

migrate();
