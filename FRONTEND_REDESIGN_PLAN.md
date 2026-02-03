# 🎨 ПОЛНАЯ ПЕРЕСБОРКА ФРОНТЕНДА MDsystem - ПЛАН РЕАЛИЗАЦИИ

## 📋 КОНТЕКСТ

Выполни полную модернизацию фронтенда научно-исследовательской платформы MDsystem на основе предоставленных скриншотов. Текущая версия работает на React 18.3 + TypeScript + Vite + Tiptap. Цель - создать современный, профессиональный интерфейс мирового уровня для научных исследователей.

---

## 🎯 ГЛАВНЫЕ ЦЕЛИ РЕДИЗАЙНА

### 1. Визуальная Система

- **Дизайн-система**: Создать comprehensive design system с токенами, компонентами, паттернами
- **Цветовая палитра**: Профессиональная научная палитра для светлой и темной темы
- **Типографика**: Система шрифтов для научного контента (читабельность, иерархия)
- **Spacing & Layout**: Консистентная система отступов и сеток
- **Иконография**: Единообразный стиль иконок (Heroicons/Lucide)

### 2. Архитектурные Улучшения

- **Компонентная библиотека**: Создать reusable UI kit
- **Theme System**: Продвинутая система тем с CSS Variables
- **Responsive Design**: Mobile-first подход
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Code splitting, lazy loading, виртуализация

---

## 📸 АНАЛИЗ СКРИНШОТОВ И ТРЕБОВАНИЯ

### СКРИНШОТ 1: Document Editor (Редактор документов)

**Текущий дизайн:**

```
┌────────────────────────────────────────────────────────────┐
│ [MDsystem] [Title] [Format] [+Section] [Comment] [Share]  │ ← Header
├──────┬─────────────────────────────────────────────┬───────┤
│      │                                             │       │
│ OUT- │   Analysis of Cardiovascular Trends         │ BIBLI-│
│ LINE │   in COVID-19 Patients                      │ OGRA- │
│      │                                             │ PHY   │
│ ├Ab- │   Authors: Dr Emily Chen, Dr Mark Roberts   │       │
│ │str │                                             │ [1]   │
│ ├1.  │   ABSTRACT                                  │ Long  │
│ │Intr│   │ This study investigates...              │ COVID │
│ ││1.1 │   │ Utilizing a dataset...                 │       │
│ ││1.2 │   └─────────────────────────────────────   │ [2]   │
│ ├2.  │                                             │ Mecha-│
│ │Meth│   1. Introduction                           │ nisms │
│ ├3.  │   The aftermath of COVID-19 pandemic        │       │
│ │Resu│   has left a substantial portion...         │ [3]   │
│ ├4.  │                                             │ Global│
│ │Disc│   1.1 Background                            │ Regis-│
│ └5.  │   Previous respiratory pandemics...         │ try   │
│ Conc │                                             │       │
│      │   [Word Count Goal: 2,400/3,500]            │       │
└──────┴─────────────────────────────────────────────┴───────┘
```

**Требования к реализации:**

1. **Header Bar**
   - Минималистичный, фиксированный
   - Breadcrumb навигация
   - Quick actions (Format, Add Section, Comment, Share)
   - Auto-save indicator
   - Collaborators avatars (если multiple users)

2. **Left Sidebar: Document Outline**
   - Collapsible панель (toggle кнопка)
   - Tree view структуры документа
   - Drag-and-drop для реорганизации
   - Active section highlight
   - Click to navigate
   - Scroll sync с основным документом
   - Width: 200-280px

3. **Main Editor Area**
   - Google Docs-подобный чистый дизайн
   - Максимальная ширина для читабельности (680-720px)
   - Centered layout
   - Тени для "поднятия" контента
   - Inline цитирования [1], [2] с hover preview
   - Rich formatting toolbar (floating или sticky)
   - Comments в margins
   - Track changes визуализация

4. **Right Sidebar: Bibliography**
   - Collapsible панель
   - Список всех цитирований
   - Sortable (по номеру, названию, автору)
   - Search в библиографии
   - Click to highlight в тексте
   - Quick actions (edit, remove, insert)
   - Citation count badge
   - Width: 280-320px

5. **Bottom Status Bar**
   - Word count с прогрессом к цели
   - Character count
   - Page count
   - Reading time estimate
   - Last saved timestamp

6. **Toolbar/Menu**
   - Sticky при скролле
   - Группировка команд: Format | Insert | Tools | Export
   - Icon + label для clarity
   - Keyboard shortcuts hints (tooltip)
   - Responsive collapse в меню на узких экранах

**Технические детали:**

```typescript
// Структура компонентов
<DocumentEditor>
  <EditorHeader
    title={doc.title}
    breadcrumb={breadcrumb}
    collaborators={users}
    onShare={handleShare}
    autoSaveStatus="saved"
  />

  <EditorLayout>
    <Sidebar position="left" collapsible>
      <DocumentOutline
        headings={headings}
        activeId={activeHeading}
        onNavigate={scrollToHeading}
        onReorder={handleReorder}
      />
    </Sidebar>

    <EditorMain>
      <TiptapEditor
        content={content}
        onChange={handleChange}
        plugins={[
          CitationPlugin,
          CommentsPlugin,
          TrackChangesPlugin,
          TablePlugin
        ]}
      />
      <StatusBar
        wordCount={count}
        goal={3500}
        pages={pages}
        lastSaved={timestamp}
      />
    </EditorMain>

    <Sidebar position="right" collapsible>
      <Bibliography
        citations={citations}
        onInsert={insertCitation}
        onEdit={editCitation}
        onRemove={removeCitation}
        sortBy="number"
      />
    </Sidebar>
  </EditorLayout>
</DocumentEditor>
```

**Стилистика:**

- Фон: Светло-серый (#F9FAFB) для контраста с белым редактором
- Редактор: Чисто белый (#FFFFFF) с subtle shadow
- Типографика: Georgia/Charter для body, SF Pro/Inter для UI
- Line height: 1.6-1.8 для научного текста
- Font size: 16-18px для body текста

---

### СКРИНШОТ 2: Citation Graph (Граф цитирований)

**Текущий дизайн:**

```
┌────────────────────────────────────────────────────────────┐
│ [MDsystem] [Dashboard] [Citation Graph] [Library] [Profile]│
├──────┬───────────────────────────────────────────┬─────────┤
│      │  [🔍] [🔎] [⤢] [💾]   [Export to PNG]     │ Publica-│
│ Pro- │                                           │ tion    │
│ ject │                                           │ Details │
│ Alpha│              ┌──────────┐                 │ ×       │
│      │              │ SELECTED │                 │         │
│☑Nodes│         ┌────┤ Precision│                 │☑SELECTED│
│ Fil- │         │    │ Medicine │                 │         │
│ ters │    ┌────┤    └──────────┘                 │ Preci-  │
│ Ana- │    │    │         │                       │ sion    │
│ lytics   │CANDIDATE    │    ┌──────────┐         │ Medicine│
│ His- │    │    └─────────────┤ EXCLUDED │         │ in Meta-│
│ tory │    │                  │ Research │         │ static  │
│      │    │                  └──────────┘         │ Colorec-│
│      │    │                                       │ tal...  │
│      │ ┌──▼────┐                                  │         │
│ Upg- │ │SELECTED                                  │ [Authors]│
│ rade │ │Evidence│         ┌──────────┐            │ Smith J.│
│ ───► │ │for Drug│─────────┤SELECTED  │            │ Johnson │
│      │ │Response│         │Biomarker │            │         │
│      │ └────────┘         └──────────┘            │ [DOI]   │
│      │                                           │ 10.1038  │
│      │  • 2 articles selected • 3 links          │         │
│      │                                           │[Open PDF]│
│      │                                           │[Exclude] │
│      │                                           │[Change  │
│      │                                           │ Status] │
└──────┴───────────────────────────────────────────┴─────────┘
```

**Требования к реализации:**

1. **Left Panel: Graph Controls**
   - Секции: Nodes, Filters, Analytics, History
   - Expandable/collapsible секции
   - Toggle switches для типов нод
   - Checkboxes для фильтров
   - Analytics stats (node count, link count, clusters)
   - History с undo/redo операциями
   - Upgrade prompt для премиум функций
   - Width: 240-280px
   - Dark theme background

2. **Center: Graph Canvas**
   - ReactFlow/D3.js визуализация
   - Node types с цветовым кодированием:
     - SELECTED (синий/зеленый)
     - CANDIDATE (серый)
     - EXCLUDED (красный)
   - Directed edges (стрелки)
   - Node labels с wrap
   - Interactive:
     - Drag nodes
     - Pan canvas
     - Zoom (mouse wheel + controls)
     - Click to select
     - Hover for tooltip
   - Layout algorithms:
     - Force-directed
     - Hierarchical
     - Circular
   - Mini-map в углу для навигации

3. **Top Toolbar**
   - Zoom in/out controls
   - Fit to screen
   - Save layout
   - Export (PNG, SVG, PDF)
   - Layout algorithm selector
   - Search nodes
   - Filter panel toggle

4. **Right Panel: Node Details**
   - Closable (×)
   - Publication metadata:
     - Title (h3)
     - Authors
     - Journal, Year
     - DOI (clickable)
     - Abstract preview (expandable)
   - Status badge (SELECTED/CANDIDATE/EXCLUDED)
   - Connection info:
     - Incoming citations count
     - Outgoing citations count
     - Related articles
   - Actions:
     - Open Full PDF
     - Change Status
     - Exclude
     - View in library
   - Width: 320-380px

5. **Status Bar (Bottom)**
   - Selected articles count
   - Total links count
   - Current filter info
   - AI suggestions prompt

**Технические детали:**

```typescript
// Структура компонентов
<CitationGraphView>
  <GraphHeader />

  <GraphLayout>
    <ControlPanel theme="dark" width={280}>
      <Section title="Nodes" collapsible>
        <Toggle label="Selected" checked={filters.selected} />
        <Toggle label="Candidate" checked={filters.candidate} />
        <Toggle label="Excluded" checked={filters.excluded} />
      </Section>

      <Section title="Filters" collapsible>
        <DateRangeFilter />
        <PublicationTypeFilter />
        <JournalFilter />
      </Section>

      <Section title="Analytics">
        <Stat label="Total Nodes" value={nodeCount} />
        <Stat label="Connections" value={edgeCount} />
        <Stat label="Clusters" value={clusterCount} />
      </Section>

      <Section title="History">
        <HistoryList items={history} />
      </Section>
    </ControlPanel>

    <GraphCanvas>
      <GraphToolbar>
        <ZoomControls />
        <LayoutSelector />
        <ExportButton formats={['png', 'svg', 'pdf']} />
        <SearchInput placeholder="Search nodes..." />
      </GraphToolbar>

      <ReactFlowGraph
        nodes={nodes}
        edges={edges}
        nodeTypes={customNodeTypes}
        onNodeClick={handleNodeClick}
        fitView
      />

      <GraphMiniMap />
      <GraphStatusBar />
    </GraphCanvas>

    {selectedNode && (
      <DetailPanel onClose={closePanel}>
        <PublicationCard
          publication={selectedNode.data}
          actions={[
            { label: 'Open PDF', icon: FileIcon },
            { label: 'Change Status', icon: EditIcon },
            { label: 'Exclude', icon: XIcon }
          ]}
        />
      </DetailPanel>
    )}
  </GraphLayout>
</CitationGraphView>
```

**Стилистика:**

- Dark theme: #0F172A (background), #1E293B (panels)
- Accent: #3B82F6 (blue) для selected
- Node colors:
  - Selected: #10B981 (emerald)
  - Candidate: #6B7280 (gray)
  - Excluded: #EF4444 (red)
- Typography: Inter/SF Pro для UI
- Smooth animations для transitions

---

### СКРИНШОТ 3: Chart Builder (Создание графиков)

**Текущий дизайн:**

```
┌────────────────────────────────────────────────────────────┐
│              MDsystem Statistics & Chart Builder       ×/□/×│
├────────────────────────────────────────────────────────────┤
│                                                            │
│  📊 Chart Wizard: Population Density Analysis             │
│                                                            │
│  ┌─────────────────────┬────────────────────────────────┐ │
│  │ RAW DATA SOURCE     │  Live Chart Preview            │ │
│  │                     │                                 │ │
│  │ ID  COHORT   BM_VAL │  Changes are updated in real-  │ │
│  │ ──  ───────  ────── │  time                          │ │
│  │ #7291 Alpha-1  12.4 │                                 │ │
│  │ #7242 Alpha-2   8.9 │      ┌─┐                       │ │
│  │ #7204 Beta-3   10.1 │      │ │      ┌─┐              │ │
│  │ #7234 Beta-2    6.2 │      │ │      │ │  ┌─┐         │ │
│  │ #7235 Alpha-1  11.7 │  ┌─┐ │ │  ┌─┐ │ │  │ │         │ │
│  │ #7236 Gamma-3  22.1 │  │ │ │ │  │ │ │ │  │ │  ┌─┐   │ │
│  │ #7237 Alpha-1  13.5 │  │ │ │ │  │ │ │ │  │ │  │ │   │ │
│  │                     │  └─┘ └─┘  └─┘ └─┘  └─┘  └─┘   │ │
│  │                     │  COHORT A  COHORT B  COHORT C   │ │
│  │  [Edit CSV]         │  COHORT D                      │ │
│  │                     │  ↑ Y-AXIS LABEL               │ │
│  │                     │  Clinical Groups              │ │
│  │                     │                               │ │
│  │                     │  → X-AXIS LABEL               │ │
│  │                     │  Concentration (mg/dL)        │ │
│  └─────────────────────┴────────────────────────────────┘ │
│                                                            │
│  🤖 2 other users are currently editing this project      │
│                                                            │
│  [Discard Draft]                      [Generate Chart] ── │
└────────────────────────────────────────────────────────────┘
```

**Требования к реализации:**

1. **Modal/Fullscreen Dialog**
   - Dark theme для фокуса
   - Escape to close
   - Max-width: 1200px
   - Centered
   - Semi-transparent backdrop

2. **Header**
   - Chart wizard title с типом графика
   - Step indicator (1/3, 2/3, 3/3)
   - Close button
   - Chart type selector (Bar, Line, Pie, etc.)

3. **Split Layout**
   - **Left: Data Input (50%)**
     - Editable table/grid (Handsontable/AG Grid)
     - CSV import button
     - Paste data from Excel
     - Column headers editable
     - Row actions (add, delete, reorder)
     - Data validation indicators
     - Sample data button
   - **Right: Live Preview (50%)**
     - Real-time chart rendering
     - Chart.js/Recharts визуализация
     - Auto-update on data change
     - "Changes updated in real-time" hint
     - Preview different chart types
     - Responsive chart size

4. **Configuration Panel (Below split)**
   - Axis labels input
   - Chart title
   - Color scheme selector
   - Legend position
   - Data series selection
   - Advanced options (collapsible)

5. **Footer**
   - Collaboration indicator (avatars + "2 users editing")
   - Draft auto-save status
   - Action buttons:
     - Discard Draft (secondary)
     - Generate Chart (primary, blue)
     - Save as Template
     - Export Data

**Технические детали:**

```typescript
// Структура компонентов
<ChartBuilderModal open={isOpen} onClose={handleClose}>
  <ModalHeader>
    <ChartWizardTitle
      type={chartType}
      step={currentStep}
      totalSteps={3}
    />
    <ChartTypeSelector
      selected={chartType}
      onChange={setChartType}
      types={['bar', 'line', 'pie', 'scatter', 'boxplot']}
    />
    <CloseButton onClick={handleClose} />
  </ModalHeader>

  <ModalBody>
    <SplitPanel>
      <Panel width="50%">
        <SectionHeader title="RAW DATA SOURCE" />
        <EditableDataGrid
          data={rawData}
          onChange={handleDataChange}
          columns={columns}
          onAddRow={addRow}
          onDeleteRow={deleteRow}
          validation={dataValidation}
        />
        <DataActions>
          <Button onClick={importCSV}>Import CSV</Button>
          <Button onClick={pasteFromClipboard}>Paste Data</Button>
          <Button onClick={loadSample}>Load Sample</Button>
        </DataActions>
      </Panel>

      <Panel width="50%">
        <SectionHeader
          title="Live Chart Preview"
          subtitle="Changes are updated in real-time"
        />
        <ChartPreview
          type={chartType}
          data={processedData}
          config={chartConfig}
          responsive
        />
        <ChartConfig>
          <Input
            label="X-AXIS LABEL"
            value={xAxisLabel}
            onChange={setXAxisLabel}
          />
          <Input
            label="Y-AXIS LABEL"
            value={yAxisLabel}
            onChange={setYAxisLabel}
          />
          <ColorSchemePicker
            selected={colorScheme}
            onChange={setColorScheme}
          />
        </ChartConfig>
      </Panel>
    </SplitPanel>
  </ModalBody>

  <ModalFooter>
    <CollaborationIndicator users={activeUsers} />
    <AutoSaveStatus status="saved" timestamp={lastSaved} />
    <Actions>
      <Button variant="ghost" onClick={discardDraft}>
        Discard Draft
      </Button>
      <Button variant="primary" onClick={generateChart}>
        Generate Chart
      </Button>
    </Actions>
  </ModalFooter>
</ChartBuilderModal>
```

**Стилистика:**

- Dark modal: #0F172A background
- Table: #1E293B с borders #334155
- Preview area: Slightly lighter #1E293B
- Accent: #3B82F6 (blue) для buttons
- Success indicators: #10B981 (green) для "Stable" badges
- Warning: #F59E0B (amber) для "Warning" badges

---

### СКРИНШОТ 4: Articles Search (Поиск статей)

**Текущий дизайн:**

```
┌────────────────────────────────────────────────────────────┐
│ 👤 MDsystem   Projects › Cardiovascular Risk Analysis  🔔 👤│
├──────┬─────────────────────────────────────────────┬───────┤
│ DATA │ Articles 142  Documents Files Stats Graph   │ 🤖 MD │
│ SOUR │                                             │ Assis │
│ CES  │          Research Feed    Sort: Relevance▼  │ tant  │
│      │                                             │       │
│ ☑Pub │  ☐ Translate  📊 Detect Stats  ⬇ Export   │ I've  │
│ Med  │  ─────────────────────────────────  2 sel. │ analy-│
│ Cent │                                             │ zed   │
│ ral  │  Long-term effects of statin therapy on    │ the   │
│      │  cardiovascular outcomes in elderly...     │ 142   │
│ ☐DOA │  Smith, R., Johnson, L., et al. • Lancet • │ arti- │
│ J    │  2023                        [SELECTED][RCT]│ cles. │
│      │  Background: While statins are widely...   │ Would │
│ ☐Wil │                                             │ you   │
│ ey   │  DOI 10.1016/S0140-6736(23)      View Abs. │ like  │
│ Onli │  ─────────────────────────────────────────  │ me to │
│ ne   │                                             │       │
│ Lib  │  Comparative analysis of novel lipid-      │ • Sum-│
│ rary │  lowering agents: A systematic review      │ marize│
│      │  Chen, L., Wu, S., Wang, J. • 2024         │ find- │
│ ☐Sci │                             [CANDIDATE]     │ ings  │
│ ence │  This systematic review evaluates the...   │ from  │
│ Dire │                                             │ selec-│
│ ct   │  DOI 10.1001/jama.arts.2024   View Abstract│ ted   │
│      │  ─────────────────────────────────────────  │ field │
│ PUB  │                                             │       │
│ DATE │  Genetic markers for early-onset...        │ • Hig-│
│      │  Gupta, R., et al. • Nature Genetics • 2023│ hlight│
│ Last │                                    [REVIEW] │ evide-│
│ 5Yrs │  Genome-wide association studies...        │ nce   │
│ ▼    │                                             │ on... │
│      │  DOI 10.1038/ng.1488          View Abstract│       │
│ TYPE │  ─────────────────────────────────────────  │ SUGGE │
│      │                                             │ STED  │
│ ☐Cli │                                             │ QUER. │
│ nical│                                             │       │
│ Trial│                                             │ • LDL │
│      │                                             │ reduc │
│ ☐Sys │                                             │ by    │
│ tem. │                                             │ metho │
│ Revie│                                             │ dolog │
│      │                                             │       │
│ ☐Meta│ [Reset Filters]                             │ Ask AI│
│ -Ana │                                             │ about │
│ lysis│                                             │ arti. │
└──────┴─────────────────────────────────────────────┴───────┘
```

**Требования к реализации:**

1. **Top Navigation**
   - Breadcrumb: Projects › Project Name
   - Tab bar: Articles, Documents, Files, Stats, Graph, Team, Settings
   - Active tab indicator
   - Article count badge
   - User profile & notifications icons

2. **Left Sidebar: Filters**
   - Width: 240-280px
   - Sticky position при скролле
   - Sections:
     - **DATA SOURCES**
       - Checkboxes для PubMed, DOAJ, Wiley, ScienceDirect
       - Source counts в скобках
     - **PUBLICATION DATE**
       - Dropdown с presets (Last 5 Years, Last 10 Years)
       - Custom date range picker
     - **PUBLICATION TYPE**
       - Checkboxes: Clinical Trial, Systematic Review, Meta-Analysis, RCT, Review
     - **TEXT AVAILABILITY**
       - Free full text, Abstract only, etc.
   - Reset Filters button внизу
   - Collapse/expand sections

3. **Center: Research Feed**
   - Header:
     - Title "Research Feed"
     - Sort dropdown (Relevance, Date, Citations)
     - View toggle (List/Grid)
   - Bulk actions toolbar (appears when items selected):
     - Translate
     - Detect Stats
     - Export
     - Change Status
     - Selected count indicator
   - Article cards:
     - Checkbox для selection
     - Title (bold, larger font)
     - Authors • Journal • Year
     - Status badges (SELECTED/CANDIDATE/EXCLUDED/RCT/REVIEW)
     - Abstract preview (truncated, expandable)
     - DOI link
     - Actions: View Abstract, View Full Text, Download PDF
     - Hover effects
   - Infinite scroll или pagination
   - Empty state с подсказками

4. **Right Sidebar: MD Assistant (AI)**
   - Width: 320-360px
   - Fixed position
   - Avatar icon
   - Conversation-style interface
   - AI suggestions:
     - Summary of analyzed articles
     - Action buttons (Summarize findings, Highlight evidence, etc.)
   - SUGGESTED QUERIES section:
     - Quick search templates
     - Click to execute
   - "Ask AI about articles" input
   - Expandable/collapsible
   - Chat history

**Технические детали:**

```typescript
// Структура компонентов
<ArticlesPage>
  <PageHeader>
    <Breadcrumb items={['Projects', projectName]} />
    <TabNav
      tabs={[
        { id: 'articles', label: 'Articles', badge: 142 },
        { id: 'documents', label: 'Documents' },
        { id: 'files', label: 'Files' },
        { id: 'stats', label: 'Stats' },
        { id: 'graph', label: 'Graph' },
        { id: 'team', label: 'Team' },
        { id: 'settings', label: 'Settings' }
      ]}
      active="articles"
    />
    <UserActions>
      <NotificationBell />
      <UserAvatar />
    </UserActions>
  </PageHeader>

  <PageLayout>
    <FilterSidebar sticky width={280}>
      <FilterSection title="DATA SOURCES" collapsible>
        <Checkbox label="PubMed Central" count={89} />
        <Checkbox label="DOAJ" count={23} />
        <Checkbox label="Wiley Online Library" count={30} />
        <Checkbox label="ScienceDirect" />
      </FilterSection>

      <FilterSection title="PUBLICATION DATE">
        <Select
          options={['Last 5 Years', 'Last 10 Years', 'Custom']}
          value={dateFilter}
          onChange={setDateFilter}
        />
      </FilterSection>

      <FilterSection title="PUBLICATION TYPE">
        <Checkbox label="Clinical Trial" />
        <Checkbox label="Systematic Review" />
        <Checkbox label="Meta-Analysis" />
        <Checkbox label="RCT" />
      </FilterSection>

      <ResetButton onClick={resetAllFilters}>
        Reset Filters
      </ResetButton>
    </FilterSidebar>

    <MainContent>
      <FeedHeader>
        <h2>Research Feed</h2>
        <Controls>
          <SortDropdown
            options={['Relevance', 'Date', 'Citations']}
            value={sortBy}
          />
          <ViewToggle mode={viewMode} />
        </Controls>
      </FeedHeader>

      {selectedCount > 0 && (
        <BulkActionsBar>
          <Button icon={TranslateIcon}>Translate</Button>
          <Button icon={ChartIcon}>Detect Stats</Button>
          <Button icon={DownloadIcon}>Export</Button>
          <SelectionInfo>{selectedCount} selected</SelectionInfo>
        </BulkActionsBar>
      )}

      <ArticleList>
        {articles.map(article => (
          <ArticleCard
            key={article.id}
            article={article}
            selected={selectedIds.includes(article.id)}
            onSelect={toggleSelection}
            onViewAbstract={openAbstract}
            onDownload={downloadPDF}
          />
        ))}
      </ArticleList>

      <InfiniteScrollTrigger onIntersect={loadMore} />
    </MainContent>

    <AISidebar width={360}>
      <AssistantHeader>
        <Avatar>🤖</Avatar>
        <Title>MD Assistant</Title>
        <ExpandButton />
      </AssistantHeader>

      <ConversationArea>
        <AIMessage>
          I've analyzed the 142 articles in your feed.
          Would you like me to:
        </AIMessage>
        <ActionButtons>
          <ActionChip onClick={() => aiAction('summarize')}>
            • Summarize findings from selected field
          </ActionChip>
          <ActionChip onClick={() => aiAction('highlight')}>
            • Highlight evidence on statins
          </ActionChip>
        </ActionButtons>
      </ConversationArea>

      <SuggestedQueries>
        <SectionTitle>SUGGESTED QUERIES</SectionTitle>
        <QueryChip onClick={executeQuery}>
          • LDL reduction by methodology
        </QueryChip>
        <QueryChip onClick={executeQuery}>
          • Cluster by methods
        </QueryChip>
      </SuggestedQueries>

      <ChatInput
        placeholder="Ask AI about your articles..."
        onSubmit={sendMessage}
      />
    </AISidebar>
  </PageLayout>
</ArticlesPage>
```

**Стилистика:**

- Light theme: #FFFFFF background
- Card backgrounds: #FFFFFF с border/shadow
- Sidebar: #F9FAFB
- Accent: #3B82F6 (blue)
- Status badges:
  - SELECTED: #10B981 (green)
  - CANDIDATE: #6B7280 (gray)
  - EXCLUDED: #EF4444 (red)
  - RCT/REVIEW: #8B5CF6 (purple)
- Typography: Inter/SF Pro
- Spacing: 8px base unit

---

## 🛠 ТЕХНИЧЕСКИЙ СТЕК ОБНОВЛЕНИЙ

### Новые Библиотеки

```json
{
  "dependencies": {
    // UI Framework
    "@headlessui/react": "^2.0.0",
    "@radix-ui/react-*": "latest",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",

    // Icons
    "@heroicons/react": "^2.1.0",
    "lucide-react": "^0.314.0",

    // Data Grid
    "@ag-grid-community/react": "^31.0.0",
    "react-hot-toast": "^2.4.1",

    // Animations
    "framer-motion": "^11.0.0",

    // Graphs
    "@xyflow/react": "^12.0.0",

    // Virtualization
    "@tanstack/react-virtual": "^3.0.0",

    // Forms
    "react-hook-form": "^7.50.0",
    "zod": "^3.22.0",

    // Utilities
    "date-fns": "^3.0.0",
    "lodash-es": "^4.17.21"
  },
  "devDependencies": {
    // Testing
    "@testing-library/react": "^14.1.0",
    "vitest": "^1.2.0",

    // Storybook
    "@storybook/react": "^7.6.0"
  }
}
```

### CSS Архитектура

```css
/* Design Tokens */
:root {
  /* Colors - Light Theme */
  --color-primary-50: #eff6ff;
  --color-primary-500: #3b82f6;
  --color-primary-900: #1e3a8a;

  --color-neutral-50: #f9fafb;
  --color-neutral-100: #f3f4f6;
  --color-neutral-900: #111827;

  --color-success-500: #10b981;
  --color-warning-500: #f59e0b;
  --color-error-500: #ef4444;

  /* Typography */
  --font-sans: "Inter", -apple-system, sans-serif;
  --font-serif: "Georgia", "Charter", serif;
  --font-mono: "JetBrains Mono", monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --space-8: 2rem;

  /* Border Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

[data-theme="dark"] {
  --color-neutral-50: #0f172a;
  --color-neutral-900: #f9fafb;
  /* ... темные значения */
}
```

---

## 📐 КОМПОНЕНТНАЯ СТРУКТУРА

### Создать Design System

```
/src/design-system/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.stories.tsx
│   │   ├── Button.test.tsx
│   │   └── Button.variants.ts
│   ├── Card/
│   ├── Input/
│   ├── Modal/
│   ├── Sidebar/
│   ├── Tabs/
│   └── ...
├── layouts/
│   ├── EditorLayout/
│   ├── DashboardLayout/
│   └── SplitPaneLayout/
├── hooks/
│   ├── useTheme.ts
│   ├── useMediaQuery.ts
│   ├── useLocalStorage.ts
│   └── ...
├── utils/
│   ├── cn.ts (classnames helper)
│   ├── colors.ts
│   └── typography.ts
└── tokens/
    ├── colors.ts
    ├── spacing.ts
    └── typography.ts
```

### Пример Button Component

```typescript
// Button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary-500 text-white hover:bg-primary-600',
        secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
        ghost: 'hover:bg-neutral-100 text-neutral-700',
        destructive: 'bg-error-500 text-white hover:bg-error-600',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, leftIcon, rightIcon, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <Spinner className="mr-2" />
        ) : leftIcon ? (
          <span className="mr-2">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);
```

---

## 🎨 TAILWIND КОНФИГУРАЦИЯ

```javascript
// tailwind.config.js
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          500: "#3B82F6",
          900: "#1E3A8A",
        },
        neutral: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          900: "#111827",
        },
        success: {
          /* ... */
        },
        warning: {
          /* ... */
        },
        error: {
          /* ... */
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Georgia", "Charter", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        float:
          "0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
      },
      animation: {
        "slide-in": "slideIn 0.2s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
      },
      keyframes: {
        slideIn: {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
```

---

## 📋 ПЛАН РЕАЛИЗАЦИИ (ПОЭТАПНЫЙ)

### ФАуЗА 1: Фундамент (2 недели) ✅ **ЗАВЕРШЕНО 03.02.2026**

**Задачи:**

1. ✅ Установить Tailwind CSS v4 - **ГОТОВО**
2. ✅ Создать design tokens и CSS variables - **ГОТОВО**
3. ✅ Настроить темную/светлую тему - **ГОТОВО**
4. ✅ Создать базовые компоненты (Button, Input, Card, Modal) - **ГОТОВО**
5. ⏭️ Настроить Storybook для компонентов - **ПРОПУЩЕНО** (делаем позже при необходимости)
6. ✅ Создать Layout компоненты (EditorLayout, DashboardLayout, Sidebar, SplitPaneLayout) - **ГОТОВО**

**Результаты:**

- ✅ Установлены все необходимые зависимости (Tailwind v4, Headless UI, Heroicons, etc.)
- ✅ Создана структура design system в `/src/design-system/`
- ✅ Реализованы 4 базовых компонента: Button, Input, Card, Modal
- ✅ Реализованы 4 layout компонента: EditorLayout, DashboardLayout, Sidebar, SplitPaneLayout
- ✅ Созданы hooks: useTheme, useMediaQuery
- ✅ Определены design tokens: colors, spacing, typography
- ✅ Приложение успешно собирается
- 📄 Документация: `/docs/PHASE1_DESIGN_SYSTEM_COMPLETE.md`

**Код для начала:**

```bash
# Установка зависимостей
pnpm add -D tailwindcss postcss autoprefixer
pnpm add @headlessui/react @heroicons/react clsx tailwind-merge
pnpm add framer-motion class-variance-authority

# Инициализация Tailwind
npx tailwindcss init -p

# Storybook
pnpm dlx storybook@latest init
```

### ФАЗА 2: Document Editor (2 недели)

**Задачи:**

1. ✅ Редизайн DocumentPage по скриншоту 1
2. ✅ Implement EditorLayout с тремя панелями
3. ✅ Улучшить DocumentOutline sidebar
4. ✅ Улучшить Bibliography sidebar
5. ✅ Создать StatusBar компонент
6. ✅ Улучшить Tiptap toolbar
7. ✅ Добавить word count goal tracker

**Компоненты:**

- `<EditorLayout />` - three-panel layout
- `<DocumentOutline />` - left sidebar
- `<Bibliography />` - right sidebar
- `<EditorStatusBar />` - bottom bar
- `<TiptapToolbar />` - floating/sticky toolbar

### ФАЗА 3: Citation Graph (2 недели)

**Задачи:**

1. ✅ Редизайн CitationGraph по скриншоту 2
2. ✅ Темная тема для графа
3. ✅ Улучшить ControlPanel с фильтрами
4. ✅ Создать NodeDetailPanel
5. ✅ Улучшить ReactFlow интеграцию
6. ✅ Добавить mini-map
7. ✅ Экспорт в SVG/PDF

**Компоненты:**

- `<GraphControlPanel />` - left sidebar dark theme
- `<GraphCanvas />` - ReactFlow visualization
- `<NodeDetailPanel />` - right sidebar
- `<GraphToolbar />` - top controls
- `<GraphMiniMap />` - navigation helper

### ФАЗА 4: Chart Builder (1.5 недели)

**Задачи:**

1. ✅ Редизайн ChartFromTable по скриншоту 3
2. ✅ Fullscreen modal dialog
3. ✅ Split panel с data/preview
4. ✅ Editable data grid (AG Grid)
5. ✅ Real-time chart preview
6. ✅ Configuration panel
7. ✅ Collaboration indicator

**Компоненты:**

- `<ChartBuilderModal />` - fullscreen dialog
- `<EditableDataGrid />` - AG Grid integration
- `<LiveChartPreview />` - real-time rendering
- `<ChartConfig />` - axis labels, colors
- `<CollaborationIndicator />` - active users

### ФАЗА 5: Articles Search (2 недели)

**Задачи:**

1. ✅ Редизайн ArticlesSection по скриншоту 4
2. ✅ Улучшить FilterSidebar
3. ✅ Редизайн ArticleCard
4. ✅ Добавить MD Assistant sidebar
5. ✅ Bulk actions toolbar
6. ✅ Infinite scroll
7. ✅ AI suggestions

**Компоненты:**

- `<ArticlesPage />` - main layout
- `<FilterSidebar />` - left filters
- `<ArticleCard />` - redesigned card
- `<AISidebar />` - MD Assistant
- `<BulkActionsBar />` - selection actions
- `<InfiniteScrollList />` - virtualized list

### ФАЗА 6: Performance & Polish (1.5 недели)

**Задачи:**

1. ✅ Виртуализация длинных списков
2. ✅ Code splitting и lazy loading
3. ✅ Оптимизация re-renders
4. ✅ Accessibility audit
5. ✅ Mobile responsiveness
6. ✅ Loading states everywhere
7. ✅ Error boundaries
8. ✅ Animation polish

### ФАЗА 7: Testing & Documentation (1 неделя)

**Задачи:**

1. ✅ Unit tests для компонентов
2. ✅ Integration tests
3. ✅ E2E tests (Playwright)
4. ✅ Storybook stories для всех компонентов
5. ✅ Документация API
6. ✅ User guide updates

---

## 🎯 МЕТРИКИ УСПЕХА

### Performance

- ✅ First Contentful Paint < 1.5s
- ✅ Time to Interactive < 3s
- ✅ Bundle size < 500KB (gzipped)
- ✅ Lighthouse score > 90

### Accessibility

- ✅ WCAG 2.1 AA compliance
- ✅ Keyboard navigation для всех функций
- ✅ Screen reader friendly
- ✅ Color contrast ratios > 4.5:1

### UX

- ✅ Consistent design language
- ✅ Smooth animations (60fps)
- ✅ Mobile responsive
- ✅ Loading states everywhere
- ✅ Helpful error messages

---

## 🚀 НАЧНИ С ЭТОГО

### Шаг 1: Подготовка

```bash
# 1. Создай новую ветку
git checkout -b feature/frontend-redesign

# 2. Установи зависимости
pnpm add -D tailwindcss postcss autoprefixer
pnpm add @headlessui/react @heroicons/react clsx tailwind-merge
pnpm add framer-motion class-variance-authority

# 3. Инициализируй Tailwind
npx tailwindcss init -p
```

### Шаг 2: Настрой Tailwind

Создай файлы конфигурации как указано выше.

### Шаг 3: Создай Design System

```bash
mkdir -p src/design-system/{components,layouts,hooks,utils,tokens}
```

### Шаг 4: Начни с базовых компонентов

Создай Button, Card, Input, Modal по примерам выше.

### Шаг 5: Переходи к ФАЗЕ 2

Начни редизайн Document Editor.

---

## 📝 ВАЖНЫЕ НАПОМИНАНИЯ

1. **Консистентность** - используй design tokens везде
2. **Accessibility** - тестируй с keyboard и screen reader
3. **Performance** - профилируй и оптимизируй
4. **Mobile** - тестируй на разных размерах экрана
5. **Dark theme** - реализуй параллельно со светлой
6. **Documentation** - пиши Storybook stories
7. **Testing** - покрывай критичные пути

---

## 🎨 ФИНАЛЬНЫЙ ЧЕКЛИСТ

- [ ] Все компоненты используют design tokens
- [ ] Темная и светлая темы работают идеально
- [ ] Мобильная версия responsive
- [ ] Keyboard navigation работает везде
- [ ] Loading states добавлены
- [ ] Error boundaries установлены
- [ ] Animations smooth (60fps)
- [ ] Bundle size оптимизирован
- [ ] Tests написаны
- [ ] Storybook stories созданы
- [ ] Accessibility проверена
- [ ] Performance метрики достигнуты
- [ ] Documentation обновлена
- [ ] User feedback собран и учтён

**НАЧИНАЙ РЕАЛИЗАЦИЮ! Удачи! 🚀**
