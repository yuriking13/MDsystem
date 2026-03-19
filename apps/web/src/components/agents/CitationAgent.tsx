/**
 * CitationAgent - Управление цитированием и библиографией
 * Специализированный агент для работы с научными ссылками
 */

import React, { useState, useEffect, useRef } from "react";
import { useAgentWindow } from "../AgentWindow";
import AgentWindow from "../AgentWindow";
import AgentCoordinator from "../../services/AgentCoordinator";

type CitationStyle =
  | "APA"
  | "MLA"
  | "Chicago"
  | "Harvard"
  | "IEEE"
  | "Vancouver";

type Reference = {
  id: string;
  type:
    | "article"
    | "book"
    | "website"
    | "conference"
    | "thesis"
    | "report"
    | "other";
  title: string;
  authors: string[];
  year: number;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  doi?: string;
  url?: string;
  accessDate?: string;
  isbn?: string;
  location?: string;
  addedAt: Date;
  tags: string[];
  notes: string;
  citationCount: number;
  lastCited: Date | null;
};

type Citation = {
  id: string;
  referenceId: string;
  text: string;
  style: CitationStyle;
  inText: boolean;
  pageNumber?: string;
  createdAt: Date;
};

type BibliographyEntry = {
  reference: Reference;
  citation: string;
  style: CitationStyle;
};

type Props = {
  agentId?: string;
  onReferenceSelect?: (reference: Reference) => void;
  onCitationGenerate?: (citation: string) => void;
  initialStyle?: CitationStyle;
};

