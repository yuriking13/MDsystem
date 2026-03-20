/**
 * WritingAgent - Помощник в написании научных текстов
 * Специализированный агент для создания и улучшения академических текстов
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAgentWindow } from "../AgentWindow";
import AgentWindow from "../AgentWindow";
import AgentCoordinator from "../../services/AgentCoordinator";
import styles from "./writing-agent.module.css";

type WritingMode = "draft" | "improve" | "outline" | "summary" | "translate";
type TextQuality = "draft" | "good" | "excellent";

type WritingSuggestion = {
  id: string;
  type:
    | "grammar"
    | "style"
    | "clarity"
    | "structure"
    | "citation"
    | "academic-tone";
  original: string;
  suggestion: string;
  explanation: string;
  confidence: number;
  position: { start: number; end: number };
};

type WritingTask = {
  id: string;
  type: WritingMode;
  input: string;
  output?: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  suggestions?: WritingSuggestion[];
  quality?: TextQuality;
  wordCount: number;
  readabilityScore?: number;
};

type Props = {
  agentId?: string;
  initialText?: string;
  onTextChange?: (text: string) => void;
  onSuggestionAccept?: (suggestion: WritingSuggestion) => void;
};

export default function WritingAgent({
  agentId = "writing-agent",
  initialText = "",
  onTextChange,
  onSuggestionAccept,
}: Props) {
  const { isOpen, openWindow, closeWindow } = useAgentWindow(
    agentId,
    "writing",
    "Academic Writing Assistant",
  );

  const [currentMode, setCurrentMode] = useState<WritingMode>("draft");
  const [inputText, setInputText] = useState(initialText);
  const [outputText, setOutputText] = useState("");
  const [currentTask, setCurrentTask] = useState<WritingTask | null>(null);
  const [taskHistory, setTaskHistory] = useState<WritingTask[]>([]);
  const [suggestions, setSuggestions] = useState<WritingSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [_selectionRange, setSelectionRange] = useState<{
    start: number;
    end: number;
  } | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const handleWritingTaskRef = useRef<
    (mode: WritingMode, input?: string) => void
  >(() => {});

  // Listen for messages from other agents
  useEffect(() => {
    const handleAgentMessage = (
      event: string,
      data: Record<string, unknown>,
    ) => {
      if (event === "message-sent") {
        const message = data.message as {
          toAgent: string;
          type?: string;
          payload?: {
            type: string;
            article: Record<string, unknown>;
            analysis: Record<string, unknown>;
          };
        };
        if (message.toAgent === agentId) {
          const msg = message as {
            type?: string;
            payload?: {
              type: string;
              article: Record<string, unknown>;
              analysis: Record<string, unknown>;
            };
          };
          if (
            msg.type === "request" &&
            msg.payload?.type === "analysis-result"
          ) {
            const { article } = msg.payload;
            const articleTitle =
              (article?.title as string) || "Unknown Article";
            const articleAuthors = (article?.authors as string[]) || [];
            const prompt = `Based on the analysis of "${articleTitle}" by ${articleAuthors.join(", ")}, create a brief academic summary including methodology, findings, and limitations.`;
            handleWritingTaskRef.current("summary", prompt);
          }
        }
      }
    };

    AgentCoordinator.on("message-sent", handleAgentMessage);
    return () => AgentCoordinator.off("message-sent", handleAgentMessage);
  }, [agentId]);

  // Update agent status
  useEffect(() => {
    if (isProcessing) {
      AgentCoordinator.updateAgentStatus(
        agentId,
        "busy",
        `Writing: ${currentMode}`,
      );
    } else {
      AgentCoordinator.updateAgentStatus(agentId, "idle");
    }
  }, [isProcessing, currentMode, agentId]);

  const calculateWordCount = (text: string): number => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const calculateReadabilityScore = (text: string): number => {
    // Simplified readability calculation (Flesch Reading Ease approximation)
    const sentences = text.split(/[.!?]+/).length - 1;
    const words = calculateWordCount(text);
    const syllables = text.toLowerCase().replace(/[^a-z]/g, "").length * 0.5; // Rough estimate

    if (sentences === 0 || words === 0) return 0;

    const score =
      206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const assessTextQuality = (text: string): TextQuality => {
    const readabilityScore = calculateReadabilityScore(text);
    const wordCount = calculateWordCount(text);

    // Simple quality assessment based on length and readability
    if (wordCount < 50 || readabilityScore < 30) return "draft";
    if (wordCount > 200 && readabilityScore > 50) return "excellent";
    return "good";
  };

  const generateSuggestions = async (
    text: string,
    _mode: WritingMode,
  ): Promise<WritingSuggestion[]> => {
    // Simulate AI-powered writing suggestions
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockSuggestions = [
      {
        id: "1",
        type: "academic-tone" as const,
        original: "This study shows",
        suggestion: "This research demonstrates",
        explanation: "Use more precise academic language",
        confidence: 85,
        position: {
          start: text.indexOf("This study shows"),
          end: text.indexOf("This study shows") + "This study shows".length,
        },
      },
      {
        id: "2",
        type: "structure" as const,
        original: text.substring(0, Math.min(50, text.length)),
        suggestion:
          "Consider adding a topic sentence to clearly state your main argument",
        explanation: "Strong paragraphs begin with clear topic sentences",
        confidence: 78,
        position: { start: 0, end: Math.min(50, text.length) },
      },
      {
        id: "3",
        type: "citation" as const,
        original: "research shows",
        suggestion: "research shows (Author, Year)",
        explanation: "Claims should be supported with proper citations",
        confidence: 92,
        position: {
          start: text.indexOf("research shows"),
          end: text.indexOf("research shows") + "research shows".length,
        },
      },
    ].filter((s) => s.position.start >= 0); // Only include suggestions where text was found

    return mockSuggestions;
  };

  const handleWritingTask = useCallback(
    async (mode: WritingMode, input: string = inputText) => {
      if (!input.trim()) return;

      setIsProcessing(true);
      setCurrentMode(mode);

      const task: WritingTask = {
        id: `task-${Date.now()}`,
        type: mode,
        input,
        status: "processing",
        progress: 0,
        wordCount: calculateWordCount(input),
      };

      setCurrentTask(task);
      AgentCoordinator.updateAgentStatus(
        agentId,
        "active",
        `${mode}: ${input.substring(0, 30)}...`,
      );

      try {
        // Simulate progress updates
        for (let i = 0; i <= 100; i += 20) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          setCurrentTask((prev) => (prev ? { ...prev, progress: i } : null));
        }

        // Generate output based on mode
        let output = "";
        let suggestions: WritingSuggestion[] = [];

        switch (mode) {
          case "draft":
            output = await generateDraft(input);
            break;
          case "improve":
            output = await improveText(input);
            suggestions = await generateSuggestions(input, mode);
            break;
          case "outline":
            output = await generateOutline(input);
            break;
          case "summary":
            output = await generateSummary(input);
            break;
          case "translate":
            output = await translateText(input);
            break;
        }

        const completedTask: WritingTask = {
          ...task,
          output,
          suggestions,
          status: "completed",
          progress: 100,
          quality: assessTextQuality(output),
          readabilityScore: calculateReadabilityScore(output),
        };

        setCurrentTask(completedTask);
        setTaskHistory((prev) => [completedTask, ...prev.slice(0, 9)]);
        setOutputText(output);
        setSuggestions(suggestions);
        onTextChange?.(output);

        AgentCoordinator.reportTaskCompleted(agentId, 2000, true);

        // Notify other agents about completed writing task
        if (mode === "draft" || mode === "improve") {
          AgentCoordinator.broadcastMessage(agentId, "notification", {
            type: "text-completed",
            mode,
            wordCount: calculateWordCount(output),
            quality: completedTask.quality,
          });
        }
      } catch (error) {
        console.error("Writing task failed:", error);
        setCurrentTask((prev) => (prev ? { ...prev, status: "failed" } : null));
        AgentCoordinator.reportTaskCompleted(agentId, 2000, false);
      } finally {
        setIsProcessing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentId, inputText],
  );

  // Keep ref in sync
  handleWritingTaskRef.current = handleWritingTask;

  const generateDraft = async (prompt: string): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return `Based on your prompt "${prompt}", here's a structured draft:

Introduction:
The research topic of ${prompt.toLowerCase()} represents a significant area of academic inquiry that warrants careful examination. This analysis aims to provide a comprehensive overview of the current state of knowledge and identify potential areas for future research.

Methodology:
This study employs a systematic approach to examine the various aspects of ${prompt.toLowerCase()}. The methodology includes literature review, data analysis, and theoretical framework development.

Findings:
The research reveals several key insights regarding ${prompt.toLowerCase()}. These findings contribute to our understanding of the subject matter and provide valuable insights for practitioners and researchers.

Conclusion:
In conclusion, the examination of ${prompt.toLowerCase()} demonstrates the importance of continued research in this area. The findings suggest that future studies should focus on addressing the identified gaps and expanding the theoretical framework.

This draft provides a foundation that can be further developed and refined according to your specific research objectives.`;
  };

  const improveText = async (text: string): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Simple text improvements (in real implementation, this would use AI)
    const improved = text
      .replace(/\bThis study shows\b/g, "This research demonstrates")
      .replace(/\bresearch shows\b/g, "empirical evidence indicates")
      .replace(/\bIn conclusion\b/g, "In summary, the findings suggest")
      .replace(/\bIt is important\b/g, "It is crucial")
      .replace(/\bIt is clear that\b/g, "The evidence demonstrates that");

    return (
      improved +
      "\n\n[Note: Text has been enhanced for academic tone and clarity]"
    );
  };

  const generateOutline = async (topic: string): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return `Research Outline: ${topic}

I. Introduction
   A. Background and context
   B. Problem statement
   C. Research objectives
   D. Significance of the study

II. Literature Review
   A. Historical perspective
   B. Current state of research
   C. Theoretical frameworks
   D. Research gaps

III. Methodology
   A. Research design
   B. Data collection methods
   C. Analysis techniques
   D. Limitations

IV. Expected Results
   A. Anticipated findings
   B. Potential implications
   C. Contribution to field

V. Conclusion
   A. Summary of key points
   B. Future research directions
   C. Practical applications`;
  };

  const generateSummary = async (text: string): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const wordCount = calculateWordCount(text);
    const summaryRatio = wordCount > 500 ? 0.3 : 0.5;

    return `Executive Summary:

This document presents a comprehensive analysis of the key concepts and findings discussed in the original text. The main arguments center around the significance of the research topic and its implications for future study.

Key Points:
• The research addresses important theoretical and practical considerations
• Methodological approaches demonstrate rigor and academic validity
• Findings contribute meaningfully to the existing body of knowledge
• Future research directions are clearly identified and justified

Conclusions:
The analysis provides valuable insights that advance our understanding of the subject matter and offer practical applications for researchers and practitioners in the field.

[Summary length: ~${Math.round(wordCount * summaryRatio)} words from original ${wordCount} words]`;
  };

  const translateText = async (text: string): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 1100));
    return `[Translated Text - Academic English]

${text}

[Note: This is a simulated translation. In a real implementation, this would use professional translation services optimized for academic content, maintaining technical terminology and formal tone appropriate for scholarly writing.]`;
  };

  const applySuggestion = (suggestion: WritingSuggestion) => {
    const currentText = outputText || inputText;
    const before = currentText.substring(0, suggestion.position.start);
    const after = currentText.substring(suggestion.position.end);
    const newText = before + suggestion.suggestion + after;

    setOutputText(newText);
    onTextChange?.(newText);
    onSuggestionAccept?.(suggestion);

    // Remove applied suggestion
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
  };

  const handleTextSelection = () => {
    if (inputRef.current) {
      const start = inputRef.current.selectionStart;
      const end = inputRef.current.selectionEnd;
      const text = inputText.substring(start, end);

      if (text.length > 0) {
        setSelectedText(text);
        setSelectionRange({ start, end });
      } else {
        setSelectedText("");
        setSelectionRange(null);
      }
    }
  };

  const getModeDescription = (mode: WritingMode): string => {
    const descriptions = {
      draft: "Generate a structured academic draft from your ideas",
      improve: "Enhance existing text for clarity and academic tone",
      outline: "Create a detailed research outline",
      summary: "Produce a concise summary of your content",
      translate: "Translate and adapt for academic English",
    };
    return descriptions[mode];
  };

  const windowContent = (
    <div className="flex flex-col h-full">
      {/* Mode Selector */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {(
            [
              "draft",
              "improve",
              "outline",
              "summary",
              "translate",
            ] as WritingMode[]
          ).map((mode) => (
            <button
              key={mode}
              onClick={() => setCurrentMode(mode)}
              className={`px-3 py-2 rounded text-sm capitalize whitespace-nowrap ${
                currentMode === mode
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
              disabled={isProcessing}
            >
              {mode}
            </button>
          ))}
        </div>

        <p className="text-sm text-gray-600 mb-3">
          {getModeDescription(currentMode)}
        </p>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => handleWritingTask(currentMode)}
            disabled={isProcessing || !inputText.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            {isProcessing ? "Processing..." : "Generate"}
          </button>

          {selectedText && (
            <button
              onClick={() => handleWritingTask("improve", selectedText)}
              disabled={isProcessing}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Improve Selection
            </button>
          )}

          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
          >
            {showSuggestions ? "Hide" : "Show"} Suggestions
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {isProcessing && currentTask && (
        <div className="p-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span>
              Processing {currentTask.type}... {currentTask.progress}%
            </span>
          </div>
          <div className="mt-1 bg-blue-200 rounded-full h-1">
            <div
              className={`bg-blue-500 h-1 rounded-full transition-all duration-300 ${styles[`progressBar${Math.floor(currentTask.progress / 5) * 5}` as keyof typeof styles] || ""}`}
            ></div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Input Section */}
        <div className="flex-1 flex flex-col border-r border-gray-200">
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-medium text-sm text-gray-900">Input</h3>
            <div className="text-xs text-gray-500">
              Words: {calculateWordCount(inputText)}
              {selectedText &&
                ` • Selected: ${calculateWordCount(selectedText)} words`}
            </div>
          </div>
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onSelect={handleTextSelection}
            placeholder="Enter your text, ideas, or research topic here..."
            className={`flex-1 p-3 border-none resize-none focus:outline-none ${styles.minHeightTextarea}`}
          />
        </div>

        {/* Output Section */}
        <div className="flex-1 flex flex-col">
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-sm text-gray-900">Output</h3>
              {outputText && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(outputText);
                    // Show brief feedback
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Copy
                </button>
              )}
            </div>
            {outputText && (
              <div className="text-xs text-gray-500 mt-1">
                Words: {calculateWordCount(outputText)}
                {currentTask?.quality && (
                  <span
                    className={`ml-2 px-2 py-0.5 rounded ${
                      currentTask.quality === "excellent"
                        ? "bg-green-100 text-green-700"
                        : currentTask.quality === "good"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {currentTask.quality}
                  </span>
                )}
                {currentTask?.readabilityScore && (
                  <span className="ml-2 text-gray-500">
                    Readability: {currentTask.readabilityScore}/100
                  </span>
                )}
              </div>
            )}
          </div>
          <textarea
            ref={outputRef}
            value={outputText}
            onChange={(e) => {
              setOutputText(e.target.value);
              onTextChange?.(e.target.value);
            }}
            placeholder="Generated content will appear here..."
            className={`flex-1 p-3 border-none resize-none focus:outline-none bg-gray-50 ${styles.minHeightTextarea}`}
          />
        </div>

        {/* Suggestions Panel */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="w-80 border-l border-gray-200 flex flex-col">
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <h3 className="font-medium text-sm text-gray-900">
                Suggestions ({suggestions.length})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="p-3 border-b border-gray-100"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span
                      className={`text-xs px-2 py-1 rounded capitalize ${
                        suggestion.type === "grammar"
                          ? "bg-red-100 text-red-700"
                          : suggestion.type === "style"
                            ? "bg-blue-100 text-blue-700"
                            : suggestion.type === "clarity"
                              ? "bg-green-100 text-green-700"
                              : suggestion.type === "citation"
                                ? "bg-purple-100 text-purple-700"
                                : suggestion.type === "academic-tone"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {suggestion.type.replace("-", " ")}
                    </span>
                    <span className="text-xs text-gray-500">
                      {suggestion.confidence}%
                    </span>
                  </div>

                  <div className="text-xs mb-2">
                    <div className="text-gray-600 mb-1">Original:</div>
                    <div className="bg-red-50 p-2 rounded font-mono text-red-800">
                      {suggestion.original}
                    </div>
                  </div>

                  <div className="text-xs mb-2">
                    <div className="text-gray-600 mb-1">Suggested:</div>
                    <div className="bg-green-50 p-2 rounded font-mono text-green-800">
                      {suggestion.suggestion}
                    </div>
                  </div>

                  <div className="text-xs text-gray-600 mb-3">
                    {suggestion.explanation}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => applySuggestion(suggestion)}
                      className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() =>
                        setSuggestions((prev) =>
                          prev.filter((s) => s.id !== suggestion.id),
                        )
                      }
                      className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>
            Mode: {currentMode} •
            {currentTask ? ` Task: ${currentTask.status}` : " Ready"}
            {taskHistory.length > 0 &&
              ` • History: ${taskHistory.length} tasks`}
          </span>
          <span>Writing Assistant v1.0</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <AgentWindow
        agentId={agentId}
        agentType="writing"
        title="Academic Writing Assistant"
        isOpen={isOpen}
        onClose={closeWindow}
        minWidth={600}
        minHeight={500}
        maxWidth={1200}
        maxHeight={800}
      >
        {windowContent}
      </AgentWindow>

      {/* External trigger */}
      {!isOpen && (
        <button
          onClick={openWindow}
          className="fixed bottom-4 left-20 p-3 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 z-50"
          title="Open Writing Agent"
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
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </button>
      )}
    </>
  );
}
