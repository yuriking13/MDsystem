/**
 * Перевод текста через OpenRouter API
 * Использует модель (напр. GPT-4o-mini или Claude) для перевода заголовков и абстрактов
 */

import { createLogger } from "../utils/logger.js";

const log = createLogger("translate");
const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";

// Модель для перевода - можно настроить
const DEFAULT_MODEL = "openai/gpt-4o-mini";

export type TranslationResult = {
  title_ru?: string;
  abstract_ru?: string;
};

export type BatchTranslationResult = {
  translated: number;
  failed: number;
  results: Map<string, TranslationResult>;
};

/**
 * Перевод одного текста на русский
 */
export async function translateText(
  apiKey: string,
  text: string,
  model = DEFAULT_MODEL,
): Promise<string> {
  const res = await fetch(OPENROUTER_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://thesis.app",
      "X-Title": "Thesis Medical Research",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Ты переводчик научных медицинских текстов. Переведи текст на русский язык, сохраняя научную терминологию и точность. Верни ТОЛЬКО перевод, без пояснений.",
        },
        {
          role: "user",
          content: text,
        },
      ],
      max_tokens: 2000,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`OpenRouter error ${res.status}: ${err.slice(0, 200)}`);
  }

  type OpenRouterResponse = {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const data = (await res.json()) as OpenRouterResponse;
  const translated = data?.choices?.[0]?.message?.content?.trim();

  if (!translated) {
    throw new Error("Empty translation response");
  }

  return translated;
}

/**
 * Перевод заголовка и абстракта статьи
 */
export async function translateArticle(
  apiKey: string,
  title: string,
  abstract?: string | null,
  model = DEFAULT_MODEL,
): Promise<TranslationResult> {
  const result: TranslationResult = {};

  // Переводим заголовок
  try {
    result.title_ru = await translateText(apiKey, title, model);
  } catch (err) {
    log.error("Title translation error", err as Error);
  }

  // Переводим абстракт если есть
  if (abstract && abstract.length > 10) {
    try {
      result.abstract_ru = await translateText(apiKey, abstract, model);
    } catch (err) {
      log.error("Abstract translation error", err as Error);
    }
  }

  return result;
}

/**
 * Пакетный перевод нескольких статей (последовательный с задержкой)
 * Возвращает Map<articleId, TranslationResult>
 */
export async function translateArticlesBatch(
  apiKey: string,
  articles: Array<{
    id: string;
    title_en: string;
    abstract_en?: string | null;
  }>,
  options: {
    model?: string;
    delayMs?: number;
    onProgress?: (done: number, total: number) => void;
  } = {},
): Promise<BatchTranslationResult> {
  const model = options.model || DEFAULT_MODEL;
  const delayMs = options.delayMs ?? 100;

  const results = new Map<string, TranslationResult>();
  let translated = 0;
  let failed = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];

    try {
      const tr = await translateArticle(
        apiKey,
        article.title_en,
        article.abstract_en,
        model,
      );

      if (tr.title_ru || tr.abstract_ru) {
        results.set(article.id, tr);
        translated++;
      } else {
        failed++;
      }
    } catch (err) {
      log.error(`Translation failed for ${article.id}`, err as Error);
      failed++;
    }

    // Прогресс
    if (options.onProgress) {
      options.onProgress(i + 1, articles.length);
    }

    // Задержка между запросами
    if (i < articles.length - 1 && delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return { translated, failed, results };
}

/**
 * Параллельный пакетный перевод с контролем параллелизма
 * Обрабатывает несколько статей параллельно для ускорения
 */