export default function CitationAgent({
  agentId = "citation-agent",
  onReferenceSelect,
  onCitationGenerate,
  initialStyle = "APA",
}: Props) {
  const { isOpen, openWindow, closeWindow } = useAgentWindow(
    agentId,
    "citation",
    "Citation Management Agent",
  );

  const [references, setReferences] = useState<Reference[]>([]);
  const [selectedReference, setSelectedReference] = useState<Reference | null>(
    null,
  );
  const [citations, setCitations] = useState<Citation[]>([]);
  const [currentStyle, setCurrentStyle] = useState<CitationStyle>(initialStyle);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredReferences, setFilteredReferences] = useState<Reference[]>([]);
  const [viewMode, setViewMode] = useState<
    "library" | "generate" | "bibliography"
  >("library");
  const [isImporting, setIsImporting] = useState(false);
  const [editingReference, setEditingReference] = useState<Reference | null>(
    null,
  );
  const [newReference, setNewReference] = useState<Partial<Reference>>({
    type: "article",
    authors: [],
    tags: [],
    notes: "",
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for messages from other agents
  useEffect(() => {
    const handleAgentMessage = (
      event: string,
      data: Record<string, unknown>,
    ) => {
      if (event === "message-sent") {
        const message = data.message as {
          toAgent: string;
          payload?: { type: string; article: unknown };
        };
        if (
          message.toAgent === agentId &&
          message.payload?.type === "article-selected"
        ) {
          const article = message.payload.article;
          addReferenceFromArticle(article);
        }
      }
    };

    AgentCoordinator.on("message-sent", handleAgentMessage);
    return () => AgentCoordinator.off("message-sent", handleAgentMessage);
  }, [agentId]);

  // Update agent status
  useEffect(() => {
    if (isImporting) {
      AgentCoordinator.updateAgentStatus(
        agentId,
        "busy",
        "Importing references",
      );
    } else {
      AgentCoordinator.updateAgentStatus(agentId, "idle");
    }
  }, [isImporting, agentId]);

  // Filter references based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredReferences(references);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredReferences(
        references.filter(
          (ref) =>
            ref.title.toLowerCase().includes(query) ||
            ref.authors.some((author) =>
              author.toLowerCase().includes(query),
            ) ||
            ref.tags.some((tag) => tag.toLowerCase().includes(query)) ||
            ref.journal?.toLowerCase().includes(query),
        ),
      );
    }
  }, [searchQuery, references]);

  // Load demo data on first open
  useEffect(() => {
    if (isOpen && references.length === 0) {
      loadDemoReferences();
    }
  }, [isOpen, references.length]);

  const loadDemoReferences = () => {
    const demoRefs: Reference[] = [
      {
        id: "ref-1",
        type: "article",
        title: "Machine Learning in Academic Research: A Comprehensive Review",
        authors: ["Smith, J.", "Johnson, A.", "Williams, M."],
        year: 2023,
        journal: "Journal of Academic Computing",
        volume: "45",
        issue: "3",
        pages: "123-145",
        doi: "10.1234/jac.2023.001",
        addedAt: new Date(),
        tags: ["machine learning", "research methodology", "academic"],
        notes: "Excellent overview of ML applications in research contexts.",
        citationCount: 1,
        lastCited: new Date(),
      },
      {
        id: "ref-2",
        type: "book",
        title: "Research Methods in Computer Science",
        authors: ["Brown, R.", "Davis, L."],
        year: 2022,
        publisher: "Academic Press",
        location: "Cambridge, MA",
        isbn: "978-0123456789",
        addedAt: new Date(),
        tags: ["methodology", "computer science", "research"],
        notes: "Comprehensive guide to CS research methods.",
        citationCount: 0,
        lastCited: null,
      },
      {
        id: "ref-3",
        type: "conference",
        title: "AI-Powered Citation Analysis: Trends and Future Directions",
        authors: ["Garcia, M.", "Kim, S."],
        year: 2023,
        journal: "Proceedings of the International Conference on AI",
        pages: "567-578",
        location: "San Francisco, CA",
        addedAt: new Date(),
        tags: ["AI", "citation analysis", "conference"],
        notes: "Interesting approach to automated citation management.",
        citationCount: 0,
        lastCited: null,
      },
    ];

    setReferences(demoRefs);
  };

  const addReferenceFromArticle = (article: {
    title?: string;
    authors?: string[];
    journal?: string;
    year?: number;
    doi?: string;
    url?: string;
  }) => {
    const newRef: Reference = {
      id: `ref-${Date.now()}`,
      type: "article",
      title: article.title,
      authors: article.authors || [],
      year: article.year || new Date().getFullYear(),
      journal: article.journal,
      doi: article.doi,
      addedAt: new Date(),
      tags: [],
      notes: "",
      citationCount: 0,
      lastCited: null,
    };

    setReferences((prev) => [newRef, ...prev]);
    setSelectedReference(newRef);
    setViewMode("library");

    // Notify user
    AgentCoordinator.sendMessage(agentId, "writing-agent", "notification", {
      type: "reference-added",
      reference: newRef,
    });
  };

  const generateCitation = (
    reference: Reference,
    inText: boolean = false,
  ): string => {
    switch (currentStyle) {
      case "APA":
        return generateAPACitation(reference, inText);
      case "MLA":
        return generateMLACitation(reference, inText);
      case "Chicago":
        return generateChicagoCitation(reference, inText);
      case "Harvard":
        return generateHarvardCitation(reference, inText);
      case "IEEE":
        return generateIEEECitation(reference, inText);
      case "Vancouver":
        return generateVancouverCitation(reference, inText);
      default:
        return generateAPACitation(reference, inText);
    }
  };

  const generateAPACitation = (ref: Reference, inText: boolean): string => {
    const authors = formatAuthorsAPA(ref.authors);

    if (inText) {
      return `(${authors}, ${ref.year})`;
    }

    let citation = `${authors} (${ref.year}). ${ref.title}.`;

    if (ref.type === "article" && ref.journal) {
      citation += ` *${ref.journal}*`;
      if (ref.volume) citation += `, ${ref.volume}`;
      if (ref.issue) citation += `(${ref.issue})`;
      if (ref.pages) citation += `, ${ref.pages}`;
    } else if (ref.type === "book" && ref.publisher) {
      citation += ` ${ref.publisher}`;
      if (ref.location) citation += `, ${ref.location}`;
    }

    if (ref.doi) {
      citation += ` https://doi.org/${ref.doi}`;
    }

    return citation;
  };

  const generateMLACitation = (ref: Reference, inText: boolean): string => {
    const authors = formatAuthorsMLA(ref.authors);

    if (inText) {
      return `(${authors})`;
    }

    let citation = `${authors}. "${ref.title}."`;

    if (ref.type === "article" && ref.journal) {
      citation += ` *${ref.journal}*`;
      if (ref.volume) citation += `, vol. ${ref.volume}`;
      if (ref.issue) citation += `, no. ${ref.issue}`;
      citation += `, ${ref.year}`;
      if (ref.pages) citation += `, pp. ${ref.pages}`;
    }

    return citation + ".";
  };

  const generateChicagoCitation = (ref: Reference, inText: boolean): string => {
    const authors = formatAuthorsChicago(ref.authors);

    if (inText) {
      return `(${authors} ${ref.year})`;
    }

    let citation = `${authors}. "${ref.title}."`;

    if (ref.type === "article" && ref.journal) {
      citation += ` *${ref.journal}*`;
      if (ref.volume) citation += ` ${ref.volume}`;
      if (ref.issue) citation += `, no. ${ref.issue}`;
      citation += ` (${ref.year})`;
      if (ref.pages) citation += `: ${ref.pages}`;
    }

    return citation + ".";
  };

  const generateHarvardCitation = (ref: Reference, inText: boolean): string => {
    return generateAPACitation(ref, inText); // Harvard is similar to APA
  };

  const generateIEEECitation = (ref: Reference, inText: boolean): string => {
    if (inText) {
      const refIndex = references.findIndex((r) => r.id === ref.id) + 1;
      return `[${refIndex}]`;
    }

    const authors = formatAuthorsIEEE(ref.authors);
    let citation = `${authors}, "${ref.title},"`;

    if (ref.type === "article" && ref.journal) {
      citation += ` *${ref.journal}*`;
      if (ref.volume) citation += `, vol. ${ref.volume}`;
      if (ref.issue) citation += `, no. ${ref.issue}`;
      if (ref.pages) citation += `, pp. ${ref.pages}`;
      citation += `, ${ref.year}`;
    }

    return citation + ".";
  };

  const generateVancouverCitation = (
    ref: Reference,
    inText: boolean,
  ): string => {
    if (inText) {
      const refIndex = references.findIndex((r) => r.id === ref.id) + 1;
      return `(${refIndex})`;
    }

    const authors = formatAuthorsVancouver(ref.authors);
    let citation = `${authors}. ${ref.title}.`;

    if (ref.type === "article" && ref.journal) {
      citation += ` ${ref.journal}`;
      if (ref.year) citation += `. ${ref.year}`;
      if (ref.volume) citation += `;${ref.volume}`;
      if (ref.issue) citation += `(${ref.issue})`;
      if (ref.pages) citation += `:${ref.pages}`;
    }

    return citation + ".";
  };

  const formatAuthorsAPA = (authors: string[]): string => {
    if (authors.length === 0) return "Unknown Author";
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
    return `${authors[0]} et al.`;
  };

  const formatAuthorsMLA = (authors: string[]): string => {
    if (authors.length === 0) return "Unknown Author";
    return authors[0]; // MLA typically uses first author only
  };

  const formatAuthorsChicago = (authors: string[]): string => {
    return formatAuthorsAPA(authors); // Similar to APA
  };

  const formatAuthorsIEEE = (authors: string[]): string => {
    if (authors.length === 0) return "Unknown Author";
    return authors.join(", ");
  };

  const formatAuthorsVancouver = (authors: string[]): string => {
    if (authors.length === 0) return "Unknown Author";
    if (authors.length <= 3) return authors.join(", ");
    return `${authors.slice(0, 3).join(", ")}, et al`;
  };

  const handleCitationGenerate = (reference: Reference, inText: boolean) => {
    const citation = generateCitation(reference, inText);
    const newCitation: Citation = {
      id: `cit-${Date.now()}`,
      referenceId: reference.id,
      text: citation,
      style: currentStyle,
      inText,
      createdAt: new Date(),
    };

    setCitations((prev) => [newCitation, ...prev]);
    onCitationGenerate?.(citation);

    // Update reference citation count
    setReferences((prev) =>
      prev.map((ref) =>
        ref.id === reference.id
          ? {
              ...ref,
              citationCount: ref.citationCount + 1,
              lastCited: new Date(),
            }
          : ref,
      ),
    );

    // Copy to clipboard
    navigator.clipboard.writeText(citation);

    AgentCoordinator.updateAgentStatus(agentId, "active", "Citation generated");
    setTimeout(() => AgentCoordinator.updateAgentStatus(agentId, "idle"), 1000);
  };

  const generateBibliography = (): BibliographyEntry[] => {
    return references
      .filter((ref) => ref.citationCount > 0)
      .sort((a, b) => a.authors[0]?.localeCompare(b.authors[0] || "") || 0)
      .map((ref) => ({
        reference: ref,
        citation: generateCitation(ref, false),
        style: currentStyle,
      }));
  };

  const handleImportReferences = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    AgentCoordinator.updateAgentStatus(
      agentId,
      "active",
      `Importing: ${file.name}`,
    );

    try {
      // Simulate import process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock imported references
      const importedRefs: Reference[] = [
        {
          id: `imported-${Date.now()}`,
          type: "article",
          title: "Imported Reference: Advanced Research Methods",
          authors: ["Imported, A.", "Author, B."],
          year: 2023,
          journal: "Imported Journal",
          addedAt: new Date(),
          tags: ["imported"],
          notes: "Imported from file",
          citationCount: 0,
          lastCited: null,
        },
      ];

      setReferences((prev) => [...importedRefs, ...prev]);
      AgentCoordinator.reportTaskCompleted(agentId, 2000, true);
    } catch (error) {
      console.error("Import failed:", error);
      AgentCoordinator.reportTaskCompleted(agentId, 2000, false);
    } finally {
      setIsImporting(false);
    }
  };

  const saveReference = () => {
    if (!newReference.title || !newReference.authors?.length) return;

    const reference: Reference = {
      id: `ref-${Date.now()}`,
      type: newReference.type || "article",
      title: newReference.title,
      authors: newReference.authors,
      year: newReference.year || new Date().getFullYear(),
      journal: newReference.journal,
      volume: newReference.volume,
      issue: newReference.issue,
      pages: newReference.pages,
      publisher: newReference.publisher,
      doi: newReference.doi,
      url: newReference.url,
      isbn: newReference.isbn,
      location: newReference.location,
      addedAt: new Date(),
      tags: newReference.tags || [],
      notes: newReference.notes || "",
      citationCount: 0,
      lastCited: null,
    };

    if (editingReference) {
      setReferences((prev) =>
        prev.map((ref) => (ref.id === editingReference.id ? reference : ref)),
      );
      setEditingReference(null);
    } else {
      setReferences((prev) => [reference, ...prev]);
    }

    setNewReference({
      type: "article",
      authors: [],
      tags: [],
      notes: "",
    });
  };

  const windowContent = (
    <div className="flex flex-col h-full">
      {/* Header with tabs and style selector */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center mb-3">
          <div className="flex gap-2">
            {(["library", "generate", "bibliography"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-2 rounded text-sm capitalize ${
                  viewMode === mode
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Citation Style:</label>
            <select
              value={currentStyle}
              onChange={(e) => setCurrentStyle(e.target.value as CitationStyle)}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              {(
                [
                  "APA",
                  "MLA",
                  "Chicago",
                  "Harvard",
                  "IEEE",
                  "Vancouver",
                ] as CitationStyle[]
              ).map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4 text-sm text-gray-600">
          <span>References: {references.length}</span>
          <span>Citations: {citations.length}</span>
          <span>Style: {currentStyle}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === "library" && (
          <div className="p-4">
            {/* Search and Controls */}
            <div className="flex gap-2 mb-4">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search references..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() =>
                  setNewReference({
                    type: "article",
                    authors: [],
                    tags: [],
                    notes: "",
                  })
                }
                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                Add Reference
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
              >
                {isImporting ? "Importing..." : "Import"}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".bib,.ris,.json"
              onChange={handleImportReferences}
              className="hidden"
            />

            {/* Reference List */}
            {filteredReferences.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg
                  className="w-12 h-12 mx-auto mb-3 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
                <p>No references found</p>
                <p className="text-sm">Add references or import from file</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReferences.map((reference) => (
                  <div
                    key={reference.id}
                    className={`p-4 border rounded cursor-pointer ${
                      selectedReference?.id === reference.id
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedReference(reference)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-gray-900 mb-1">
                          {reference.title}
                        </h4>
                        <div className="text-xs text-gray-600">
                          {reference.authors.join(", ")} ({reference.year})
                        </div>
                        {reference.journal && (
                          <div className="text-xs text-gray-500 italic">
                            {reference.journal}
                            {reference.volume && ` ${reference.volume}`}
                            {reference.issue && `(${reference.issue})`}
                            {reference.pages && `, ${reference.pages}`}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-3">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            reference.type === "article"
                              ? "bg-blue-100 text-blue-700"
                              : reference.type === "book"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {reference.type}
                        </span>

                        {reference.citationCount > 0 && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            {reference.citationCount} citations
                          </span>
                        )}
                      </div>
                    </div>

                    {reference.tags.length > 0 && (
                      <div className="flex gap-1 mb-2">
                        {reference.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {reference.notes && (
                      <div className="text-xs text-gray-600 mb-2">
                        {reference.notes}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCitationGenerate(reference, true);
                        }}
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                      >
                        In-text Citation
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCitationGenerate(reference, false);
                        }}
                        className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                      >
                        Full Citation
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingReference(reference);
                          setNewReference(reference);
                        }}
                        className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add/Edit Reference Form */}
            {(newReference.title !== undefined || editingReference) && (
              <div className="mt-6 p-4 border border-gray-300 rounded bg-gray-50">
                <h4 className="font-medium mb-3">
                  {editingReference ? "Edit Reference" : "Add New Reference"}
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={newReference.type}
                      onChange={(e) =>
                        setNewReference((prev) => ({
                          ...prev,
                          type: e.target.value as Reference["type"],
                        }))
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      {[
                        "article",
                        "book",
                        "website",
                        "conference",
                        "thesis",
                        "report",
                        "other",
                      ].map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year
                    </label>
                    <input
                      type="number"
                      value={newReference.year || ""}
                      onChange={(e) =>
                        setNewReference((prev) => ({
                          ...prev,
                          year: parseInt(e.target.value) || undefined,
                        }))
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={newReference.title || ""}
                      onChange={(e) =>
                        setNewReference((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Enter title"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Authors * (one per line)
                    </label>
                    <textarea
                      value={newReference.authors?.join("\n") || ""}
                      onChange={(e) =>
                        setNewReference((prev) => ({
                          ...prev,
                          authors: e.target.value
                            .split("\n")
                            .filter((a) => a.trim()),
                        }))
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      rows={3}
                      placeholder="Smith, J.&#10;Johnson, A."
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={saveReference}
                    disabled={
                      !newReference.title || !newReference.authors?.length
                    }
                    className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                  >
                    {editingReference ? "Update" : "Add"} Reference
                  </button>
                  <button
                    onClick={() => {
                      setNewReference({
                        type: "article",
                        authors: [],
                        tags: [],
                        notes: "",
                      });
                      setEditingReference(null);
                    }}
                    className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === "generate" && (
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">
              Quick Citation Generator
            </h3>

            {selectedReference ? (
              <div className="space-y-4">
                <div className="p-4 border border-gray-200 rounded bg-gray-50">
                  <h4 className="font-medium mb-2">Selected Reference:</h4>
                  <div className="text-sm text-gray-700">
                    <div className="font-medium">{selectedReference.title}</div>
                    <div>
                      {selectedReference.authors.join(", ")} (
                      {selectedReference.year})
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h5 className="font-medium text-sm mb-2">
                      In-text Citation ({currentStyle})
                    </h5>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded font-mono text-sm">
                      {generateCitation(selectedReference, true)}
                    </div>
                    <button
                      onClick={() =>
                        handleCitationGenerate(selectedReference, true)
                      }
                      className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                      Copy In-text Citation
                    </button>
                  </div>

                  <div>
                    <h5 className="font-medium text-sm mb-2">
                      Full Citation ({currentStyle})
                    </h5>
                    <div className="p-3 bg-green-50 border border-green-200 rounded font-mono text-sm">
                      {generateCitation(selectedReference, false)}
                    </div>
                    <button
                      onClick={() =>
                        handleCitationGenerate(selectedReference, false)
                      }
                      className="mt-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                    >
                      Copy Full Citation
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg
                  className="w-12 h-12 mx-auto mb-3 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
                <p>No reference selected</p>
                <p className="text-sm">
                  Select a reference from the library to generate citations
                </p>
              </div>
            )}
          </div>
        )}

        {viewMode === "bibliography" && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">
                Bibliography ({currentStyle})
              </h3>
              <button
                onClick={() => {
                  const bibliography = generateBibliography()
                    .map((entry) => entry.citation)
                    .join("\n\n");
                  navigator.clipboard.writeText(bibliography);
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Copy Bibliography
              </button>
            </div>

            {generateBibliography().length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg
                  className="w-12 h-12 mx-auto mb-3 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h.01M9 16h.01M9 20h.01m4-8h.01M13 16h.01M13 20h.01m4-8h.01M17 16h.01M17 20h.01M6 20a2 2 0 01-2-2V6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6z"
                  />
                </svg>
                <p>No cited references</p>
                <p className="text-sm">
                  Generate citations to build your bibliography
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {generateBibliography().map((entry, index) => (
                  <div
                    key={entry.reference.id}
                    className="p-3 border border-gray-200 rounded"
                  >
                    <div className="text-sm font-mono text-gray-800 leading-relaxed">
                      {entry.citation}
                    </div>
                    <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
                      <span>
                        Citations: {entry.reference.citationCount} • Last cited:{" "}
                        {entry.reference.lastCited?.toLocaleDateString() ||
                          "Never"}
                      </span>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(entry.citation)
                        }
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Citations */}
      {citations.length > 0 && (
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Recent Citations
          </div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {citations.slice(0, 3).map((citation) => (
              <div
                key={citation.id}
                className="text-xs font-mono text-gray-600 p-2 bg-white border border-gray-100 rounded"
              >
                {citation.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>
            Mode: {viewMode} • Style: {currentStyle} •
            {isImporting ? " Importing..." : " Ready"}
          </span>
          <span>Citation Agent v1.0</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <AgentWindow
        agentId={agentId}
        agentType="citation"
        title="Citation Management Agent"
        isOpen={isOpen}
        onClose={closeWindow}
        minWidth={500}
        minHeight={600}
        maxWidth={800}
        maxHeight={800}
      >
        {windowContent}
      </AgentWindow>

      {!isOpen && (
        <button
          onClick={openWindow}
          className="fixed bottom-4 left-52 p-3 bg-orange-600 text-white rounded-full shadow-lg hover:bg-orange-700 z-50"
          title="Open Citation Agent"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
        </button>
      )}
    </>
  );
}
