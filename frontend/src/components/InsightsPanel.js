import { Brain, Lightbulb } from "lucide-react";

const InsightsPanel = ({ analysis }) => {
  return (
    <div className="glass-card p-6 fade-in" data-testid="insights-panel">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Brain className="w-6 h-6 text-purple-600" />
        AI-Powered Insights
      </h2>

      {analysis.ai_insights ? (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-gray-700 leading-relaxed" data-testid="ai-insights-text">
                {analysis.ai_insights}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>AI insights are being generated...</p>
        </div>
      )}

      {/* Dependencies Summary */}
      {Object.keys(analysis.dependencies).length > 0 && (
        <div className="mt-6" data-testid="dependencies-section">
          <h3 className="text-xl font-semibold mb-3">Key Dependencies</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(analysis.dependencies)
              .slice(0, 10)
              .map(([file, deps], idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-lg border border-gray-200"
                  data-testid={`dependency-${idx}`}
                >
                  <div className="font-mono text-xs text-purple-700 mb-1 truncate">
                    {file}
                  </div>
                  <div className="text-xs text-gray-500">
                    {deps.length} import{deps.length !== 1 ? "s" : ""}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsPanel;