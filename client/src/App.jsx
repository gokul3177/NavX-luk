// App.jsx
import React, { useState } from "react";
import Grid from "./components/Grid";
import { bfs, dfs, dijkstra, astar } from "./utils/pathfinding";

const API_BASE_URL = "https://n-a-v-b2fqeslwf-gokuls-projects-18c993ea.vercel.app/api";

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
      if (newGrid[row][col].includes("obstacle")) {
        newGrid[row][col] = newGrid[row][col].filter((type) => type !== "obstacle");
      } else {
        newGrid[row][col] = ["obstacle"];
      }
    }
    setGrid(newGrid);
  };

  const clearType = (type) => {
    setGrid((prevGrid) =>
      prevGrid.map((row) =>
        row.map((cell) => (Array.isArray(cell) && cell.includes(type) ? [] : cell))
      )
    );
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

    const currentObstacles = grid.flatMap((row, r) =>
      row.map((cell, c) => (cell.includes("obstacle") ? [r, c] : null)).filter(Boolean)
    );

    const initialGrid = createEmptyGrid();
    initialGrid[start[0]][start[1]] = ["start"];
    initialGrid[goal[0]][goal[1]] = ["goal"];
    currentObstacles.forEach(([r, c]) => {
      if (!initialGrid[r][c].includes("start") && !initialGrid[r][c].includes("goal")) {
        initialGrid[r][c].push("obstacle");
      }
    });
    setGrid([...initialGrid]);

    const t0 = performance.now();
    const result = algoFunc(grid, start, goal);
    const t1 = performance.now();

    if (!result.path || result.path.length === 0) {
      alert("No path found.");
      return;
    }

    const visualGrid = initialGrid.map((row) => [...row]);
    for (let i = 0; i < result.path.length; i++) {
      const [r, c] = result.path[i];
      if (!(r === start[0] && c === start[1]) && !(r === goal[0] && c === goal[1])) {
        if (!Array.isArray(visualGrid[r][c])) visualGrid[r][c] = [];
        if (!visualGrid[r][c].includes(algoName)) visualGrid[r][c].push(algoName);
      }
      visualGrid[r][c] = visualGrid[r][c].filter((v) => v !== "robot");
      visualGrid[r][c].push("robot");
      setGrid([...visualGrid]);
      await new Promise((res) => setTimeout(res, 80));
    }

    for (let i = 0; i < result.path.length; i++) {
      const [r, c] = result.path[i];
      visualGrid[r][c] = visualGrid[r][c].filter((v) => v !== "robot");
    }
    setGrid([...visualGrid]);

    const data = {
      algorithm: algoName,
      start_point: JSON.stringify(start),
      goal_point: JSON.stringify(goal),
      obstacles: JSON.stringify(currentObstacles),
      path: JSON.stringify(result.path),
      path_length: result.path.length,
      time_taken: (t1 - t0).toFixed(2),
    };

    try {
      const response = await fetch(`${API_BASE_URL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save path: ${response.status} - ${errorText}`);
      }
      console.log("Path data saved successfully!");
    } catch (error) {
      console.error("Error saving path data:", error);
      alert("Failed to save path history. Please check the network and server logs.");
    }
  };

  const handleClear = () => {
    setGrid(createEmptyGrid());
    setShowHistory(false);
  };

  const handleHistory = async (event) => {
    if (event) event.stopPropagation();
    try {
      const res = await fetch(`${API_BASE_URL}`);
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

  const handleDeleteHistory = async (event) => {
    if (event) event.stopPropagation();
    if (!window.confirm("⚠️ Are you sure you want to delete all history? This action cannot be undone.")) return;
    try {
      const response = await fetch(`${API_BASE_URL}`, { method: "DELETE" });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete history: ${response.status} - ${errorText}`);
      }
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
        JSON.stringify(Array.isArray(row.path) ? row.path : JSON.parse(row.path || '[]')),
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
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h1>🤖 navX Simulator</h1>
      <button onClick={handleClear}>Clear</button>
      <button onClick={handleHistory}>History</button>
      <button onClick={() => downloadCSV(exportToCSV(history), "navx_export.csv")}>Export CSV</button>

      <button onClick={() => setCurrentTool("start")}>Start</button>
      <button onClick={() => setCurrentTool("goal")}>Goal</button>
      <button onClick={() => setCurrentTool("obstacle")}>Obstacle</button>

      <button onClick={() => simulateAlgo("BFS", bfs)}>BFS</button>
      <button onClick={() => simulateAlgo("DFS", dfs)}>DFS</button>
      <button onClick={() => simulateAlgo("DIJKSTRA", dijkstra)}>Dijkstra</button>
      <button onClick={() => simulateAlgo("ASTAR", astar)}>A*</button>

      <Grid grid={grid} onCellClick={handleCellClick} />

      {showHistory && (
        <div>
          <h2>Previous Results</h2>
          <button onClick={handleDeleteHistory}>Delete History</button>
          <table>
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Start</th>
                <th>Goal</th>
                <th>Path</th>
                <th>Length</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td>{row.algorithm}</td>
                  <td>{row.start_point}</td>
                  <td>{row.goal_point}</td>
                  <td>{JSON.stringify(row.path)}</td>
                  <td>{row.path_length}</td>
                  <td>{row.time_taken}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
