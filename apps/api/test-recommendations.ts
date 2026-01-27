import { Pool } from "pg";

// Подключение к PostgreSQL
const DATABASE_URL = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString: DATABASE_URL });

async function testRecommendations(projectId: string) {
  console.log(`\n=== Testing Recommendations for Project ${projectId} ===\n`);

  try {
    // Проверяем наличие колонки reference_pmids
    console.log("1. Checking if reference_pmids column exists...");
    const checkCol = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'articles' AND column_name = 'reference_pmids'`,
    );
    const hasRefPmids = (checkCol.rowCount ?? 0) > 0;
    console.log(`   reference_pmids exists: ${hasRefPmids}`);

    // Получаем статьи проекта
    console.log("\n2. Getting project articles...");
    const orphansRes = await pool.query(
      `SELECT a.id, a.title_en, a.pmid, a.year, a.references_fetched_at
       FROM project_articles pa
       JOIN articles a ON a.id = pa.article_id
       WHERE pa.project_id = $1 AND pa.status != 'deleted'`,
      [projectId],
    );
    console.log(`   Total articles: ${orphansRes.rows.length}`);

    const articles = orphansRes.rows;
    const articleIds = articles.map((a) => a.id);

    // Проверяем orphan nodes
    if (articleIds.length > 0 && hasRefPmids) {
      console.log("\n3. Checking for orphan nodes (with reference_pmids)...");
      const connectedRes = await pool.query(
        `SELECT DISTINCT a1.id
         FROM articles a1
         JOIN articles a2 ON (
           (a1.reference_pmids IS NOT NULL AND a2.pmid = ANY(a1.reference_pmids))
           OR (a2.reference_pmids IS NOT NULL AND a1.pmid = ANY(a2.reference_pmids))
         )
         WHERE a1.id = ANY($1) AND a2.id = ANY($1)`,
        [articleIds],
      );

      const connectedIds = new Set(connectedRes.rows.map((r) => r.id));
      const orphans = articles.filter((a) => !connectedIds.has(a.id));
      const unfetched = orphans.filter((a) => !a.references_fetched_at);
      const fetched = orphans.filter((a) => a.references_fetched_at);

      console.log(`   Connected articles: ${connectedIds.size}`);
      console.log(`   Orphan articles (unfetched): ${unfetched.length}`);
      console.log(`   Orphan articles (fetched): ${fetched.length}`);
    } else if (articleIds.length > 0) {
      console.log(
        "\n3. Checking for orphan nodes (without reference_pmids)...",
      );
      const unfetched = articles.filter((a) => !a.references_fetched_at);
      console.log(`   Articles without references: ${unfetched.length}`);
    }

    // Проверяем stale citations
    console.log("\n4. Checking for stale citations...");
    const staleRes = await pool.query(
      `SELECT a.id, a.title_en, a.year, a.cited_by_last_fetched
       FROM project_articles pa
       JOIN articles a ON a.id = pa.article_id
       WHERE pa.project_id = $1 
         AND pa.status = 'selected'
         AND (a.cited_by_last_fetched IS NULL 
              OR a.cited_by_last_fetched < NOW() - INTERVAL '1 year')
         AND a.year >= EXTRACT(YEAR FROM NOW()) - 10`,
      [projectId],
    );
    console.log(`   Stale citations: ${staleRes.rowCount}`);

    // Проверяем high-cited unfetched
    console.log("\n5. Checking for high-cited unfetched...");
    const highCitedRes = await pool.query(
      `SELECT a.id, a.title_en, a.pmid,
              COALESCE(array_length(a.cited_by_pmids, 1), 0) as cited_count
       FROM project_articles pa
       JOIN articles a ON a.id = pa.article_id
       WHERE pa.project_id = $1 
         AND pa.status = 'selected'
         AND a.references_fetched_at IS NULL
         AND COALESCE(array_length(a.cited_by_pmids, 1), 0) > 20`,
      [projectId],
    );
    console.log(`   High-cited unfetched: ${highCitedRes.rowCount}`);

    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("\n❌ Error during test:");
    console.error(error);
  } finally {
    await pool.end();
  }
}

// Запуск теста
const projectId = process.argv[2];
if (!projectId) {
  console.error("Usage: tsx test-recommendations.ts <project-id>");
  process.exit(1);
}

testRecommendations(projectId);
