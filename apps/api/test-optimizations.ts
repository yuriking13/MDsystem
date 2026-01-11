/**
 * Тестовый скрипт для проверки оптимизированных функций
 * Запуск: npx tsx test-optimizations.ts
 */

import { translateArticlesParallel, translateArticlesBatchOptimized } from './src/lib/translate.js';
import { enrichArticlesByDOIBatch } from './src/lib/crossref.js';
import { detectStatsParallel } from './src/lib/stats.js';

// Тестовые данные
const testArticles = [
  {
    id: '1',
    title_en: 'Effect of aspirin on cardiovascular events',
    abstract_en: 'Background: Aspirin is widely used for prevention. Methods: We conducted a trial. Results: p < 0.05.',
  },
  {
    id: '2',
    title_en: 'Diabetes and metabolic syndrome',
    abstract_en: 'Study of diabetes prevalence. OR = 1.5 (95% CI: 1.2-1.8, p < 0.01).',
  },
  {
    id: '3',
    title_en: 'Cancer treatment outcomes',
    abstract_en: 'Analysis of cancer survival rates. HR = 0.7, p = 0.001.',
  },
];

const testDOIs = [
  { id: '1', doi: '10.1016/j.jamda.2024.105359' },
  { id: '2', doi: '10.1093/ajcn/nqae344' },
];

async function testTranslationSpeed() {
  console.log('\n=== Тест скорости перевода ===');
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log('⚠️  Пропуск: нет OPENROUTER_API_KEY');
    return;
  }

  const startTime = Date.now();
  
  const result = await translateArticlesParallel(apiKey, testArticles, {
    parallelCount: 2,
    batchSize: 2,
    onProgress: (done, total, speed) => {
      console.log(`  📊 Прогресс: ${done}/${total} (${Math.round((done/total)*100)}%) - ${speed?.toFixed(2)} ст/сек`);
    },
  });

  const elapsed = (Date.now() - startTime) / 1000;
  const speed = testArticles.length / elapsed;

  console.log(`  ✅ Переведено: ${result.translated} из ${testArticles.length}`);
  console.log(`  ❌ Ошибок: ${result.failed}`);
  console.log(`  ⏱️  Время: ${elapsed.toFixed(1)}с`);
  console.log(`  🚀 Скорость: ${speed.toFixed(2)} статей/сек`);
}

async function testCrossrefSpeed() {
  console.log('\n=== Тест скорости Crossref ===');
  
  const startTime = Date.now();
  
  const result = await enrichArticlesByDOIBatch(testDOIs, {
    parallelCount: 2,
    onProgress: (done, total, speed) => {
      console.log(`  📊 Прогресс: ${done}/${total} (${Math.round((done/total)*100)}%) - ${speed?.toFixed(2)} ст/сек`);
    },
  });

  const elapsed = (Date.now() - startTime) / 1000;
  const speed = testDOIs.length / elapsed;

  console.log(`  ✅ Обогащено: ${result.enriched} из ${testDOIs.length}`);
  console.log(`  ❌ Ошибок: ${result.failed}`);
  console.log(`  ⏱️  Время: ${elapsed.toFixed(1)}с`);
  console.log(`  🚀 Скорость: ${speed.toFixed(2)} статей/сек`);
}

async function testStatsSpeed() {
  console.log('\n=== Тест скорости AI статистики ===');
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log('⚠️  Пропуск: нет OPENROUTER_API_KEY');
    return;
  }

  const startTime = Date.now();
  
  const result = await detectStatsParallel({
    articles: testArticles.map(a => ({ id: a.id, abstract: a.abstract_en })),
    openrouterKey: apiKey,
    useAI: true,
    parallelCount: 2,
    onProgress: (done, total, speed) => {
      console.log(`  📊 Прогресс: ${done}/${total} (${Math.round((done/total)*100)}%) - ${speed?.toFixed(2)} ст/сек`);
    },
  });

  const elapsed = (Date.now() - startTime) / 1000;
  const speed = testArticles.length / elapsed;

  console.log(`  ✅ Проанализировано: ${result.analyzed} из ${testArticles.length}`);
  console.log(`  📈 Найдено статистики: ${result.found}`);
  console.log(`  ⏱️  Время: ${elapsed.toFixed(1)}с`);
  console.log(`  🚀 Скорость: ${speed.toFixed(2)} статей/сек`);
}

async function runTests() {
  console.log('🧪 Запуск тестов оптимизации...\n');
  
  try {
    await testCrossrefSpeed();
    await testTranslationSpeed();
    await testStatsSpeed();
    
    console.log('\n✅ Все тесты завершены!');
  } catch (error) {
    console.error('\n❌ Ошибка при выполнении тестов:', error);
    process.exit(1);
  }
}

// Запуск тестов
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}
