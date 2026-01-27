# Анализ и улучшения графа цитирований

## 📊 Текущее состояние бэкенда

### Сильные стороны

1. **Умная приоритизация связей** - сортировка по цитированиям, частоте, году
2. **Redis кэширование** - дорогие запросы кэшируются
3. **Кластеризация** - группировка по годам (5-летние периоды) и журналам
4. **Лимиты производительности** - maxLinksPerNode, maxExtraNodes
5. **Многоуровневая глубина** - level 1 (проект), level 2 (ссылки), level 3 (цитирующие)
6. **Поддержка множества источников** - PubMed, DOAJ, Wiley, Crossref

### Текущие возможности

- Фильтрация по статусу (selected/excluded/all)
- Фильтрация по годам публикации
- Фильтрация по качеству статистики (p-value)
- Фильтрация по источнику статьи
- Поиск связей через PMIDs и DOIs
- Автоматическая кластеризация больших графов (>50 узлов)

## 🚀 Предлагаемые улучшения

### 1. **AI-агент для поиска релевантных статей**

#### Концепция

Использовать GPT-4 для анализа контекста проекта и поиска недостающих ключевых работ.

#### Реализация

```typescript
// POST /api/projects/:projectId/citation-graph/ai-search
// Body: { query: string, context?: string, maxResults?: number }

async function aiSearchRelevantPapers(
  projectContext: {
    title: string;
    articles: { title: string; abstract: string; pmid: string }[];
  },
  userQuery: string,
): Promise<{ pmids: string[]; reasoning: string }> {
  const prompt = `
Анализируя проект "${projectContext.title}" со статьями:
${projectContext.articles.map((a) => `- ${a.title} (PMID: ${a.pmid})`).join("\n")}

Пользователь ищет: "${userQuery}"

Предложи 10-20 ключевых PMIDs релевантных статей, которые:
1. Цитируют работы проекта или цитируются ими
2. Исследуют схожую методологию или тематику
3. Заполняют пробелы в текущем графе знаний

Верни JSON: { "pmids": ["12345", ...], "reasoning": "..." }
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  return JSON.parse(response.choices[0].message.content);
}
```

#### Endpoint

```typescript
fastify.post(
  "/projects/:projectId/citation-graph/ai-search",
  { preHandler: [fastify.authenticate] },
  async (request, reply) => {
    const { query, maxResults = 20 } = request.body;

    // 1. Загружаем контекст проекта
    const projectArticles = await loadProjectArticles(projectId);

    // 2. AI анализ
    const aiResults = await aiSearchRelevantPapers(
      { title: project.title, articles: projectArticles },
      query,
    );

    // 3. Загружаем полные данные найденных статей
    const articles = await pubmedFetchByPmids(
      aiResults.pmids.slice(0, maxResults),
    );

    return {
      articles,
      reasoning: aiResults.reasoning,
      sources: ["AI recommendation"],
    };
  },
);
```

---

### 2. **Умная группировка (Smart Clustering)**

#### 2.1 Семантическая кластеризация через embeddings

```typescript
// Используем text-embedding-3-small для векторизации абстрактов
async function semanticClustering(
  articles: { id: string; title: string; abstract: string }[],
): Promise<Cluster[]> {
  // 1. Генерируем embeddings для всех абстрактов
  const embeddings = await Promise.all(
    articles.map((a) =>
      openai.embeddings.create({
        model: "text-embedding-3-small",
        input: `${a.title}\n${a.abstract}`,
      }),
    ),
  );

  // 2. Кластеризация через k-means или hierarchical clustering
  const clusters = kMeansClustering(
    embeddings.map((e) => e.data[0].embedding),
    { k: Math.ceil(articles.length / 15) }, // ~15 статей на кластер
  );

  // 3. Генерируем названия кластеров через GPT
  for (const cluster of clusters) {
    const titles = cluster.articles.map((a) => a.title).join("\n");
    const clusterName = await generateClusterName(titles);
    cluster.label = clusterName;
  }

  return clusters;
}
```

#### 2.2 Кластеризация по методологии

```sql
-- Добавляем колонку для методологических тегов
ALTER TABLE articles ADD COLUMN methodology_tags TEXT[];

