import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, File, Folder } from "lucide-react";

const TreeView = ({ analysis }) => {
  const [expandedPaths, setExpandedPaths] = useState(new Set(["root"]));

  // Build tree structure from flat file list
  const tree = useMemo(() => {
    const root = { name: "root", children: {}, files: [], type: "folder" };

    analysis.file_structure.forEach((file) => {
      const parts = file.path.split("/");
      let current = root;

      // Navigate/create folder structure
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            children: {},
            files: [],
            type: "folder",
            path: parts.slice(0, i + 1).join("/"),
          };
        }
        current = current.children[part];
      }

      // Add file to current folder
      current.files.push(file);
    });

    return root;
  }, [analysis]);

  const toggleExpand = (path) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderTree = (node, path = "root", level = 0) => {
    const isExpanded = expandedPaths.has(path);
    const hasChildren =
      Object.keys(node.children).length > 0 || node.files.length > 0;

    return (
      <div key={path} className="slide-in">
        {level > 0 && (
          <div
            className="flex items-center gap-2 py-2 px-3 hover:bg-purple-50 rounded-lg cursor-pointer transition-colors"
            style={{ paddingLeft: `${level * 20 + 12}px` }}
            onClick={() => hasChildren && toggleExpand(path)}
            data-testid={`tree-node-${path}`}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-purple-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-purple-600" />
              )
            ) : (
              <span className="w-4" />
            )}
            {node.type === "folder" ? (
              <Folder className="w-4 h-4 text-purple-600" />
            ) : (
              <File className="w-4 h-4 text-gray-600" />
            )}
            <span className="text-sm font-medium">{node.name}</span>
          </div>
        )}

        {isExpanded && (
          <div>
            {/* Render folders */}
            {Object.entries(node.children).map(([name, child]) =>
              renderTree(child, `${path}/${name}`, level + 1)
            )}

            {/* Render files */}
            {node.files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 py-2 px-3 hover:bg-purple-50 rounded-lg transition-colors"
                style={{ paddingLeft: `${(level + 1) * 20 + 12}px` }}
                data-testid={`tree-file-${file.id}`}
              >
                <span className="w-4" />
                <File className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">{file.name}</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {formatFileSize(file.size)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="border border-gray-200 rounded-lg p-4 bg-white overflow-auto"
      style={{ maxHeight: "600px" }}
      data-testid="tree-view"
    >
      {renderTree(tree)}
    </div>
  );
};

function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export default TreeView;