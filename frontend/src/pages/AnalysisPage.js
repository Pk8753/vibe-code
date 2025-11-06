import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FlowDiagram from "@/components/FlowDiagram";
import TreeView from "@/components/TreeView";
import InsightsPanel from "@/components/InsightsPanel";
import { ArrowLeft, GitBranch, Sparkles } from "lucide-react";

export default function AnalysisPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(location.state?.analysis || null);

  useEffect(() => {
    if (!analysis) {
      // In a real app, fetch analysis by ID from backend
      // For now, redirect to home if no data
      navigate("/");
    }
  }, [analysis, navigate]);

  if (!analysis) {
    return null;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6" data-testid="analysis-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 fade-in">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4 font-medium transition-colors"
            data-testid="back-button"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
          
          <div className="glass-card p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <GitBranch className="w-8 h-8 text-purple-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2" data-testid="repo-name">
                  {analysis.repo_name}
                </h1>
                <p className="text-gray-600 mb-3" data-testid="github-url">
                  {analysis.github_url}
                </p>
                <div className="flex flex-wrap gap-3">
                  {analysis.framework && (
                    <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium text-sm" data-testid="framework-badge">
                      {analysis.framework}
                    </span>
                  )}
                  <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium text-sm" data-testid="file-count-badge">
                    {analysis.file_structure.length} Files
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Entry Points */}
        {analysis.entry_points && analysis.entry_points.length > 0 && (
          <div className="glass-card p-6 mb-6 fade-in" data-testid="entry-points-section">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              Entry Points
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {analysis.entry_points.map((entry, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200"
                  data-testid={`entry-point-${idx}`}
                >
                  <code className="text-sm font-mono text-purple-700">{entry}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visualizations */}
        <div className="glass-card p-6 mb-6 fade-in" data-testid="visualizations-section">
          <Tabs defaultValue="flow" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="flow" data-testid="flow-tab">Flow Diagram</TabsTrigger>
              <TabsTrigger value="tree" data-testid="tree-tab">Tree View</TabsTrigger>
            </TabsList>
            <TabsContent value="flow" data-testid="flow-diagram-content">
              <FlowDiagram analysis={analysis} />
            </TabsContent>
            <TabsContent value="tree" data-testid="tree-view-content">
              <TreeView analysis={analysis} />
            </TabsContent>
          </Tabs>
        </div>

        {/* AI Insights */}
        <InsightsPanel analysis={analysis} />
      </div>
    </div>
  );
}