-- AI экстракция методологии из абстракта
-- Теги: "meta-analysis", "RCT", "cohort", "case-control", "systematic-review", etc.
```

```typescript
// Группировка по методологии
function methodologyClustering(articles: Article[]): Cluster[] {
  const methodGroups = new Map<string, Article[]>();

  for (const article of articles) {
    for (const tag of article.methodology_tags || []) {
      if (!methodGroups.has(tag)) {
        methodGroups.set(tag, []);
      }
      methodGroups.get(tag)!.push(article);
    }
  }

  return Array.from(methodGroups.entries()).map(([method, arts]) => ({
    id: `methodology:${method}`,
    label: `Методология: ${method} (${arts.length})`,
    articles: arts,
    clusterType: "methodology",
  }));
}
```

---

### 3. **Поиск скрытых связей (Link Prediction)**

#### Концепция

Найти статьи, которые _должны_ цитировать друг друга, но не цитируют (gap analysis).

#### Реализация через graph embeddings

```typescript
// Node2Vec или GraphSAGE для создания векторных представлений узлов
async function findMissingLinks(
  graph: { nodes: Node[]; links: Link[] },
  threshold = 0.85, // Cosine similarity
): Promise<SuggestedLink[]> {
  // 1. Обучаем Node2Vec на текущем графе
  const embeddings = await node2vec.fit(graph);

  // 2. Для каждой пары узлов считаем similarity
  const suggestions: SuggestedLink[] = [];

  for (let i = 0; i < graph.nodes.length; i++) {
    for (let j = i + 1; j < graph.nodes.length; j++) {
      const sim = cosineSimilarity(embeddings[i], embeddings[j]);

      // Если similarity высокий, но связи нет
      const hasLink = graph.links.some(
        (l) =>
          (l.source === i && l.target === j) ||
          (l.source === j && l.target === i),
      );

      if (sim > threshold && !hasLink) {
        suggestions.push({
          source: graph.nodes[i],
          target: graph.nodes[j],
          similarity: sim,
          reasoning: await explainSimilarity(graph.nodes[i], graph.nodes[j]),
        });
      }
    }
  }

  return suggestions.sort((a, b) => b.similarity - a.similarity).slice(0, 50);
}
```

---

### 4. **Поиск по контексту (Context-Aware Search)**

```typescript
// POST /api/projects/:projectId/citation-graph/context-search
// Body: { contextNodes: string[], query: string, radius?: number }

