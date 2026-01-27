import { pool } from "./src/pg.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log("🔧 Установка pgvector extension...");
    await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
    console.log("✅ pgvector установлен");

    console.log("📦 Запуск миграции add_semantic_search.sql...");
    const migrationPath = join(
      __dirname,
      "prisma",
      "migrations",
      "add_semantic_search.sql",
    );
    const sql = readFileSync(migrationPath, "utf-8");

    // Разделяем на отдельные команды и выполняем
    const commands = sql.split(";").filter((cmd) => cmd.trim());

    for (const command of commands) {
      if (command.trim()) {
        await client.query(command);
      }
    }

    console.log("✅ Миграция успешно применена");

    // Проверка
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'article_embeddings'
      );
    `);

    if (result.rows[0].exists) {
      console.log("✅ Таблица article_embeddings создана");

      // Проверка колонки в articles
      const colResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'articles' 
          AND column_name = 'embedding_status'
        );
      `);

      if (colResult.rows[0].exists) {
        console.log("✅ Колонка embedding_status добавлена в articles");
      }
    }
  } catch (error) {
    console.error("❌ Ошибка миграции:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
