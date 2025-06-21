import React from "react";

function Controls({
  currentTool,
  setCurrentTool,
  selectedAlgo,
  setSelectedAlgo,
  onSimulate,
  onClear,
}) {
  const tools = ["start", "goal", "obstacle"];
  const algos = ["BFS", "DFS", "DIJKSTRA", "ASTAR"];

  return (
    <div style={{ marginBottom: "1rem" }}>
      {tools.map((tool) => (
        <button
          key={tool}
          onClick={() => setCurrentTool(tool)}
          style={{
            marginRight: "5px",
            backgroundColor: currentTool === tool ? "#ccc" : "#fff",
          }}
        >
          Set {tool.charAt(0).toUpperCase() + tool.slice(1)}
        </button>
      ))}

      {algos.map((algo) => (
        <button
          key={algo}
          onClick={() => setSelectedAlgo(algo)}
          style={{
            marginLeft: "10px",
            backgroundColor: selectedAlgo === algo ? "#d0f0d0" : "#fff",
          }}
        >
          {algo}
        </button>
      ))}

      <button
        onClick={onSimulate}
        style={{ marginLeft: "10px", backgroundColor: "#007bff", color: "white" }}
      >
        Simulate
      </button>

      <button
        onClick={onClear}
        style={{ marginLeft: "10px", backgroundColor: "#f66", color: "white" }}
      >
        Clear
      </button>
    </div>
  );
}

export default Controls;
