# Cross-Platform Search - Phase 3 Enhancement

## Overview

The Cross-Platform Search feature enables researchers to search for scientific articles across multiple databases and repositories from a unified interface. This phase 3 enhancement integrates PubMed, Crossref, arXiv, and semantic search capabilities directly into the ArticleAI Sidebar.

## Features

### 🔍 **Multi-Provider Search**

- **PubMed**: Biomedical and life sciences literature
- **Crossref**: Multidisciplinary scholarly publications
- **arXiv**: Physics, mathematics, computer science preprints
- **Semantic**: Search within your existing article database

### ⚡ **Smart Caching**

- Results cached for 24 hours to reduce API calls
- Automatic cache cleanup and performance optimization
- Cache statistics and management for administrators

### 🔧 **Advanced Filtering**

- Year range filtering (1800-2030)
- Language preferences (English, Russian, Any)
- Sort options: Relevance, Date, Citations
- Provider selection and combinations

### 🤖 **AI Integration**

- Seamlessly integrated with existing ArticleAI Assistant
- Tab-based interface for chat and search
- Direct import of search results into projects
- Smart deduplication across providers

## Architecture

### Backend Components

**CrossPlatformSearchService** (`src/services/CrossPlatformSearchService.ts`)

- Core search orchestration and result merging
- Provider-specific API integrations
- Deduplication and ranking algorithms
- Error handling and timeout management

**API Routes** (`src/routes/cross-platform-search.ts`)

- REST endpoints for search operations
- Provider information and statistics
- Cache management and analytics
- Bulk import functionality

**Database Schema** (`migrations/add_search_cache.sql`)

- Search result caching with automatic cleanup
- User search history for analytics
- Performance monitoring views

### Frontend Components

**CrossPlatformSearch** (`src/components/CrossPlatformSearch.tsx`)

- React component for search interface
- Provider selection and filtering
- Results display and selection
- Import functionality

**Enhanced ArticleAISidebar** (`src/components/ArticleAISidebar.tsx`)

- Tab-based interface (Chat / Search)
- Integrated search and AI assistance
- Project context awareness

## API Usage

### Search Articles

```typescript
const searchQuery = {
  query: "machine learning cancer diagnosis",
  providers: ["pubmed", "crossref"],
  maxResults: 20,
  yearFrom: 2020,
  sortBy: "relevance",
};

const results = await apiCrossPlatformSearch(searchQuery);
```

### Import Results

```typescript
const importRequest = {
  projectId: "project-uuid",
  searchResults: selectedArticles.map((article) => ({
    id: article.id,
    provider: article.provider,
    title: article.title,
    // ... other metadata
  })),
};

const response = await apiImportSearchResults(importRequest);
```

### Get Provider Information

```typescript
const providers = await apiGetSearchProviders();
// Returns available providers with capabilities and limits
```

## Configuration

### Environment Variables

No additional API keys required - all integrated services use free APIs:

- **PubMed**: NCBI E-utilities (no key needed)
- **Crossref**: Open API (no key needed)
- **arXiv**: Open API (no key needed)
- **Semantic**: Uses existing database

### Rate Limiting

- Global API rate limiting: 1000 req/min per IP
- Individual provider timeouts: 10 seconds
- Automatic retry with exponential backoff

## Database Schema

### search_cache

```sql
CREATE TABLE search_cache (
    query_hash VARCHAR(255) PRIMARY KEY,
    providers JSONB NOT NULL,
    results JSONB NOT NULL,
    total_found INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### user_search_history

```sql
CREATE TABLE user_search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    query TEXT NOT NULL,
    providers JSONB NOT NULL,
    results_count INTEGER DEFAULT 0,
    search_time_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Performance Optimizations

### Caching Strategy

- **Query normalization**: Consistent hashing for cache keys
- **TTL management**: 24-hour cache with automatic cleanup
- **Memory efficiency**: JSON storage with compression

### Search Optimization

- **Parallel execution**: All providers searched simultaneously
- **Timeout handling**: Individual provider timeouts prevent blocking
- **Result streaming**: Progressive loading for better UX

### Deduplication Algorithm

- **Multi-key matching**: DOI, PMID, and title-based deduplication
- **Score preservation**: Keeps highest-scoring version of duplicates
- **Metadata merging**: Combines information from multiple sources

## Testing

### Automated Tests

```bash
# Run backend service tests
npm run test:search-service

# Test API endpoints
npm run test:api -- --grep "cross-platform-search"

# Frontend component tests
npm run test:components -- CrossPlatformSearch
```

### Manual Testing

```bash
# Test cross-platform search service
npm run test:cross-platform-search
```

## Monitoring & Analytics

### Performance Metrics

- Search response times by provider
- Cache hit rates and efficiency
- Provider success/failure rates
- User search patterns and usage

### Administrative Tools

- Cache statistics dashboard
- Provider performance monitoring
- Search usage analytics
- Manual cache management

## Best Practices

### Search Queries

- **Be specific**: Use targeted keywords for better results
- **Combine providers**: Different providers excel in different domains
- **Use filters**: Year range and language filters improve relevance
- **Check duplicates**: Review results before bulk import

### Performance

- **Cache awareness**: Identical queries return cached results
- **Provider selection**: Choose appropriate providers for your field
- **Batch operations**: Import multiple articles at once
- **Monitor usage**: Track search patterns and optimize queries

## Future Enhancements

### Planned Features

- **Citation tracking**: Follow references across providers
- **Advanced filters**: Impact factor, study type, methodology
- **Search history**: Personal search history and saved queries
- **Recommendations**: AI-powered search suggestions
- **Export options**: BibTeX, RIS, and other citation formats

### Integration Opportunities

- **Zotero integration**: Direct export to reference managers
- **Full-text access**: Link to institutional subscriptions
- **Citation networks**: Visualize connections between articles
- **Collaboration**: Share search results with team members

## Troubleshooting

### Common Issues

**No results found**

- Check provider status and availability
- Verify search terms and filters
- Try different provider combinations

**Import failures**

- Ensure project access permissions
- Check for duplicate articles in project
- Verify article metadata completeness

**Performance issues**

- Monitor cache usage and hit rates
- Check provider response times
- Consider reducing maxResults parameter

### Error Handling

- Provider timeouts are handled gracefully
- Failed providers don't block other searches
- User-friendly error messages with suggestions
- Automatic retry for transient failures

## Support

For issues or questions about the Cross-Platform Search feature:

1. Check the troubleshooting guide above
2. Review provider-specific documentation
3. Monitor system logs for API errors
4. Contact support with specific error details

---

_This documentation covers the Phase 3 Cross-Platform Search enhancement. For general system documentation, see the main README file._
