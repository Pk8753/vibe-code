import { useCallback, useMemo } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";

// Memoize these to prevent recreation on each render
const nodeTypes = {};
const edgeTypes = {};

const FlowDiagram = ({ analysis }) => {
  // Build nodes and edges from analysis data
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes = [];
    const edges = [];
    const nodeMap = new Map();
    const edgeIds = new Set(); // Track edge IDs to ensure uniqueness

    // Limit to top 50 files for performance
    const files = analysis.file_structure.slice(0, 50);

    // Create nodes for each file
    files.forEach((file, index) => {
      const x = (index % 8) * 200;
      const y = Math.floor(index / 8) * 150;

      const node = {
        id: file.id,
        type: "default",
        data: { label: file.name },
        position: { x, y },
        style: {
          background: getColorForType(file.type),
          color: "#333",
          border: "2px solid #667eea",
          borderRadius: "8px",
          padding: "10px",
          fontSize: "12px",
          width: 150,
        },
      };

      nodes.push(node);
      nodeMap.set(file.path, file.id);
    });

    // Create edges based on dependencies
    Object.entries(analysis.dependencies).forEach(([filePath, imports]) => {
      const sourceId = nodeMap.get(filePath);
      if (!sourceId) return;

      imports.forEach((importPath, importIdx) => {
        // Try to find matching file
        const matchingFile = files.find(
          (f) =>
            f.path.includes(importPath) ||
            importPath.includes(f.name.replace(/\.[^/.]+$/, ""))
        );

        if (matchingFile) {
          const targetId = matchingFile.id;
          const edgeId = `${sourceId}-${targetId}-${importIdx}`;
          
          // Only add if not already added
          if (!edgeIds.has(edgeId)) {
            edgeIds.add(edgeId);
            edges.push({
              id: edgeId,
              source: sourceId,
              target: targetId,
              type: "default",
              animated: true,
              style: { stroke: "#667eea", strokeWidth: 2 },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: "#667eea",
              },
            });
          }
        }
      });
    });

    return { nodes, edges };
  }, [analysis]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => [...eds, params]),
    [setEdges]
  );

  return (
    <div style={{ width: "100%", height: "600px" }} data-testid="flow-diagram">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Controls />
        <MiniMap
          style={{ background: "#f5f7fa" }}
          nodeColor={(node) => node.style.background}
        />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
      {nodes.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-500">
          No files to visualize
        </div>
      )}
    </div>
  );
};

function getColorForType(type) {
  const colors = {
    ".js": "#f7df1e",
    ".jsx": "#61dafb",
    ".ts": "#3178c6",
    ".tsx": "#3178c6",
    ".py": "#3776ab",
    ".go": "#00add8",
    ".java": "#f89820",
    ".json": "#5a5a5a",
    ".html": "#e34c26",
    ".css": "#1572b6",
  };
  return colors[type] || "#ffffff";
}

export default FlowDiagram;