export async function translateArticlesParallel(
  apiKey: string,
  articles: Array<{
    id: string;
    title_en: string;
    abstract_en?: string | null;
  }>,
  options: {
    model?: string;
    parallelCount?: number; // Количество параллельных запросов
    batchSize?: number; // Размер батча для оптимизированного перевода
    onProgress?: (done: number, total: number, speed?: number) => void;
    onSpeedUpdate?: (articlesPerSecond: number) => void;
  } = {},
): Promise<BatchTranslationResult> {
  const model = options.model || DEFAULT_MODEL;
  const parallelCount = options.parallelCount ?? 3;
  const batchSize = options.batchSize ?? 5; // Оптимизированный батч на несколько статей в одном API запросе

  if (articles.length === 0) {
    return { translated: 0, failed: 0, results: new Map() };
  }

  const results = new Map<string, TranslationResult>();
  let translated = 0;
  let failed = 0;
  let processed = 0;
  const startTime = Date.now();

  // Разбиваем на пакеты для оптимизированного перевода (несколько статей в одном API запросе)
  const batchPromises: Promise<void>[] = [];

  for (
    let batchStart = 0;
    batchStart < articles.length;
    batchStart += batchSize
  ) {
    // Обрабатываем не более parallelCount батчей параллельно
    if (batchPromises.length >= parallelCount) {
      await Promise.race(batchPromises);
      batchPromises.splice(
        0,
        batchPromises.findIndex((p) => p === Promise.resolve()),
      );
    }

    const batch = articles.slice(batchStart, batchStart + batchSize);

    const batchPromise = (async () => {
      try {
        // Используем оптимизированный перевод для этого батча
        const batchResult = await translateArticlesBatchOptimized(
          apiKey,
          batch,
          model,
        );

        // Сохраняем результаты
        for (const [articleId, tr] of batchResult.results) {
          results.set(articleId, tr);
        }

        translated += batchResult.translated;
        failed += batchResult.failed;
        processed += batch.length;

        // Обновляем прогресс с расчётом скорости
        if (options.onProgress) {
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          const speed = processed / Math.max(elapsedSeconds, 0.1);
          options.onProgress(processed, articles.length, speed);
        }

        if (options.onSpeedUpdate) {
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          const speed = processed / Math.max(elapsedSeconds, 0.1);
          options.onSpeedUpdate(speed);
        }
      } catch (err) {
        log.error(
          `Batch translation error for articles ${batchStart}-${batchStart + batchSize}`,
          err as Error,
        );
        failed += batch.length;
        processed += batch.length;

        if (options.onProgress) {
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          const speed = processed / Math.max(elapsedSeconds, 0.1);
          options.onProgress(processed, articles.length, speed);
        }
      }
    })();

    batchPromises.push(batchPromise);
  }

  // Ждём завершения всех батчей
  await Promise.all(batchPromises);

  return { translated, failed, results };
}

/**
 * Верификация перевода — лёгкий AI-агент проверяет, что перевод действительно является переводом,
 * а не сообщением об ошибке, отказом или бессмыслицей.
 *
 * @returns проверенный перевод, или null если перевод не прошёл верификацию
 */
