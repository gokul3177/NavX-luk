// App.jsx
import React, { useState } from "react";
import Grid from "./components/Grid";
import { bfs, dfs, dijkstra, astar } from "./utils/pathfinding";

const createEmptyGrid = () =>
  Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => []));

function App() {
  const [grid, setGrid] = useState(createEmptyGrid());
  const [currentTool, setCurrentTool] = useState("obstacle");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

  const handleCellClick = (row, col) => {
    if (showHistory) return;
    const newGrid = grid.map((r) => [...r]);

    if (currentTool === "start") {
      clearType("start");
      newGrid[row][col] = ["start"];
    } else if (currentTool === "goal") {
      clearType("goal");
      newGrid[row][col] = ["goal"];
    } else if (currentTool === "obstacle") {
      newGrid[row][col] = ["obstacle"];
    }

    setGrid(newGrid);
  };

  const clearType = (type) => {
    const newGrid = grid.map((row) =>
      row.map((cell) =>
        Array.isArray(cell) && cell.includes(type) ? [] : cell
      )
    );
    setGrid(newGrid);
  };

  const findCell = (type) => {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (Array.isArray(grid[r][c]) && grid[r][c].includes(type)) {
          return [r, c];
        }
      }
    }
    return null;
  };

  const simulateAlgo = async (algoName, algoFunc) => {
    if (showHistory) return;

    const start = findCell("start");
    const goal = findCell("goal");

    if (!start || !goal) {
      alert("Set both start and goal points.");
      return;
    }

    const t0 = performance.now();
    const result = algoFunc(grid, start, goal);
    const t1 = performance.now();

    if (!result.path || result.path.length === 0) {
      alert("No path found.");
      return;
    }

    const newGrid = grid.map((row) =>
      row.map((cell) =>
        Array.isArray(cell) && (cell.includes("start") || cell.includes("goal") || cell.includes("obstacle"))
          ? cell
          : []
      )
    );

    for (let i = 0; i < result.path.length; i++) {
      const [r, c] = result.path[i];

      if (!Array.isArray(newGrid[r][c])) newGrid[r][c] = [];

      if (!newGrid[r][c].includes(algoName)) {
        newGrid[r][c].push(algoName);
      }

      newGrid[r][c].push("robot");
      setGrid([...newGrid]);
      await new Promise((res) => setTimeout(res, 80));
      newGrid[r][c] = newGrid[r][c].filter((v) => v !== "robot");
    }

    const data = {
      algorithm: algoName,
      start_point: JSON.stringify(start),
      goal_point: JSON.stringify(goal),
      obstacles: JSON.stringify(
        grid.flatMap((row, r) =>
          row.map((cell, c) => (cell.includes("obstacle") ? [r, c] : null)).filter(Boolean)
        )
      ),
      path: JSON.stringify(result.path),
      path_length: result.path.length,
      time_taken: (t1 - t0).toFixed(2),
    };

    await fetch("http://localhost:4000/api/path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  };

  const handleClear = () => {
    setGrid(createEmptyGrid());
  };

  const handleHistory = async () => {
    const res = await fetch("http://localhost:4000/api/paths");
    const data = await res.json();
    setHistory(data);
    setShowHistory(true);
  };

  const handleDeleteHistory = async () => {
    const confirm = window.confirm(
      "⚠️ Are you sure to delete? You can't retrieve the data back. This is a permanent change."
    );

    if (!confirm) return;

    await fetch("http://localhost:4000/api/paths", {
      method: "DELETE",
    });

    const res = await fetch("http://localhost:4000/api/paths");
    const data = await res.json();
    setHistory(data);
    setShowHistory(false);

    alert("History deleted successfully.");
  };

  const exportToCSV = (rows) => {
    const header = ["Algorithm", "Start", "Goal", "Path", "Path Length", "Time Taken (ms)"];
    const csv = [header.join(",")];

    for (const row of rows) {
      const line = [
        row.algorithm,
        JSON.stringify(row.start_point),
        JSON.stringify(row.goal_point),
        JSON.stringify(row.path),
        row.path_length,
        row.time_taken,
      ];
      csv.push(line.join(","));
    }
    return csv.join("\n");
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        background: "linear-gradient(to right, #4facfe, #00f2fe)",
        fontFamily: "'Courier New', Courier, monospace",
        animation: "bgFade 10s infinite alternate",
      }}
      onClick={() => showHistory && setShowHistory(false)}
    >
      <h1 style={{ textAlign: "center", fontSize: "2.5rem", color: "#0d47a1" }}>🤖 navX Simulator</h1>

      <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
        <button onClick={handleClear}>🧹 Clear</button>
        <button onClick={handleHistory}>📜 History</button>
        <button onClick={() => downloadCSV(exportToCSV(history), "navx_export.csv")}>
          💾 Export .CSV
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
        <button onClick={() => setCurrentTool("start")}>🏁 Start</button>
        <button onClick={() => setCurrentTool("goal")}>🚩 Goal</button>
        <button onClick={() => setCurrentTool("obstacle")}>🧱 Obstacle</button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
        <button onClick={() => simulateAlgo("BFS", bfs)}>📘 BFS</button>
        <button onClick={() => simulateAlgo("DFS", dfs)}>📙 DFS</button>
        <button onClick={() => simulateAlgo("DIJKSTRA", dijkstra)}>📗 Dijkstra</button>
        <button onClick={() => simulateAlgo("ASTAR", astar)}>🌟 A*</button>
      </div>

      <Grid grid={grid} onCellClick={handleCellClick} />

      {showHistory && (
        <div
          style={{
            marginTop: "2rem",
            width: "90%",
            backgroundColor: "#fffde7",
            padding: "1rem",
            borderRadius: "10px",
            position: "relative",
            boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
          }}
        >
          <button
            onClick={handleDeleteHistory}
            style={{ position: "absolute", top: 10, right: 10 }}
          >
            🗑️ Delete History
          </button>

          <h2 style={{ color: "#e65100" }}>🕰️ Previous Results</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#ffe082" }}>
                <th>Algorithm</th>
                <th>Start</th>
                <th>Goal</th>
                <th>Path</th>
                <th>Path Length</th>
                <th>Time Taken (ms)</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row, idx) => (
                <tr
                  key={idx}
                  style={{ backgroundColor: idx % 2 === 0 ? "#fff8e1" : "#ffffff" }}
                >
                  <td>{row.algorithm}</td>
                  <td>{row.start_point}</td>
                  <td>{row.goal_point}</td>
                  <td>{Array.isArray(row.path) ? JSON.stringify(row.path) : row.path}</td>
                  <td>{row.path_length}</td>
                  <td>{row.time_taken}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer style={{ marginTop: "2rem", color: "#0d47a1", fontWeight: "bold" }}>
        🚀 Made in RCS
      </footer>
    </div>
  );
}

export default App;
