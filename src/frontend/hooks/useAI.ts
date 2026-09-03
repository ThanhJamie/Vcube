import { useState } from 'react';
import { ModelAnalysisService, SlicingOptimizationService, CadAssistantService, MeshGeometryMetrics, AiPrintabilityReport, AiCadAssistantMessage } from '../../ai';

export function useAI() {
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<AiPrintabilityReport | null>(null);
  const [chatMessages, setChatMessages] = useState<AiCadAssistantMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const analyzeMesh = async (metrics: MeshGeometryMetrics) => {
    setAnalyzing(true);
    try {
      const result = await ModelAnalysisService.analyzeMesh(metrics);
      setReport(result);
      return result;
    } finally {
      setAnalyzing(false);
    }
  };

  const askCadAssistant = async (query: string) => {
    setChatLoading(true);
    const userMsg: AiCadAssistantMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    try {
      const assistantReply = await CadAssistantService.sendChatMessage(query, chatMessages);
      setChatMessages((prev) => [...prev, assistantReply]);
      return assistantReply;
    } finally {
      setChatLoading(false);
    }
  };

  return {
    analyzing,
    report,
    analyzeMesh,
    chatMessages,
    chatLoading,
    askCadAssistant,
  };
}
