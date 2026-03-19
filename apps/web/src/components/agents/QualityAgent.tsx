/**
 * QualityAgent - Контроль качества исследований и текстов
 * Специализированный агент для проверки качества и соответствия стандартам
 */

import React, { useState, useEffect, useRef } from "react";
import { useAgentWindow } from "../AgentWindow";
import AgentWindow from "../AgentWindow";
import AgentCoordinator from "../../services/AgentCoordinator";
import styles from "./quality-agent.module.css";

type QualityCheckType =
  | "grammar"
  | "style"
  | "structure"
  | "citations"
  | "methodology"
  | "ethics"
  | "plagiarism"
  | "data-integrity";

type QualitySeverity = "info" | "warning" | "error" | "critical";

type QualityIssue = {
  id: string;
  type: QualityCheckType;
  severity: QualitySeverity;
  title: string;
  description: string;
  suggestion: string;
  position?: { start: number; end: number };
  section?: string;
  autoFixable: boolean;
  confidence: number;
  references?: string[];
};

type QualityReport = {
  id: string;
  target: string;
  targetType: "text" | "document" | "dataset" | "methodology";
  checks: QualityCheckType[];
  overallScore: number;
  issues: QualityIssue[];
  summary: string;
  recommendations: string[];
  createdAt: Date;
  duration: number;
};

type QualityStandard = {
  id: string;
  name: string;
  description: string;
  checks: QualityCheckType[];
  thresholds: Record<string, number>;
};

type Props = {
  agentId?: string;
  onQualityReport?: (report: QualityReport) => void;
  onIssueFound?: (issue: QualityIssue) => void;
  initialText?: string;
};

export default function QualityAgent({
  agentId = "quality-agent",
  onQualityReport,
  onIssueFound,
  initialText = "",
}: Props) {
  const { isOpen, openWindow, closeWindow } = useAgentWindow(
    agentId,
    "quality",
    "Quality Control Agent",
  );

  const [inputText, setInputText] = useState(initialText);
  const [currentChecks, setCurrentChecks] = useState<QualityCheckType[]>([
    "grammar",
    "style",
    "structure",
    "citations",
  ]);
  const [qualityReports, setQualityReports] = useState<QualityReport[]>([]);
  const [activeReport, setActiveReport] = useState<QualityReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const academicStandard: QualityStandard = {
    id: "academic",
    name: "Academic Writing Standard",
    description: "Standard academic writing guidelines",
    checks: [],
    thresholds: {
      grammar: 0.9,
      style: 0.8,
      structure: 0.85,
      citations: 0.95,
    },
  };

  const [selectedStandard, setSelectedStandard] =
    useState<QualityStandard>(academicStandard);
  const [viewMode, setViewMode] = useState<"check" | "reports" | "standards">(
    "check",
  );
  const [autoFix, setAutoFix] = useState(false);

  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // Listen for messages from other agents
  useEffect(() => {
    const handleAgentMessage = (
      event: string,
      data: Record<string, unknown>,
    ) => {
      if (event === "message-sent") {
        const message = data.message as {
          toAgent: string;
          content: string;
          type?: string;
          payload?: unknown;
        };
        if (message.toAgent === agentId) {
          handleIncomingMessage(message);
        }
      }
    };

    AgentCoordinator.on("message-sent", handleAgentMessage);
    return () => AgentCoordinator.off("message-sent", handleAgentMessage);
  }, [agentId]);

  const handleIncomingMessage = (message: {
    content: string;
    type?: string;
    payload?: unknown;
  }) => {
    const payload = message.payload as Record<string, unknown>;
    if (payload?.type === "text-completed") {
      // Auto-check text from Writing Agent
      setInputText((payload.text as string) || "");
      setTimeout(() => runQualityCheck(), 1000);
    } else if (payload?.type === "analysis-completed") {
      // Check methodology quality from Analytics Agent
      runMethodologyCheck(payload);
    }
  };

  // Update agent status
  useEffect(() => {
    if (isAnalyzing) {
      AgentCoordinator.updateAgentStatus(
        agentId,
        "busy",
        "Quality analysis in progress",
      );
    } else {
      AgentCoordinator.updateAgentStatus(agentId, "idle");
    }
  }, [isAnalyzing, agentId]);

  const runQualityCheck = async () => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    AgentCoordinator.updateAgentStatus(
      agentId,
      "active",
      "Running quality checks",
    );

    try {
      const startTime = Date.now();
      const issues: QualityIssue[] = [];

      // Run each selected check
      for (let i = 0; i < currentChecks.length; i++) {
        const checkType = currentChecks[i];
        setAnalysisProgress(((i + 1) / currentChecks.length) * 100);

        await new Promise((resolve) =>
          setTimeout(resolve, 500 + Math.random() * 1000),
        );

        const checkIssues = await performQualityCheck(checkType, inputText);
        issues.push(...checkIssues);
      }

      const duration = Date.now() - startTime;
      const overallScore = calculateOverallScore(issues);

      const report: QualityReport = {
        id: `report-${Date.now()}`,
        target: inputText.substring(0, 100) + "...",
        targetType: "text",
        checks: currentChecks,
        overallScore,
        issues: issues.sort((a, b) => {
          const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        }),
        summary: generateReportSummary(issues, overallScore),
        recommendations: generateRecommendations(issues),
        createdAt: new Date(),
        duration,
      };

      setQualityReports((prev) => [report, ...prev.slice(0, 9)]);
      setActiveReport(report);
      setViewMode("reports");

      // Auto-fix if enabled
      if (autoFix) {
        applyAutoFixes(report);
      }

      onQualityReport?.(report);

      // Notify other agents
      AgentCoordinator.broadcastMessage(agentId, "notification", {
        type: "quality-check-completed",
        score: overallScore,
        issueCount: issues.length,
        criticalIssues: issues.filter((i) => i.severity === "critical").length,
      });

      AgentCoordinator.reportTaskCompleted(agentId, duration, true);
    } catch (error) {
      console.error("Quality check failed:", error);
      AgentCoordinator.reportTaskCompleted(agentId, 3000, false);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const performQualityCheck = async (
    checkType: QualityCheckType,
    text: string,
  ): Promise<QualityIssue[]> => {
    // Simulate quality check for each type
    const issues: QualityIssue[] = [];

    switch (checkType) {
      case "grammar":
        issues.push(...generateGrammarIssues(text));
        break;
      case "style":
        issues.push(...generateStyleIssues(text));
        break;
      case "structure":
        issues.push(...generateStructureIssues(text));
        break;
      case "citations":
        issues.push(...generateCitationIssues(text));
        break;
      case "methodology":
        issues.push(...generateMethodologyIssues(text));
        break;
      case "ethics":
        issues.push(...generateEthicsIssues(text));
        break;
      case "plagiarism":
        issues.push(...generatePlagiarismIssues(text));
        break;
      case "data-integrity":
        issues.push(...generateDataIntegrityIssues(text));
        break;
    }

    return issues;
  };

  const generateGrammarIssues = (text: string): QualityIssue[] => {
    const issues: QualityIssue[] = [];

    // Mock grammar issues
    if (text.includes("This study show")) {
      const start = text.indexOf("This study show");
      issues.push({
        id: `grammar-${Date.now()}`,
        type: "grammar",
        severity: "error",
        title: "Subject-verb disagreement",
        description: "Singular subject 'study' requires singular verb 'shows'",
        suggestion: "Change 'show' to 'shows'",
        position: { start, end: start + "This study show".length },
        autoFixable: true,
        confidence: 95,
      });
    }

    if (text.match(/\b(its|it's)\b/) && Math.random() > 0.7) {
      const match = text.match(/\b(its|it's)\b/);
      if (match && match.index !== undefined) {
        issues.push({
          id: `grammar-${Date.now()}-2`,
          type: "grammar",
          severity: "warning",
          title: "Possessive vs. contraction",
          description:
            "Check correct usage of 'its' (possessive) vs. 'it's' (it is)",
          suggestion: "Verify correct form based on context",
          position: { start: match.index, end: match.index + match[0].length },
          autoFixable: false,
          confidence: 80,
        });
      }
    }

    return issues;
  };

  const generateStyleIssues = (text: string): QualityIssue[] => {
    const issues: QualityIssue[] = [];

    // Check for passive voice
    const passivePatterns = /\b(was|were|is|are|been)\s+\w+ed\b/gi;
    let match;
    while ((match = passivePatterns.exec(text)) !== null) {
      if (Math.random() > 0.8) {
        // Don't flag every instance
        issues.push({
          id: `style-passive-${match.index}`,
          type: "style",
          severity: "info",
          title: "Passive voice detected",
          description: "Consider using active voice for more direct writing",
          suggestion: "Rewrite in active voice when possible",
          position: { start: match.index, end: match.index + match[0].length },
          autoFixable: false,
          confidence: 70,
        });
      }
    }

    // Check for word repetition
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const wordCount: Record<string, number> = {};
    words.forEach((word) => {
      if (word.length > 4) {
        // Only check longer words
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });

    Object.entries(wordCount).forEach(([word, count]) => {
      if (count > 3) {
        issues.push({
          id: `style-repetition-${word}`,
          type: "style",
          severity: "warning",
          title: "Word repetition",
          description: `The word "${word}" appears ${count} times`,
          suggestion: "Consider using synonyms or restructuring sentences",
          autoFixable: false,
          confidence: 85,
        });
      }
    });

    return issues;
  };

  const generateStructureIssues = (text: string): QualityIssue[] => {
    const issues: QualityIssue[] = [];

    const paragraphs = text.split("\n\n").filter((p) => p.trim());

    // Check paragraph length
    paragraphs.forEach((paragraph, index) => {
      const sentences = paragraph.split(/[.!?]+/).filter((s) => s.trim());

      if (sentences.length === 1 && paragraph.length > 200) {
        issues.push({
          id: `structure-long-sentence-${index}`,
          type: "structure",
          severity: "warning",
          title: "Long paragraph with single sentence",
          description: "This paragraph contains only one very long sentence",
          suggestion: "Break into multiple sentences for better readability",
          section: `Paragraph ${index + 1}`,
          autoFixable: false,
          confidence: 90,
        });
      }

      if (sentences.length > 8) {
        issues.push({
          id: `structure-long-paragraph-${index}`,
          type: "structure",
          severity: "info",
          title: "Long paragraph",
          description: `This paragraph contains ${sentences.length} sentences`,
          suggestion: "Consider breaking into smaller paragraphs",
          section: `Paragraph ${index + 1}`,
          autoFixable: false,
          confidence: 75,
        });
      }
    });

    // Check for introduction/conclusion
    if (
      !text.toLowerCase().includes("introduction") &&
      !text.toLowerCase().includes("background")
    ) {
      issues.push({
        id: "structure-no-intro",
        type: "structure",
        severity: "warning",
        title: "No clear introduction section",
        description: "Academic texts should have a clear introduction",
        suggestion: "Add an introduction section to provide context",
        autoFixable: false,
        confidence: 80,
      });
    }

    return issues;
  };

  const generateCitationIssues = (text: string): QualityIssue[] => {
    const issues: QualityIssue[] = [];

    // Check for unsupported claims
    const claimPatterns =
      /(research shows|studies indicate|it is known|evidence suggests)/gi;
    let match;
    while ((match = claimPatterns.exec(text)) !== null) {
      // Check if citation follows within next 50 characters
      const followingText = text.substring(
        match.index + match[0].length,
        match.index + match[0].length + 50,
      );
      if (!followingText.match(/\([^)]*\d{4}[^)]*\)|\[\d+\]/)) {
        issues.push({
          id: `citation-missing-${match.index}`,
          type: "citations",
          severity: "error",
          title: "Missing citation",
          description: "Claims should be supported with proper citations",
          suggestion: "Add citation after this statement",
          position: { start: match.index, end: match.index + match[0].length },
          autoFixable: false,
          confidence: 90,
        });
      }
    }

    // Check citation format consistency
    const citationFormats = {
      apa: /\([^)]*\d{4}[^)]*\)/g,
      numbered: /\[\d+\]/g,
    };

    let apaCount = 0;
    let numberedCount = 0;

    while (citationFormats.apa.exec(text)) apaCount++;
    while (citationFormats.numbered.exec(text)) numberedCount++;

    if (apaCount > 0 && numberedCount > 0) {
      issues.push({
        id: "citation-inconsistent",
        type: "citations",
        severity: "warning",
        title: "Inconsistent citation format",
        description: `Mixed citation styles detected (${apaCount} APA-style, ${numberedCount} numbered)`,
        suggestion: "Use consistent citation format throughout",
        autoFixable: false,
        confidence: 95,
      });
    }

    return issues;
  };

  const generateMethodologyIssues = (text: string): QualityIssue[] => {
    const issues: QualityIssue[] = [];

    if (
      text.toLowerCase().includes("methodology") ||
      text.toLowerCase().includes("methods")
    ) {
      // Check for sample size mention
      if (
        !text.match(/\b(n\s*=\s*\d+|sample\s+size|participants?\s*\(\s*n\s*=)/i)
      ) {
        issues.push({
          id: "methodology-sample-size",
          type: "methodology",
          severity: "warning",
          title: "Sample size not clearly stated",
          description: "Research methodology should clearly state sample size",
          suggestion: "Include sample size (n = X) in methodology section",
          autoFixable: false,
          confidence: 85,
        });
      }

      // Check for statistical methods
      if (!text.match(/\b(statistical|analysis|test|p-value|significance)/i)) {
        issues.push({
          id: "methodology-statistics",
          type: "methodology",
          severity: "info",
          title: "Statistical methods not mentioned",
          description: "Consider describing statistical analysis methods",
          suggestion: "Add description of statistical analysis approach",
          autoFixable: false,
          confidence: 70,
        });
      }
    }

    return issues;
  };

  const generateEthicsIssues = (text: string): QualityIssue[] => {
    const issues: QualityIssue[] = [];

    // Check for ethics approval mention in human studies
    if (
      text.toLowerCase().includes("participants") ||
      text.toLowerCase().includes("subjects")
    ) {
      if (
        !text.toLowerCase().includes("ethics") &&
        !text.toLowerCase().includes("irb") &&
        !text.toLowerCase().includes("approval")
      ) {
        issues.push({
          id: "ethics-approval",
          type: "ethics",
          severity: "critical",
          title: "No ethics approval mentioned",
          description:
            "Human subjects research requires ethics approval statement",
          suggestion: "Include statement about ethics committee approval",
          autoFixable: false,
          confidence: 95,
        });
      }
    }

    // Check for informed consent
    if (
      text.toLowerCase().includes("participants") &&
      !text.toLowerCase().includes("consent")
    ) {
      issues.push({
        id: "ethics-consent",
        type: "ethics",
        severity: "error",
        title: "No informed consent mentioned",
        description: "Participant studies should mention informed consent",
        suggestion: "Add statement about informed consent procedures",
        autoFixable: false,
        confidence: 90,
      });
    }

    return issues;
  };

  const generatePlagiarismIssues = (text: string): QualityIssue[] => {
    const issues: QualityIssue[] = [];

    // Simple plagiarism indicators (in real implementation, this would use sophisticated checking)
    const longQuotes = text.match(/"[^"]{100,}"/g);
    if (longQuotes) {
      longQuotes.forEach((quote, index) => {
        const start = text.indexOf(quote);
        if (
          !text
            .substring(start + quote.length, start + quote.length + 50)
            .includes("(")
        ) {
          issues.push({
            id: `plagiarism-unattributed-${index}`,
            type: "plagiarism",
            severity: "critical",
            title: "Long quote without attribution",
            description: "Extended quotes require proper attribution",
            suggestion: "Add proper citation for this quote",
            position: { start, end: start + quote.length },
            autoFixable: false,
            confidence: 85,
          });
        }
      });
    }

    return issues;
  };

  const generateDataIntegrityIssues = (text: string): QualityIssue[] => {
    const issues: QualityIssue[] = [];

    // Check for data availability statement
    if (
      text.toLowerCase().includes("data") &&
      text.toLowerCase().includes("analysis")
    ) {
      if (
        !text.toLowerCase().includes("available") &&
        !text.toLowerCase().includes("repository") &&
        !text.toLowerCase().includes("supplementary")
      ) {
        issues.push({
          id: "data-availability",
          type: "data-integrity",
          severity: "warning",
          title: "No data availability statement",
          description: "Research should include data availability information",
          suggestion: "Add statement about data availability or repository",
          autoFixable: false,
          confidence: 80,
        });
      }
    }

    return issues;
  };

  const runMethodologyCheck = async (analysisData: {
    confidence?: number;
    methodology?: string;
    sampleSize?: number;
  }) => {
    // Quick methodology quality check
    const issues: QualityIssue[] = [];

    if (analysisData.confidence && analysisData.confidence < 70) {
      issues.push({
        id: "methodology-low-confidence",
        type: "methodology",
        severity: "warning",
        title: "Low analysis confidence",
        description: `Analysis confidence is only ${analysisData.confidence}%`,
        suggestion: "Review methodology and consider additional validation",
        autoFixable: false,
        confidence: 90,
      });
    }

    if (issues.length > 0) {
      issues.forEach((issue) => onIssueFound?.(issue));
    }
  };

  const calculateOverallScore = (issues: QualityIssue[]): number => {
    let score = 100;

    issues.forEach((issue) => {
      switch (issue.severity) {
        case "critical":
          score -= 20;
          break;
        case "error":
          score -= 10;
          break;
        case "warning":
          score -= 5;
          break;
        case "info":
          score -= 2;
          break;
      }
    });

    return Math.max(0, score);
  };

  const generateReportSummary = (
    issues: QualityIssue[],
    score: number,
  ): string => {
    const criticalCount = issues.filter(
      (i) => i.severity === "critical",
    ).length;
    const errorCount = issues.filter((i) => i.severity === "error").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;

    if (score >= 90) {
      return `Excellent quality! Found ${issues.length} minor issues to address.`;
    } else if (score >= 75) {
      return `Good quality with some improvements needed. ${errorCount} errors and ${warningCount} warnings found.`;
    } else if (score >= 50) {
      return `Moderate quality requiring attention. ${criticalCount} critical issues, ${errorCount} errors found.`;
    } else {
      return `Significant quality issues detected. ${criticalCount} critical issues require immediate attention.`;
    }
  };

  const generateRecommendations = (issues: QualityIssue[]): string[] => {
    const recommendations: string[] = [];

    const criticalIssues = issues.filter((i) => i.severity === "critical");
    const errorIssues = issues.filter((i) => i.severity === "error");

    if (criticalIssues.length > 0) {
      recommendations.push("Address all critical issues before publication");
    }

    if (errorIssues.length > 0) {
      recommendations.push("Review and fix all error-level issues");
    }

    const commonTypes = [...new Set(issues.map((i) => i.type))];
    if (commonTypes.includes("citations")) {
      recommendations.push("Review citation format and completeness");
    }
    if (commonTypes.includes("grammar")) {
      recommendations.push("Perform thorough proofreading");
    }
    if (commonTypes.includes("structure")) {
      recommendations.push("Consider restructuring for better flow");
    }

    if (recommendations.length === 0) {
      recommendations.push("Continue maintaining high quality standards");
    }

    return recommendations;
  };

  const applyAutoFixes = async (report: QualityReport) => {
    let fixedText = inputText;
    let appliedFixes = 0;

    const fixableIssues = report.issues
      .filter((issue) => issue.autoFixable)
      .sort((a, b) => (b.position?.start || 0) - (a.position?.start || 0)); // Apply from end to start

    for (const issue of fixableIssues) {
      if (issue.position && issue.suggestion.includes("Change")) {
        const before = fixedText.substring(0, issue.position.start);
        const after = fixedText.substring(issue.position.end);

        // Simple fix for "show" -> "shows"
        if (issue.suggestion.includes("shows")) {
          fixedText =
            before +
            fixedText
              .substring(issue.position.start, issue.position.end)
              .replace("show", "shows") +
            after;
          appliedFixes++;
        }
      }
    }

    if (appliedFixes > 0) {
      setInputText(fixedText);
      AgentCoordinator.sendMessage(agentId, "writing-agent", "notification", {
        type: "auto-fixes-applied",
        fixCount: appliedFixes,
        text: fixedText,
      });
    }
  };

  const getSeverityIcon = (severity: QualitySeverity) => {
    const icons = {
      critical: (
        <svg
          className="w-4 h-4 text-red-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ),
      error: (
        <svg
          className="w-4 h-4 text-red-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      ),
      warning: (
        <svg
          className="w-4 h-4 text-yellow-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ),
      info: (
        <svg
          className="w-4 h-4 text-blue-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      ),
    };
    return icons[severity];
  };

  const getSeverityColor = (severity: QualitySeverity): string => {
    const colors = {
      critical: "bg-red-100 text-red-800 border-red-300",
      error: "bg-red-50 text-red-700 border-red-200",
      warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
      info: "bg-blue-50 text-blue-700 border-blue-200",
    };
    return colors[severity];
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-yellow-600";
    if (score >= 50) return "text-orange-600";
    return "text-red-600";
  };

  const renderCheckContent = () => {
    return (
      <div className="p-4 space-y-4">
        <h3>Quality Check</h3>
        <textarea
          ref={textInputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter text to analyze..."
          className="w-full h-32 p-2 border rounded"
        />
        <button
          onClick={runQualityCheck}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {isAnalyzing ? "Analyzing..." : "Run Check"}
        </button>
      </div>
    );
  };

  const renderReportsContent = () => {
    return (
      <div className="p-4">
        <h3>Quality Reports</h3>
        {qualityReports.length === 0 ? (
          <p className="text-gray-500">No reports available</p>
        ) : (
          <div className="space-y-2">
            {qualityReports.map((report) => (
              <div key={report.id} className="p-3 border rounded">
                <div className="font-medium">
                  {(report.target || report.id).substring(0, 50)}...
                </div>
                <div className="text-sm text-gray-600">
                  Score: {report.overallScore}/100
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderStandardsContent = () => {
    return (
      <div className="p-4">
        <h3>Quality Standards</h3>
        <div className="space-y-2">
          <div className="p-3 border rounded bg-blue-50">
            <div className="font-medium">{selectedStandard.name}</div>
            <div className="text-sm text-gray-600">
              {selectedStandard.description}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const windowContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center mb-3">
          <div className="flex gap-2">
            {(["check", "reports", "standards"] as const).map((mode) => (
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoFix}
                onChange={(e) => setAutoFix(e.target.checked)}
                className="rounded"
              />
              Auto-fix
            </label>
          </div>
        </div>

        {/* Analysis Progress */}
        {isAnalyzing && (
          <div className="mb-3">
            <div className="flex items-center gap-2 text-sm text-blue-700 mb-1">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              Quality analysis in progress... {analysisProgress.toFixed(0)}%
            </div>
            <div className="bg-blue-200 rounded-full h-2">
              <div
                className={`bg-blue-500 h-2 rounded-full transition-all duration-300 ${styles[`progressBar${Math.floor(analysisProgress / 5) * 5}` as keyof typeof styles] || ""}`}
              ></div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="flex gap-4 text-sm text-gray-600">
          <span>Reports: {qualityReports.length}</span>
          <span>Standard: {selectedStandard.name}</span>
          {activeReport && (
            <span
              className={`font-medium ${getScoreColor(activeReport.overallScore)}`}
            >
              Score: {activeReport.overallScore}/100
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === "check" && renderCheckContent()}
        {viewMode === "reports" && renderReportsContent()}
        {viewMode === "standards" && renderStandardsContent()}
      </div>
    </div>
  );

  return (
    <>
      <AgentWindow
        agentId={agentId}
        agentType="quality"
        title="Quality Assurance Agent"
        isOpen={isOpen}
        onClose={closeWindow}
        minWidth={600}
        minHeight={500}
        maxWidth={1000}
        maxHeight={800}
      >
        {windowContent}
      </AgentWindow>

      {!isOpen && (
        <button
          onClick={openWindow}
          className="fixed bottom-4 left-72 p-3 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 z-50"
          title="Open Quality Agent"
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      )}
    </>
  );
}
