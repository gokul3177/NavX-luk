import React, { useState } from "react";
import Grid from "./components/Grid";
import { bfs, dfs, dijkstra, astar } from "./utils/pathfinding";

const createEmptyGrid = () =>
  Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => []));

// Define your backend API URL
const API_BASE_URL = "https://navx-luk-production.up.railway.app/api";

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

    try {
      const response = await fetch(`${API_BASE_URL}/path`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save path: ${response.status} - ${errorText}`);
      }
      // console.log("Path saved successfully!");
    } catch (error) {
      console.error("Error saving path:", error);
      alert("Failed to save path history. Please check the network and server logs.");
    }
  };

  const handleClear = () => {
    setGrid(createEmptyGrid());
  };

  const handleHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/paths`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch history: ${res.status} - ${errorText}`);
      }
      const data = await res.json();
      setHistory(data);
      setShowHistory(true);
    } catch (error) {
      console.error("Error fetching history:", error);
      alert("Failed to fetch history. Please check the server and network connection.");
    }
  };

  const handleDeleteHistory = async () => {
    const confirmDelete = window.confirm(
      "⚠️ Are you sure you want to delete all history? This action cannot be undone."
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/paths`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete history: ${response.status} - ${errorText}`);
      }
      // After successful deletion, re-fetch the history (which should now be empty)
      await handleHistory();
      alert("History deleted successfully.");
    } catch (error) {
      console.error("Error deleting history:", error);
      alert("Failed to delete history. Please try again.");
    }
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
      onClick={() => showHistory && setShowHistory(false)} // This might unintentionally close history if clicked anywhere
    >
      <h1 style={{ textAlign: "center", fontSize: "2.5rem", color: "#0d47a1" }}>🤖 navX Simulator</h1>

      <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
        <button onClick={handleClear}>🧹 Clear</button>
        {/* Prevent closing history when clicking the button itself */}
        <button onClick={(e) => { e.stopPropagation(); handleHistory(); }}>📜 History</button> 
        <button onClick={(e) => { e.stopPropagation(); downloadCSV(exportToCSV(history), "navx_export.csv"); }}>
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
          // Prevent closing history when clicking inside the history panel
          onClick={(e) => e.stopPropagation()} 
        >
          <button
            onClick={handleDeleteHistory}
            style={{ position: "absolute", top: 10, right: 10 }}
          >
            🗑️ Delete History
          </button>

          <h2 style={{ color: "#e65100" }}>🕰️ Previous Results</h2>
          {history.length > 0 ? (
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
                    key={row.id || idx} // Use row.id if available for a stable key
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
          ) : (
            <p style={{ textAlign: "center", fontStyle: "italic", color: "#616161" }}>No history available. Run some simulations to see results here!</p>
          )}
        </div>
      )}
      <footer style={{ marginTop: "2rem", color: "#0d47a1", fontWeight: "bold" }}>
        🚀 Made in RCS
      </footer>
    </div>
  );
}

export default App;