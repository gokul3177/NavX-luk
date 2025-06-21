import React from "react";
import "./Grid.css";

const algoColors = {
  BFS: "green",
  DFS: "orange",
  DIJKSTRA: "dodgerblue",
  ASTAR: "purple",
};

function getCellStyle(cell) {
  if (Array.isArray(cell)) {
    if (cell.includes("start")) return { backgroundColor: "lime" };
    if (cell.includes("goal")) return { backgroundColor: "red" };
    if (cell.includes("obstacle")) return { backgroundColor: "black" };

    const algos = cell;
    if (algos.length === 1) {
      return { backgroundColor: algoColors[algos[0]] };
    }

    const gradient = algos
      .map((algo, i) => {
        const start = (i * 100) / algos.length;
        const end = ((i + 1) * 100) / algos.length;
        return `${algoColors[algo]} ${start}% ${end}%`;
      })
      .join(", ");

    return {
      background: `linear-gradient(to right, ${gradient})`,
    };
  }

  return { backgroundColor: "white" };
}

function Grid({ grid, onCellClick }) {
  return (
    <div className="grid">
      {grid.map((row, r) =>
        row.map((cell, c) => (
          <div
            key={`${r}-${c}`}
            className="grid-cell"
            style={getCellStyle(cell)}
            onClick={() => onCellClick(r, c)}
          />
        ))
      )}
    </div>
  );
}

export default Grid;