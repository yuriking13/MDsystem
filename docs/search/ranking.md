# Ranking pipeline (preview)

1. **Signals**
   - lexical overlap по title+abstract.
   - freshness (новизна по году).
   - citations (при наличии, нормализованное tanh).
   - hasStats (статистические данные в тексте).
   - aiScore (результат AI relevance, fail-safe = 0).

2. **Формула (по умолчанию)**

```
score = 4*lexical + 2*freshness + 1*citations + 1*stats + 2*ai
```

3. **Explainability**
   Каждая статья возвращает breakdown (lexical, freshness, citations, stats, ai) и список `explain` для отображения в UI или логах.

4. **Фича-флаги**

- `FEATURE_NEW_RANKING_PIPELINE` — включает ранжирование (по умолчанию включено).
- `FEATURE_AI_AS_SIGNAL` — использовать AI как сигнал, не как фильтр.
- `FEATURE_EARLY_STOP` — остановка сбора после достижения буфера (`maxResults + 25`) и отправка partial results.

5. **Partial results**
   При включённом `FEATURE_EARLY_STOP` отправляется событие `search:partial-results` с топ-20 статей (score + explain) для ускорения TTFB.