export async function verifyTranslation(
  apiKey: string,
  originalText: string,
  translatedText: string,
  model = "openai/gpt-4o-mini",
): Promise<string | null> {
  // Quick heuristic checks before calling AI
  const refusalPatterns = [
    /извини/i,
    /не могу/i,
    /не понял/i,
    /sorry/i,
    /i can't/i,
    /i cannot/i,
    /unable to/i,
    /as an ai/i,
    /как ии/i,
    /я не в состоянии/i,
    /не удалось/i,
    /ошибка/i,
    /error/i,
    /пожалуйста, предоставьте/i,
    /please provide/i,
  ];

  const isLikelyRefusal = refusalPatterns.some((p) => p.test(translatedText));

  // If translated text is very similar to original (wasn't actually translated)
  const isSameAsOriginal =
    translatedText.trim().toLowerCase() === originalText.trim().toLowerCase();

  // If translated text is way too short compared to original
  const isSuspiciouslyShort =
    translatedText.length < originalText.length * 0.2 &&
    originalText.length > 20;

  // If translated text is way too long compared to original
  const isSuspiciouslyLong = translatedText.length > originalText.length * 5;

  // Easy cases that don't need AI verification
  if (isSameAsOriginal || isSuspiciouslyLong) {
    return null;
  }

  // If no red flags, accept translation without AI check
  if (!isLikelyRefusal && !isSuspiciouslyShort) {
    return translatedText;
  }

  // For suspicious cases, verify with a lightweight AI check
  try {
    const res = await fetch(OPENROUTER_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://mdsystem.app",
        "X-Title": "MDsystem Translation Verification",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `You verify translations. Given an original English text and its Russian translation, determine if the translation is valid.

A translation is INVALID if it:
- Is an error message or refusal ("Sorry, I can't...", "Извините...")
- Is completely unrelated to the original
- Is gibberish or nonsensical

A translation is VALID even if:
- It's not perfect
- Some terms are transliterated
- It's a technical/medical text

Respond with ONLY "VALID" or "INVALID".`,
          },
          {
            role: "user",
            content: `Original: ${originalText}\n\nTranslation: ${translatedText}`,
          },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    if (!res.ok) {
      // On API error, accept the translation if it doesn't have refusal patterns
      return isLikelyRefusal ? null : translatedText;
    }

    type VerifyResponse = {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const data = (await res.json()) as VerifyResponse;
    const verdict = data?.choices?.[0]?.message?.content?.trim().toUpperCase();

    if (verdict === "VALID") {
      return translatedText;
    }

    log.warn(
      `Translation verification failed: "${translatedText.slice(0, 80)}..." for original "${originalText.slice(0, 80)}..."`,
    );
    return null;
  } catch (err) {
    log.error("Translation verification error", err as Error);
    // On error, accept if no obvious refusal, reject if likely refusal
    return isLikelyRefusal ? null : translatedText;
  }
}

/**
 * Оптимизированный пакетный перевод - одним запросом несколько статей
 * Для экономии API вызовов
 */
export async function translateArticlesBatchOptimized(
  apiKey: string,
  articles: Array<{
    id: string;
    title_en: string;
    abstract_en?: string | null;
  }>,
  model = DEFAULT_MODEL,
): Promise<BatchTranslationResult> {
  if (articles.length === 0) {
    return { translated: 0, failed: 0, results: new Map() };
  }

  // Формируем один запрос со всеми статьями
  const prompt = articles
    .map((a, idx) => {
      const abs = a.abstract_en ? `\nАбстракт: ${a.abstract_en}` : "";
      return `[${idx + 1}] Заголовок: ${a.title_en}${abs}`;
    })
    .join("\n\n---\n\n");

  const systemPrompt = `Ты переводчик научных медицинских текстов. 
Тебе даны статьи с заголовками и абстрактами на английском.
Переведи каждую на русский язык, сохраняя научную терминологию.

ВАЖНО: Ответ должен быть в формате JSON массива:
[
  {"idx": 1, "title_ru": "...", "abstract_ru": "..."},
  {"idx": 2, "title_ru": "...", "abstract_ru": "..."}
]

Если абстракта нет - не добавляй поле abstract_ru.
Верни ТОЛЬКО JSON без пояснений.`;

  try {
    const res = await fetch(OPENROUTER_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://thesis.app",
        "X-Title": "Thesis Medical Research",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_tokens: 8000,
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`OpenRouter error ${res.status}: ${err.slice(0, 200)}`);
    }

    type OpenRouterResponse = {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const data = (await res.json()) as OpenRouterResponse;
    const content = data?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("Empty response");
    }

    // Парсим JSON ответ - пробуем разные варианты
    let translations: Array<{
      idx: number;
      title_ru?: string;
      abstract_ru?: string;
    }> = [];

    try {
      // Попытка 1: найти JSON массив
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        translations = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Попытка 2: исправить обрезанный JSON
      try {
        let fixed = content;
        // Удаляем всё после последней закрывающей скобки объекта
        const lastBrace = fixed.lastIndexOf("}");
        if (lastBrace > 0) {
          fixed = fixed.substring(0, lastBrace + 1) + "]";
          // Находим начало массива
          const firstBracket = fixed.indexOf("[");
          if (firstBracket >= 0) {
            fixed = fixed.substring(firstBracket);
            translations = JSON.parse(fixed);
          }
        }
      } catch {
        log.warn(
          "Could not parse batch translation response, falling back to sequential",
        );
        throw new Error("JSON parse failed");
      }
    }

    const results = new Map<string, TranslationResult>();
    let translated = 0;

    for (const tr of translations) {
      const article = articles[tr.idx - 1];
      if (article && (tr.title_ru || tr.abstract_ru)) {
        results.set(article.id, {
          title_ru: tr.title_ru,
          abstract_ru: tr.abstract_ru,
        });
        translated++;
      }
    }

    // Если ничего не перевелось пакетно, пробуем последовательно
    if (translated === 0 && articles.length > 0) {
      throw new Error("No translations in batch response");
    }

    return {
      translated,
      failed: articles.length - translated,
      results,
    };
  } catch (err) {
    log.error("Batch translation error", err as Error);
    // Фолбек на последовательный перевод
    log.info("Falling back to sequential translation...");
    return translateArticlesBatch(apiKey, articles, { model, delayMs: 200 });
  }
}
