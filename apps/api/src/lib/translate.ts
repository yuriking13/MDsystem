/**
 * Перевод текста через OpenRouter API
 * Использует модель (напр. GPT-4o-mini или Claude) для перевода заголовков и абстрактов
 */

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
  model = DEFAULT_MODEL
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
  model = DEFAULT_MODEL
): Promise<TranslationResult> {
  const result: TranslationResult = {};

  // Переводим заголовок
  try {
    result.title_ru = await translateText(apiKey, title, model);
  } catch (err) {
    console.error("Title translation error:", err);
  }

  // Переводим абстракт если есть
  if (abstract && abstract.length > 10) {
    try {
      result.abstract_ru = await translateText(apiKey, abstract, model);
    } catch (err) {
      console.error("Abstract translation error:", err);
    }
  }

  return result;
}

/**
 * Пакетный перевод нескольких статей
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
  } = {}
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
        model
      );

      if (tr.title_ru || tr.abstract_ru) {
        results.set(article.id, tr);
        translated++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`Translation failed for ${article.id}:`, err);
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
  model = DEFAULT_MODEL
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

    // Парсим JSON ответ
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No JSON array in response");
    }

    const translations = JSON.parse(jsonMatch[0]) as Array<{
      idx: number;
      title_ru?: string;
      abstract_ru?: string;
    }>;

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

    return {
      translated,
      failed: articles.length - translated,
      results,
    };
  } catch (err) {
    console.error("Batch translation error:", err);
    // Фолбек на последовательный перевод
    return translateArticlesBatch(apiKey, articles, { model });
  }
}
