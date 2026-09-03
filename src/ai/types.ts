export interface MeshGeometryMetrics {
  name: string;
  volumeCm3: number;
  surfaceAreaCm2: number;
  triangleCount: number;
  dimensionsMm: {
    x: number;
    y: number;
    z: number;
  };
  hasOverhangs?: boolean;
  estimatedOverhangAreaMm2?: number;
}

export interface AiPrintabilityReport {
  score: number; // 0 to 100
  rating: 'EXCELLENT' | 'GOOD' | 'NEEDS_SUPPORT' | 'HIGH_RISK';
  summary: string;
  suggestedOrientation: {
    rotationDeg: { x: number; y: number; z: number };
    supportSavingsPercent: number;
    explanation: string;
  };
  dfmWarnings: Array<{
    type: 'THIN_WALL' | 'STEEP_OVERHANG' | 'WARPING_RISK' | 'HIGH_ASPECT_RATIO';
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    recommendation: string;
  }>;
  recommendedMaterial: string;
  recommendedInfill: {
    pattern: 'gyroid' | 'grid' | 'honeycomb' | 'adaptive_cubic';
    densityPercent: number;
    reason: string;
  };
}

export interface AiCadAssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  codeSnippet?: string;
  suggestedActions?: string[];
}

export interface AiMaterialRecommendationRequest {
  partUse: 'functional_load' | 'outdoor_weather' | 'high_heat' | 'cosmetic_figure' | 'flexible_gasket';
  budgetPriority: 'low_cost' | 'balanced' | 'high_performance';
}
