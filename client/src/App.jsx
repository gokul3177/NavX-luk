// App.jsx
import React, { useState } from "react";
import Grid from "./components/Grid";
import { bfs, dfs, dijkstra, astar } from "./utils/pathfinding";

const createEmptyGrid = () =>
  Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => []));

// Define your backend API URL for the DEPLOYED ENVIRONMENT
// This MUST match the public URL of your Railway backend.
const API_BASE_URL = "https://navx-luk-production.up.railway.app/api";

function App() {
  const [grid, setGrid] = useState(createEmptyGrid());
  const [currentTool, setCurrentTool] = useState("obstacle");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

  const handleCellClick = (row, col) => {
    // Prevent interaction with the grid when history is shown
    if (showHistory) return;

    const newGrid = grid.map((r) => [...r]); // Create a shallow copy of the grid

    // Apply the selected tool
    if (currentTool === "start") {
      clearType("start"); // Ensure only one start point
      newGrid[row][col] = ["start"];
    } else if (currentTool === "goal") {
      clearType("goal"); // Ensure only one goal point
      newGrid[row][col] = ["goal"];
    } else if (currentTool === "obstacle") {
      // Toggle obstacle: if it's already an obstacle, remove it, otherwise add it
      if (newGrid[row][col].includes("obstacle")) {
        newGrid[row][col] = newGrid[row][col].filter(type => type !== "obstacle");
      } else {
        newGrid[row][col] = ["obstacle"];
      }
    }

    setGrid(newGrid);
  };

  // Helper to clear existing 'start' or 'goal' points
  const clearType = (type) => {
    setGrid((prevGrid) =>
      prevGrid.map((row) =>
        row.map((cell) =>
          Array.isArray(cell) && cell.includes(type) ? [] : cell
        )
      )
    );
  };

  // Helper to find the coordinates of a 'start' or 'goal' point
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
    // Prevent simulation if history is shown
    if (showHistory) return;

    const start = findCell("start");
    const goal = findCell("goal");

    if (!start || !goal) {
      // Use a custom modal or message box instead of alert()
      // For simplicity here, alert() is kept, but it should be replaced in a real app.
      alert("Set both start and goal points.");
      return;
    }

    // Reset grid visuals for a new simulation (clear previous path/robot traces)
    const currentObstacles = grid.flatMap((row, r) =>
      row.map((cell, c) => (cell.includes("obstacle") ? [r, c] : null)).filter(Boolean)
    );
    const initialGrid = createEmptyGrid();
    initialGrid[start[0]][start[1]] = ["start"];
    initialGrid[goal[0]][goal[1]] = ["goal"];
    currentObstacles.forEach(([r, c]) => {
      if (initialGrid[r][c] === undefined || initialGrid[r][c].length === 0) { // Avoid overwriting start/goal
         initialGrid[r][c] = ["obstacle"];
      } else {
         initialGrid[r][c].push("obstacle"); // Add obstacle to existing cell if not empty
      }
    });
    setGrid([...initialGrid]); // Apply this initial state

    const t0 = performance.now(); // Start time for performance measurement
    const result = algoFunc(grid, start, goal); // Execute the pathfinding algorithm
    const t1 = performance.now(); // End time

    if (!result.path || result.path.length === 0) {
      alert("No path found.");
      return;
    }

    // Prepare a grid copy for visualization
    const visualGrid = initialGrid.map((row) => [...row]);


    // Visualize the path step-by-step
    for (let i = 0; i < result.path.length; i++) {
      const [r, c] = result.path[i];

      // Skip start and goal points from being marked as part of the path algorithm or robot
      if ((r === start[0] && c === start[1]) || (r === goal[0] && c === goal[1])) {
        // We still want to include the 'robot' visual though, so it walks over start/goal
      } else if (Array.isArray(visualGrid[r][c]) && visualGrid[r][c].includes("obstacle")) {
        // Do not overwrite obstacles if the path goes through them (shouldn't happen with correct algo)
        continue;
      } else {
         // Initialize cell array if undefined
        if (!Array.isArray(visualGrid[r][c])) visualGrid[r][c] = [];
        // Add algorithm trace
        if (!visualGrid[r][c].includes(algoName)) {
            visualGrid[r][c].push(algoName);
        }
      }


      // Add robot visual
      visualGrid[r][c] = visualGrid[r][c].filter(v => v !== "robot"); // Remove existing robot first
      visualGrid[r][c].push("robot");
      setGrid([...visualGrid]); // Update React state to show the robot moving
      await new Promise((res) => setTimeout(res, 80)); // Pause for visualization speed
    }

    // Clean up the robot visual after path is complete
    for (let i = 0; i < result.path.length; i++) {
        const [r, c] = result.path[i];
        visualGrid[r][c] = visualGrid[r][c].filter((v) => v !== "robot");
    }
    setGrid([...visualGrid]); // Final update without the robot

    // Prepare data to send to backend
    const data = {
      algorithm: algoName,
      start_point: JSON.stringify(start),
      goal_point: JSON.stringify(goal),
      obstacles: JSON.stringify(
        grid.flatMap((row, r) =>
          row.map((cell, c) => (Array.isArray(cell) && cell.includes("obstacle") ? [r, c] : null)).filter(Boolean)
        )
      ),
      path: JSON.stringify(result.path),
      path_length: result.path.length,
      time_taken: (t1 - t0).toFixed(2)
    };

    // Send data to backend using the defined API_BASE_URL
    try {
      const response = await fetch(`${API_BASE_URL}/path`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
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
    setShowHistory(false); // Hide history when clearing grid
  };

  const handleHistory = async (event) => {
    if (event) event.stopPropagation(); // Prevent immediate closing if clicked from a button

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

  const handleDeleteHistory = async (event) => {
    if (event) event.stopPropagation(); // Prevent closing history panel

    // Custom confirmation logic (instead of window.confirm)
    const confirmed = window.confirm(
      "⚠️ Are you sure you want to delete all history? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`${API_BASE_URL}/paths`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete history: ${response.status} - ${errorText}`);
      }
      // Re-fetch history to update the UI (it should now be empty)
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
        // Ensure path is stringified, as it might be stored as TEXT in DB
        JSON.stringify(Array.isArray(row.path) ? row.path : JSON.parse(row.path || '[]')),
        row.path_length,
        row.time_taken
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
    document.body.appendChild(a); // Append to body to ensure it's clickable
    a.click();
    document.body.removeChild(a); // Clean up
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
        animation: "bgFade 10s infinite alternate" // Ensure this animation is defined in your CSS
      }}
      // This onClick will close history if clicked anywhere outside the history modal
      onClick={() => showHistory && setShowHistory(false)}
    >
      <h1 style={{ textAlign: "center", fontSize: "2.5rem", color: "#0d47a1" }}>🤖 navX Simulator</h1>

      <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
        <button className="tool-button" onClick={handleClear}>🧹 Clear</button>
        <button className="tool-button" onClick={handleHistory}>📜 History</button>
        <button className="tool-button" onClick={(e) => { e.stopPropagation(); downloadCSV(exportToCSV(history), "navx_export.csv"); }}>💾 Export .CSV</button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
        <button className={`tool-button ${currentTool === "start" ? "active" : ""}`} onClick={() => setCurrentTool("start")}>🏁 Start</button>
        <button className={`tool-button ${currentTool === "goal" ? "active" : ""}`} onClick={() => setCurrentTool("goal")}>🚩 Goal</button>
        <button className={`tool-button ${currentTool === "obstacle" ? "active" : ""}`} onClick={() => setCurrentTool("obstacle")}>🧱 Obstacle</button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
        <button className="algo-button" onClick={() => simulateAlgo("BFS", bfs)}>📘 BFS</button>
        <button className="algo-button" onClick={() => simulateAlgo("DFS", dfs)}>📙 DFS</button>
        <button className="algo-button" onClick={() => simulateAlgo("DIJKSTRA", dijkstra)}>📗 Dijkstra</button>
        <button className="algo-button" onClick={() => simulateAlgo("ASTAR", astar)}>🌟 A*</button>
      </div>

      <Grid grid={grid} onCellClick={handleCellClick} />

      {showHistory && (
        <div
          style={{
            marginTop: "2rem",
            width: "90%",
            maxWidth: "800px", // Added max-width for better display on larger screens
            backgroundColor: "#fffde7",
            padding: "1rem",
            borderRadius: "10px",
            position: "relative",
            boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
            zIndex: 1000 // Ensure it's on top of other content
          }}
          // Stop propagation for clicks inside the history div
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="delete-button"
            onClick={handleDeleteHistory}
            style={{ position: "absolute", top: "10px", right: "10px" }}
          >
            🗑️ Delete History
          </button>

          <h2 style={{ color: "#e65100", textAlign: "center" }}>🕰️ Previous Results</h2>
          {history.length > 0 ? (
            <div style={{ maxHeight: "400px", overflowY: "auto" }}> {/* Make table scrollable if too long */}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#ffe082" }}>
                    <th style={{ padding: "8px", border: "1px solid #ddd" }}>Algorithm</th>
                    <th style={{ padding: "8px", border: "1px solid #ddd" }}>Start</th>
                    <th style={{ padding: "8px", border: "1px solid #ddd" }}>Goal</th>
                    <th style={{ padding: "8px", border: "1px solid #ddd" }}>Path</th>
                    <th style={{ padding: "8px", border: "1px solid #ddd" }}>Path Length</th>
                    <th style={{ padding: "8px", border: "1px solid #ddd" }}>Time Taken (ms)</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id} style={{ backgroundColor: row.id % 2 === 0 ? "#fff8e1" : "#ffffff" }}>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>{row.algorithm}</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>{row.start_point}</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>{row.goal_point}</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd", fontSize: "0.75em" }}>
                          {Array.isArray(row.path) ? JSON.stringify(row.path) : row.path}
                      </td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>{row.path_length}</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>{row.time_taken}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ textAlign: "center", fontStyle: "italic", color: "#616161", padding: "20px" }}>No history available. Run some simulations to see results here!</p>
          )}
        </div>
      )}
      <footer style={{ marginTop: "2rem", color: "#0d47a1", fontWeight: "bold" }}>
        🚀 Built with 💓 for RCS
      </footer>
       {/* Basic Button Styling (add these to your main CSS file or a <style> tag if not using Tailwind/external CSS) */}
      <style>
        {`
        .tool-button, .algo-button, .delete-button {
          background-color: #bbdefb; /* Light blue */
          border: none;
          border-radius: 8px;
          padding: 10px 15px;
          font-size: 1em;
          cursor: pointer;
          transition: background-color 0.3s ease, transform 0.2s ease;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          color: #1565c0; /* Darker blue text */
          font-weight: bold;
        }
        .tool-button:hover, .algo-button:hover, .delete-button:hover {
          background-color: #90caf9; /* Slightly darker on hover */
          transform: translateY(-2px);
        }
        .tool-button.active {
          background-color: #2196f3; /* Blue */
          color: white;
          box-shadow: 0 4px 8px rgba(33, 150, 243, 0.4);
        }
        .delete-button {
          background-color: #ef9a9a; /* Light red */
          color: #c62828; /* Dark red text */
        }
        .delete-button:hover {
          background-color: #e57373; /* Slightly darker red on hover */
        }

        /* Basic Grid cell styling - ensure these align with your Grid component's CSS */
        /* Assuming Grid component uses classes like 'cell', 'start', 'goal', 'obstacle', 'bfs', 'dfs', 'dijkstra', 'astar', 'robot' */
        .cell {
            width: 40px; /* Adjust as needed */
            height: 40px; /* Adjust as needed */
            border: 1px solid #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8em;
            position: relative;
        }
        .cell.start { background-color: #4CAF50; } /* Green */
        .cell.goal { background-color: #F44336; } /* Red */
        .cell.obstacle { background-color: #795548; } /* Brown */
        .cell.bfs { background-color: #2196F3; opacity: 0.5; } /* Blue for BFS path */
        .cell.dfs { background-color: #9C27B0; opacity: 0.5; } /* Purple for DFS path */
        .cell.dijkstra { background-color: #FFC107; opacity: 0.5; } /* Amber for Dijkstra path */
        .cell.astar { background-color: #FF9800; opacity: 0.5; } /* Orange for A* path */
        .cell.robot::after {
            content: "🤖";
            position: absolute;
            font-size: 1.2em;
            animation: bounce 0.5s infinite alternate;
        }

        @keyframes bounce {
            from { transform: translateY(0); }
            to { transform: translateY(-5px); }
        }

        @keyframes bgFade {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
            .tool-button, .algo-button, .delete-button {
                padding: 8px 12px;
                font-size: 0.9em;
            }
            .tool-button, .algo-button {
                flex-grow: 1; /* Make buttons grow on small screens */
            }
            .cell {
                width: 30px; /* Smaller cells on mobile */
                height: 30px;
                font-size: 0.7em;
            }
            h1 {
                font-size: 1.8rem !important;
            }
            table th, table td {
                padding: 6px !important;
                font-size: 0.7em;
            }
        }
        @media (max-width: 480px) {
            div[style*="flexDirection: column"] > div[style*="gap: 10px"] {
                flex-direction: column; /* Stack button groups vertically */
            }
            .tool-button, .algo-button {
                width: 100%; /* Full width buttons */
                margin-bottom: 5px;
            }
        }

        `}
      </style>
    </div>
  );
}

export default App;