async function contextAwareSearch(
  contextNodes: Node[], // Узлы-якоря
  query: string,
  radius = 2, // Сколько уровней от контекста искать
): Promise<Node[]> {
  // 1. Находим все узлы в радиусе от контекстных
  const neighborhood = expandNeighborhood(contextNodes, radius);

  // 2. Семантический поиск в окрестности
  const queryEmbedding = await getEmbedding(query);
  const nodeEmbeddings = await Promise.all(
    neighborhood.map((n) => getEmbedding(`${n.title}\n${n.abstract}`)),
  );

  // 3. Ранжируем по relevance
  const scored = neighborhood.map((node, i) => ({
    node,
    score: cosineSimilarity(queryEmbedding, nodeEmbeddings[i]),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((s) => s.node);
}
```

---

### 5. **Временная динамика (Temporal Analysis)**

```typescript
// GET /api/projects/:projectId/citation-graph/timeline
// Показывает эволюцию тематики по годам

interface Timeline {
  year: number;
  nodeCount: number;
  topTopics: string[]; // AI-генерируемые темы
  keyPapers: Node[]; // Самые цитируемые за год
  trends: {
    emerging: string[]; // Новые темы
    declining: string[]; // Угасающие темы
  };
}

async function buildTimeline(graph: Graph): Promise<Timeline[]> {
  const byYear = groupBy(graph.nodes, (n) => n.year);

  const timeline: Timeline[] = [];

  for (const [year, nodes] of Object.entries(byYear)) {
    // AI экстракция тем для года
    const topics = await extractTopics(
      nodes.map((n) => n.abstract).join("\n\n"),
    );

    timeline.push({
      year: parseInt(year),
      nodeCount: nodes.length,
      topTopics: topics.slice(0, 5),
      keyPapers: nodes
        .sort((a, b) => b.citedByCount - a.citedByCount)
        .slice(0, 5),
      trends: await detectTrends(year, topics),
    });
  }

  return timeline.sort((a, b) => a.year - b.year);
}
```

---

### 6. **Интеллектуальные рекомендации**

```typescript
// GET /api/projects/:projectId/citation-graph/recommendations
// AI-агент анализирует граф и предлагает действия

interface Recommendation {
  type:
    | "missing_citation"
    | "orphan_cluster"
    | "weak_connection"
    | "outdated_paper";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  action: {
    type: "add_article" | "fetch_references" | "review";
    payload: any;
  };
}

async function generateRecommendations(
  graph: Graph,
): Promise<Recommendation[]> {
  const recs: Recommendation[] = [];

  // 1. Orphan nodes (изолированные статьи)
  const orphans = graph.nodes.filter(
    (n) =>
      graph.links.filter((l) => l.source === n.id || l.target === n.id)
        .length === 0,
  );

  if (orphans.length > 0) {
    recs.push({
      type: "orphan_cluster",
      title: `${orphans.length} изолированных статей`,
      description: "Статьи без связей с остальным графом",
      priority: "high",
      action: {
        type: "fetch_references",
        payload: { nodeIds: orphans.map((o) => o.id) },
      },
    });
  }

  // 2. Старые ключевые работы без современных цитирований
  const outdated = graph.nodes.filter(
    (n) =>
      n.citedByCount > 50 && n.year < 2015 && !hasRecentCitations(n, graph),
  );

  for (const node of outdated) {
    const modernAlternatives = await findModernEquivalents(node);
    recs.push({
      type: "outdated_paper",
      title: `Обновить "${node.title.slice(0, 50)}..."`,
      description: `Статья ${node.year} года - найдены более свежие альтернативы`,
      priority: "medium",
      action: {
        type: "add_article",
        payload: { suggestions: modernAlternatives },
      },
    });
  }

  // 3. Слабые связи между кластерами
  const clusters = detectCommunities(graph);
  for (let i = 0; i < clusters.length; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      const bridgeCount = countBridges(clusters[i], clusters[j], graph);
      if (bridgeCount < 2) {
        recs.push({
          type: "weak_connection",
          title: `Слабая связь между кластерами "${clusters[i].label}" и "${clusters[j].label}"`,
          description: `Только ${bridgeCount} связей между группами`,
          priority: "low",
          action: { type: "review", payload: { clusters: [i, j] } },
        });
      }
    }
  }

  return recs.sort((a, b) => priorityScore(b) - priorityScore(a));
}
```

---

### 7. **Экспорт и шаринг**

```typescript
// GET /api/projects/:projectId/citation-graph/export
// Форматы: json, graphml, gexf, cytoscape

async function exportGraph(graph: Graph, format: string): Promise<Buffer> {
  switch (format) {
    case "graphml":
      return toGraphML(graph);
    case "gexf":
      return toGEXF(graph);
    case "cytoscape":
      return toCytoscape(graph);
    case "gephi":
      return toGephi(graph);
    default:
      return Buffer.from(JSON.stringify(graph, null, 2));
  }
}

// POST /api/projects/:projectId/citation-graph/share
// Создаёт публичную ссылку на граф (read-only)

async function createShareLink(projectId: string): Promise<string> {
  const shareToken = crypto.randomUUID();

  await pool.query(
    `INSERT INTO graph_shares (project_id, token, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [projectId, shareToken],
  );

  return `https://mdsystem.app/shared/graph/${shareToken}`;
}
```

---

## 📋 План внедрения (приоритизация)

### Фаза 1: Быстрые победы (1-2 недели)

1. ✅ Исправление fullscreen режима
2. ✅ Академичный дизайн узлов
3. 🔄 **Экспорт графа** (GraphML, JSON) - простая функция
4. 🔄 **Улучшенные рекомендации** (orphan detection, weak links)

### Фаза 2: AI интеграция (2-3 недели)

5. 🆕 **AI-поиск релевантных статей** через GPT-4
6. 🆕 **Семантическая кластеризация** через embeddings
7. 🆕 **Context-aware search** - поиск в окрестности узлов

### Фаза 3: Продвинутая аналитика (3-4 недели)

8. 🆕 **Link prediction** - поиск скрытых связей через graph embeddings
9. 🆕 **Временная динамика** - анализ эволюции тематики
10. 🆕 **Методологическая кластеризация** - группировка по типам исследований

### Фаза 4: Социальные функции (опционально)

11. 🆕 **Публичный шаринг** графов
12. 🆕 **Коллаборативный режим** - совместное редактирование

---

## 💡 Технические требования

### База данных

```sql
-- Новая таблица для AI-генерированных тегов
CREATE TABLE article_ai_tags (
  article_id UUID REFERENCES articles(id),
  tag_type VARCHAR(50), -- 'topic', 'methodology', 'cluster'
  tag_value TEXT,
  confidence FLOAT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (article_id, tag_type, tag_value)
);

CREATE INDEX idx_ai_tags_type ON article_ai_tags(tag_type);
CREATE INDEX idx_ai_tags_value ON article_ai_tags(tag_value);

-- Таблица для embeddings (векторный поиск)
CREATE TABLE article_embeddings (
  article_id UUID PRIMARY KEY REFERENCES articles(id),
  embedding vector(1536), -- OpenAI text-embedding-3-small
  model VARCHAR(50) DEFAULT 'text-embedding-3-small',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- pgvector extension для similarity search
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX idx_embeddings_cosine ON article_embeddings
  USING ivfflat (embedding vector_cosine_ops);

-- Таблица для публичного шаринга
CREATE TABLE graph_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_graph_shares_token ON graph_shares(token);
```

### Новые зависимости

```json
{
  "dependencies": {
    "@tensorflow/tfjs-node": "^4.x", // Для Node2Vec
    "openai": "^4.x", // GPT-4 и embeddings
    "ml-kmeans": "^6.x", // Кластеризация
    "graphology": "^0.25.x", // Graph algorithms
    "graphology-layout-forceatlas2": "^0.x", // Layout алгоритмы
    "pg": "^8.x",
    "pgvector": "^0.2.x" // Векторный поиск в Postgres
  }
}
```

---

## 🎯 Ожидаемые результаты

После внедрения улучшений граф цитирований станет:

1. **Умным помощником** - AI предлагает релевантные статьи
2. **Визуально понятным** - семантические кластеры с говорящими названиями
3. **Предиктивным** - находит скрытые связи и пробелы
4. **Контекстуальным** - поиск с учётом окружения узлов
5. **Динамичным** - показывает эволюцию тематики во времени
6. **Социальным** - экспорт и публичный шаринг

**Главное преимущество**: превращение графа из простой визуализации в **инструмент для научных открытий**.
