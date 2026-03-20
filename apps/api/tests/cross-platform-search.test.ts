/**
 * Test script for CrossPlatformSearchService
 * Tests integration with PubMed, Crossref, and arXiv APIs
 */

import { CrossPlatformSearchService } from "./src/services/CrossPlatformSearchService.js";

async function testSearchService() {
  console.log("🔍 Testing CrossPlatformSearchService...\n");

  const service = new CrossPlatformSearchService();

  // Test cases
  const testQueries = [
    {
      name: "Biomedical Research (PubMed + Crossref)",
      query: {
        query: "machine learning cancer diagnosis",
        providers: ["pubmed", "crossref"] as const,
        maxResults: 5,
        yearFrom: 2020,
        sortBy: "date" as const,
      },
    },
    {
      name: "Physics/Mathematics (arXiv + Crossref)",
      query: {
        query: "neural networks quantum computing",
        providers: ["arxiv", "crossref"] as const,
        maxResults: 5,
        yearFrom: 2021,
        sortBy: "relevance" as const,
      },
    },
    {
      name: "PubMed Only",
      query: {
        query: "covid-19 treatment effectiveness",
        providers: ["pubmed"] as const,
        maxResults: 3,
        language: "en" as const,
        sortBy: "date" as const,
      },
    },
  ];

  for (const testCase of testQueries) {
    console.log(`\n🧪 Test: ${testCase.name}`);
    console.log(`Query: "${testCase.query.query}"`);
    console.log(`Providers: ${testCase.query.providers.join(", ")}`);

    try {
      const startTime = Date.now();
      const result = await service.search(testCase.query);
      const duration = Date.now() - startTime;

      console.log(`✅ Success! (${duration}ms)`);
      console.log(`   Total found: ${result.totalFound}`);
      console.log(`   Cached: ${result.cached ? "Yes" : "No"}`);
      console.log(`   Search time: ${result.searchTime}ms`);

      console.log("\n   Provider stats:");
      for (const [provider, stats] of Object.entries(result.providers)) {
        console.log(
          `   - ${provider}: ${stats.count} results (${stats.status})`,
        );
        if (stats.error) {
          console.log(`     Error: ${stats.error}`);
        }
      }

      if (result.results.length > 0) {
        console.log("\n   Sample results:");
        result.results.slice(0, 2).forEach((article, index) => {
          console.log(
            `   ${index + 1}. [${article.provider.toUpperCase()}] ${article.title}`,
          );
          if (article.authors.length > 0) {
            console.log(
              `      Authors: ${article.authors.slice(0, 2).join(", ")}${article.authors.length > 2 ? "..." : ""}`,
            );
          }
          if (article.year) console.log(`      Year: ${article.year}`);
          if (article.journal) console.log(`      Journal: ${article.journal}`);
          if (article.doi) console.log(`      DOI: ${article.doi}`);
          if (article.pmid) console.log(`      PMID: ${article.pmid}`);
          console.log(`      Score: ${(article.score * 100).toFixed(1)}%`);
        });
      }
    } catch (error) {
      console.log(
        `❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n🎯 Testing deduplication...");

  try {
    // Test with a query that should return duplicates across providers
    const dedupeResult = await service.search({
      query: "SARS-CoV-2 vaccination",
      providers: ["pubmed", "crossref"],
      maxResults: 10,
      yearFrom: 2021,
      sortBy: "relevance",
    });

    console.log(`✅ Deduplication test completed`);
    console.log(`   Total unique results: ${dedupeResult.totalFound}`);

    const hasDuplicateTitles =
      new Set(dedupeResult.results.map((r) => r.title.toLowerCase().trim()))
        .size !== dedupeResult.results.length;

    console.log(
      `   Duplicates found: ${hasDuplicateTitles ? "Yes (potential issue)" : "No (good)"}`,
    );
  } catch (error) {
    console.log(
      `❌ Deduplication test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  console.log("\n✨ Cross-platform search testing completed!");
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSearchService()
    .then(() => {
      console.log("\n🏁 All tests completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Test suite failed:", error);
      process.exit(1);
    });
}

export { testSearchService };
