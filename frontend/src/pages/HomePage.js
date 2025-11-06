import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { GitBranch, Zap, Network, FileCode } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function HomePage() {
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAnalyze = async () => {
    if (!githubUrl.trim()) {
      toast.error("Please enter a GitHub URL");
      return;
    }

    // Basic validation for GitHub URL
    if (!githubUrl.includes("github.com")) {
      toast.error("Please enter a valid GitHub repository URL");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/analyze`, {
        github_url: githubUrl,
      });

      toast.success("Repository analyzed successfully!");
      navigate(`/analysis/${response.data.id}`, { state: { analysis: response.data } });
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error(
        error.response?.data?.detail || "Failed to analyze repository. Please check the URL and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" data-testid="home-page">
      <div className="max-w-4xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-12 fade-in">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-white rounded-2xl shadow-lg">
              <GitBranch className="w-16 h-16 text-purple-600" />
            </div>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold mb-4 gradient-text" data-testid="main-heading">
            Git Repo Analyzer
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="hero-description">
            Understand any repository instantly with AI-powered insights, visual flow diagrams, and intelligent
            dependency mapping
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 fade-in">
          <div className="glass-card p-6 hover-lift" data-testid="feature-visualization">
            <Network className="w-10 h-10 text-purple-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Visual Flow Diagrams</h3>
            <p className="text-gray-600 text-sm">
              Interactive node-based diagrams showing file relationships and dependencies
            </p>
          </div>
          <div className="glass-card p-6 hover-lift" data-testid="feature-ai-insights">
            <Zap className="w-10 h-10 text-purple-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">AI-Powered Insights</h3>
            <p className="text-gray-600 text-sm">
              Get intelligent analysis of code structure, patterns, and best practices
            </p>
          </div>
          <div className="glass-card p-6 hover-lift" data-testid="feature-framework-detection">
            <FileCode className="w-10 h-10 text-purple-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Framework Detection</h3>
            <p className="text-gray-600 text-sm">
              Automatically identify frameworks, entry points, and execution paths
            </p>
          </div>
        </div>

        {/* Input Section */}
        <div className="glass-card p-8 fade-in" data-testid="input-section">
          <label className="block text-lg font-semibold mb-3" htmlFor="github-url-input">
            Enter GitHub Repository URL
          </label>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              id="github-url-input"
              type="text"
              placeholder="https://github.com/username/repository"
              className="input-field flex-1"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAnalyze()}
              disabled={loading}
              data-testid="github-url-input"
            />
            <button
              className="btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleAnalyze}
              disabled={loading}
              data-testid="analyze-button"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="loading-spinner w-5 h-5" />
                  Analyzing...
                </span>
              ) : (
                "Analyze"
              )}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-3" data-testid="input-help-text">
            Example: https://github.com/facebook/react
          </p>
        </div>

        {/* Info Section */}
        <div className="mt-12 text-center text-gray-600 fade-in">
          <p className="text-sm">
            Powered by AI • Open Source Friendly • Fast Analysis
          </p>
        </div>
      </div>
    </div>
  );
}