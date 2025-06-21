// App.jsx
import React, { useState } from "react";
import Grid from "./components/Grid";
import { bfs, dfs, dijkstra, astar } from "./utils/pathfinding";

// Helper function to create an empty grid
const createEmptyGrid = () =>
  Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => []));

// Define your backend API URL for the DEPLOYED ENVIRONMENT on Render.
// IMPORTANT: Replace 'https://your-navx-backend.onrender.com' with the actual
// public URL provided by Render for your backend service.
const API_BASE_URL = "https://navx-luk.onrender.com/api"; 

function App() {
  const [grid, setGrid] = useState(createEmptyGrid());
  const [currentTool, setCurrentTool] = useState("obstacle");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

  /**
   * Handles click events on grid cells.
   * Based on the `currentTool`, sets a cell as start, goal, or toggles an obstacle.
   * Prevents interaction if history is currently displayed.
   * @param {number} row - The row index of the clicked cell.
   * @param {number} col - The column index of the clicked cell.
   */
  const handleCellClick = (row, col) => {
    if (showHistory) return; // Prevent interaction when history is open

    const newGrid = grid.map((r) => [...r]); // Create a shallow copy of the grid for immutability

    if (currentTool === "start") {
      clearType("start"); // Ensure only one start point exists
      newGrid[row][col] = ["start"];
    } else if (currentTool === "goal") {
      clearType("goal"); // Ensure only one goal point exists
      newGrid[row][col] = ["goal"];
    } else if (currentTool === "obstacle") {
      // Toggle obstacle: if cell contains obstacle, remove it; otherwise, add it.
      if (newGrid[row][col].includes("obstacle")) {
        newGrid[row][col] = newGrid[row][col].filter(type => type !== "obstacle");
      } else {
        newGrid[row][col] = ["obstacle"];
      }
    }
    setGrid(newGrid); // Update the grid state
  };

  /**
   * Clears all cells of a specific type (e.g., 'start' or 'goal') from the grid.
   * @param {string} type - The type of cell to clear.
   */
  const clearType = (type) => {
    setGrid((prevGrid) =>
      prevGrid.map((row) =>
        row.map((cell) =>
          Array.isArray(cell) && cell.includes(type) ? [] : cell
        )
      )
    );
  };

  /**
   * Finds the [row, col] coordinates of a cell containing a specific type.
   * @param {string} type - The type of cell to find ('start' or 'goal').
   * @returns {number[]|null} An array [row, col] if found, otherwise null.
   */
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

  /**
   * Simulates a pathfinding algorithm, visualizes the path, and saves the result to the backend.
   * @param {string} algoName - The name of the algorithm (e.g., "BFS", "DFS").
   * @param {function} algoFunc - The pathfinding function from `pathfinding.js` to execute.
   */
  const simulateAlgo = async (algoName, algoFunc) => {
    if (showHistory) return; // Prevent simulation when history is open

    const start = findCell("start");
    const goal = findCell("goal");

    if (!start || !goal) {
      alert("Set both start and goal points."); // Basic alert for missing points
      return;
    }

    // Capture current obstacles before resetting grid for visualization
    const currentObstacles = grid.flatMap((row, r) =>
      row.map((cell, c) => (Array.isArray(cell) && cell.includes("obstacle") ? [r, c] : null)).filter(Boolean)
    );

    // Create a fresh grid for visualization, preserving start, goal, and obstacles
    const initialGrid = createEmptyGrid();
    initialGrid[start[0]][start[1]] = ["start"];
    initialGrid[goal[0]][goal[1]] = ["goal"];
    currentObstacles.forEach(([r, c]) => {
      // Ensure existing start/goal cells are not overwritten, just add obstacle if they already have something
      if (initialGrid[r][c] === undefined || initialGrid[r][c].length === 0) { 
         initialGrid[r][c] = ["obstacle"];
      } else {
         initialGrid[r][c].push("obstacle"); 
      }
    });
    setGrid([...initialGrid]); // Update state to show clean grid before path animation

    const t0 = performance.now(); // Start timing the algorithm
    const result = algoFunc(grid, start, goal); // Execute the pathfinding algorithm
    const t1 = performance.now(); // End timing

    if (!result.path || result.path.length === 0) {
      alert("No path found."); // Alert if no path is returned
      return;
    }

    // Create a mutable copy of the grid for step-by-step visualization
    const visualGrid = initialGrid.map((row) => [...row]);

    // Visualize the path animation
    for (let i = 0; i < result.path.length; i++) {
      const [r, c] = result.path[i];

      // Skip changing visual if it's start or goal, but still allow robot to pass over
      if (!((r === start[0] && c === start[1]) || (r === goal[0] && c === goal[1]))) {
        // If the cell is an obstacle, it means the algorithm might have incorrectly passed through it,
        // or this check is redundant if algorithms correctly avoid obstacles.
        if (Array.isArray(visualGrid[r][c]) && visualGrid[r][c].includes("obstacle")) {
          // Do nothing or handle as an error if algorithms shouldn't pass through obstacles
        } else {
          // Initialize cell array if undefined
          if (!Array.isArray(visualGrid[r][c])) visualGrid[r][c] = [];
          // Add algorithm trace to the cell
          if (!visualGrid[r][c].includes(algoName)) {
              visualGrid[r][c].push(algoName);
          }
        }
      }

      // Add robot visual for current step
      visualGrid[r][c] = visualGrid[r][c].filter(v => v !== "robot"); // Remove robot from previous position
      visualGrid[r][c].push("robot"); // Place robot at current position
      setGrid([...visualGrid]); // Update React state to re-render grid
      await new Promise((res) => setTimeout(res, 80)); // Pause for animation effect
    }

    // Clean up: Remove the robot visual after the animation completes
    for (let i = 0; i < result.path.length; i++) {
        const [r, c] = result.path[i];
        visualGrid[r][c] = visualGrid[r][c].filter((v) => v !== "robot");
    }
    setGrid([...visualGrid]); // Final update without the robot

    // Prepare data payload for the backend API
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
      time_taken: (t1 - t0).toFixed(2) // Time taken rounded to 2 decimal places
    };

    // Send simulation data to the backend
    try {
      const response = await fetch(`${API_BASE_URL}/path`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!response.ok) { // Check if the response status is not OK (e.g., 4xx, 5xx)
        const errorText = await response.text(); // Get more details from the response body
        throw new Error(`Failed to save path: ${response.status} - ${errorText}`);
      }
      console.log("Path data saved successfully!");
    } catch (error) {
      console.error("Error saving path data:", error);
      alert("Failed to save path history. Please check the network and server logs.");
    }
  };

  /**
   * Clears the entire grid, resetting it to an empty state.
   */
  const handleClear = () => {
    setGrid(createEmptyGrid());
    setShowHistory(false); // Hide history when grid is cleared
  };

  /**
   * Fetches and displays the simulation history from the backend.
   * @param {Event} [event] - The event object (optional, used to stop propagation).
   */
  const handleHistory = async (event) => {
    if (event) event.stopPropagation(); // Prevent main div's click handler from closing immediately

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

  /**
   * Deletes all simulation history from the backend after confirmation.
   * @param {Event} [event] - The event object (optional, used to stop propagation).
   */
  const handleDeleteHistory = async (event) => {
    if (event) event.stopPropagation(); // Prevent immediate closing of history panel

    const confirmed = window.confirm(
      "⚠️ Are you sure you want to delete all history? This action cannot be undone."
    );

    if (!confirmed) return; // If user cancels, do nothing

    try {
      const response = await fetch(`${API_BASE_URL}/paths`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete history: ${response.status} - ${errorText}`);
      }
      // After successful deletion, re-fetch history to update the UI (should be empty)
      await handleHistory();
      alert("History deleted successfully.");
    } catch (error) {
      console.error("Error deleting history:", error);
      alert("Failed to delete history. Please try again.");
    }
  };

  /**
   * Converts the history data into a CSV string.
   * @param {Array<Object>} rows - The history data to convert.
   * @returns {string} The CSV formatted string.
   */
  const exportToCSV = (rows) => {
    const header = ["Algorithm", "Start", "Goal", "Path", "Path Length", "Time Taken (ms)"];
    const csv = [header.join(",")]; // Add header row

    for (const row of rows) {
      const line = [
        row.algorithm,
        JSON.stringify(row.start_point), // Stringify JSON fields
        JSON.stringify(row.goal_point),
        // Ensure path is stringified, as it might be stored as TEXT in DB
        JSON.stringify(Array.isArray(row.path) ? row.path : JSON.parse(row.path || '[]')),
        row.path_length,
        row.time_taken
      ];
      csv.push(line.join(",")); // Add data row
    }
    return csv.join("\n"); // Join all rows with newline
  };

  /**
   * Triggers a download of the provided CSV content as a file.
   * @param {string} csv - The CSV content string.
   * @param {string} filename - The desired filename for the downloaded file.
   */
  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: "text/csv" }); // Create a Blob from CSV string
    const url = URL.createObjectURL(blob); // Create a URL for the Blob
    const a = document.createElement("a"); // Create a temporary anchor element
    a.href = url;
    a.download = filename; // Set download filename
    document.body.appendChild(a); // Append to body (needed for Firefox)
    a.click(); // Programmatically click the link to trigger download
    document.body.removeChild(a); // Clean up the temporary element
    URL.revokeObjectURL(url); // Release the object URL
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
        animation: "bgFade 10s infinite alternate"
      }}
      // This onClick closes history if clicked anywhere outside the history modal itself
      onClick={() => showHistory && setShowHistory(false)}
    >
      <h1 style={{ textAlign: "center", fontSize: "2.5rem", color: "#0d47a1" }}>🤖 navX Simulator</h1>

      {/* Control Buttons */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
        <button className="tool-button" onClick={handleClear}>🧹 Clear</button>
        <button className="tool-button" onClick={handleHistory}>📜 History</button>
        <button className="tool-button" onClick={(e) => { e.stopPropagation(); downloadCSV(exportToCSV(history), "navx_export.csv"); }}>💾 Export .CSV</button>
      </div>

      {/* Tool Selection Buttons */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
        <button className={`tool-button ${currentTool === "start" ? "active" : ""}`} onClick={() => setCurrentTool("start")}>🏁 Start</button>
        <button className={`tool-button ${currentTool === "goal" ? "active" : ""}`} onClick={() => setCurrentTool("goal")}>🚩 Goal</button>
        <button className={`tool-button ${currentTool === "obstacle" ? "active" : ""}`} onClick={() => setCurrentTool("obstacle")}>🧱 Obstacle</button>
      </div>

      {/* Algorithm Simulation Buttons */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
        <button className="algo-button" onClick={() => simulateAlgo("BFS", bfs)}>📘 BFS</button>
        <button className="algo-button" onClick={() => simulateAlgo("DFS", dfs)}>📙 DFS</button>
        <button className="algo-button" onClick={() => simulateAlgo("DIJKSTRA", dijkstra)}>📗 Dijkstra</button>
        <button className="algo-button" onClick={() => simulateAlgo("ASTAR", astar)}>🌟 A*</button>
      </div>

      {/* Grid Component */}
      <Grid grid={grid} onCellClick={handleCellClick} />

      {/* History Display */}
      {showHistory && (
        <div
          style={{
            marginTop: "2rem",
            width: "90%",
            maxWidth: "800px",
            backgroundColor: "#fffde7",
            padding: "1rem",
            borderRadius: "10px",
            position: "relative",
            boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
            zIndex: 1000 // Ensure history modal is above other content
          }}
          // Stop propagation for clicks inside the history div to prevent closing
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
            <div style={{ maxHeight: "400px", overflowY: "auto" }}> {/* Makes table scrollable */}
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
                    // Using row.id for key, assuming it's unique. Fallback to index if not reliable.
                    <tr key={row.id} style={{ backgroundColor: row.id % 2 === 0 ? "#fff8e1" : "#ffffff" }}>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>{row.algorithm}</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>{row.start_point}</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>{row.goal_point}</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd", fontSize: "0.75em" }}>
                          {/* Parse path if it's a string, otherwise stringify if it's already an array */}
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
      {/* Footer */}
      <footer style={{ marginTop: "2rem", color: "#0d47a1", fontWeight: "bold" }}>
        🚀 Built with 💓 for RCS
      </footer>
       {/* Inline Styles for Buttons and Grid Cells (Consider moving to a separate CSS file for larger projects) */}
      <style>
        {`
        /* Button Styling */
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

        /* Basic Grid cell styling - these classes should be applied in your Grid component */
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
        /* Path visualization colors */
        .cell.bfs { background-color: #2196F3; opacity: 0.5; } /* Blue for BFS path */
        .cell.dfs { background-color: #9C27B0; opacity: 0.5; } /* Purple for DFS path */
        .cell.dijkstra { background-color: #FFC107; opacity: 0.5; } /* Amber for Dijkstra path */
        .cell.astar { background-color: #FF9800; opacity: 0.5; } /* Orange for A* path */
        
        /* Robot animation */
        .cell.robot::after {
            content: "🤖"; /* Robot emoji */
            position: absolute;
            font-size: 1.2em;
            animation: bounce 0.5s infinite alternate; /* Simple bounce animation */
        }

        /* Keyframe animations */
        @keyframes bounce {
            from { transform: translateY(0); }
            to { transform: translateY(-5px); }
        }

        @keyframes bgFade {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        /* Responsive adjustments for smaller screens */
        @media (max-width: 768px) {
            .tool-button, .algo-button, .delete-button {
                padding: 8px 12px;
                font-size: 0.9em;
            }
            .tool-button, .algo-button {
                flex-grow: 1; /* Make buttons grow to fill space */
            }
            .cell {
                width: 30px; /* Smaller cells on mobile */
                height: 30px;
                font-size: 0.7em;
            }
            h1 {
                font-size: 1.8rem !important; /* Smaller heading */
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
                margin-bottom: 5px; /* Add some space between stacked buttons */
            }
        }

        `}
      </style>
    </div>
  );
}

export default App;
