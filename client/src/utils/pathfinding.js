export function bfs(grid, start, goal) {
  const queue = [start];
  const visited = new Set();
  const parent = {};
  const directions = [
    [0, 1], [1, 0], [0, -1], [-1, 0]
  ];

  visited.add(start.toString());

  while (queue.length) {
    const [r, c] = queue.shift();
    if (r === goal[0] && c === goal[1]) break;

    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;

      if (
        nr >= 0 && nr < 10 && nc >= 0 && nc < 10 &&
        !visited.has([nr, nc].toString()) &&
        !grid[nr][nc].includes("obstacle")
      ) {
        queue.push([nr, nc]);
        visited.add([nr, nc].toString());
        parent[[nr, nc]] = [r, c];
      }
    }
  }

  const path = [];
  let curr = goal;
  while (curr && curr.toString() !== start.toString()) {
    path.unshift(curr);
    curr = parent[curr];
  }

  if (curr) path.unshift(start);
  return { path, visited: Array.from(visited).map(p => p.split(',').map(Number)) };
}

export function dfs(grid, start, goal) {
  const stack = [start];
  const visited = new Set();
  const parent = {};
  const directions = [
    [0, 1], [1, 0], [0, -1], [-1, 0]
  ];

  visited.add(start.toString());

  while (stack.length) {
    const [r, c] = stack.pop();
    if (r === goal[0] && c === goal[1]) break;

    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;

      if (
        nr >= 0 && nr < 10 && nc >= 0 && nc < 10 &&
        !visited.has([nr, nc].toString()) &&
        !grid[nr][nc].includes("obstacle")
      ) {
        stack.push([nr, nc]);
        visited.add([nr, nc].toString());
        parent[[nr, nc]] = [r, c];
      }
    }
  }

  const path = [];
  let curr = goal;
  while (curr && curr.toString() !== start.toString()) {
    path.unshift(curr);
    curr = parent[curr];
  }

  if (curr) path.unshift(start);
  return { path, visited: Array.from(visited).map(p => p.split(',').map(Number)) };
}

export function dijkstra(grid, start, goal) {
  const dist = {};
  const visited = new Set();
  const parent = {};
  const pq = [[0, start]];
  const directions = [
    [0, 1], [1, 0], [0, -1], [-1, 0]
  ];

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      dist[[r, c]] = Infinity;
    }
  }

  dist[start] = 0;

  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, [r, c]] = pq.shift();
    const key = [r, c].toString();

    if (visited.has(key)) continue;
    visited.add(key);

    if (r === goal[0] && c === goal[1]) break;

    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;

      if (
        nr >= 0 && nr < 10 && nc >= 0 && nc < 10 &&
        !grid[nr][nc].includes("obstacle")
      ) {
        const alt = d + 1;
        if (alt < dist[[nr, nc]]) {
          dist[[nr, nc]] = alt;
          parent[[nr, nc]] = [r, c];
          pq.push([alt, [nr, nc]]);
        }
      }
    }
  }

  const path = [];
  let curr = goal;
  while (curr && curr.toString() !== start.toString()) {
    path.unshift(curr);
    curr = parent[curr];
  }

  if (curr) path.unshift(start);
  return { path, visited: Array.from(visited).map(p => p.split(',').map(Number)) };
}

export function astar(grid, start, goal) {
  const h = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  const open = [[h(start, goal), 0, start]];
  const parent = {};
  const g = { [start]: 0 };
  const visited = new Set();
  const directions = [
    [0, 1], [1, 0], [0, -1], [-1, 0]
  ];

  while (open.length) {
    open.sort((a, b) => a[0] - b[0]);
    const [_, currG, [r, c]] = open.shift();
    const key = [r, c].toString();

    if (visited.has(key)) continue;
    visited.add(key);

    if (r === goal[0] && c === goal[1]) break;

    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;

      if (
        nr >= 0 && nr < 10 && nc >= 0 && nc < 10 &&
        !grid[nr][nc].includes("obstacle")
      ) {
        const ng = currG + 1;
        const nh = h([nr, nc], goal);
        const nf = ng + nh;

        if (!(g[[nr, nc]]) || ng < g[[nr, nc]]) {
          g[[nr, nc]] = ng;
          parent[[nr, nc]] = [r, c];
          open.push([nf, ng, [nr, nc]]);
        }
      }
    }
  }

  const path = [];
  let curr = goal;
  while (curr && curr.toString() !== start.toString()) {
    path.unshift(curr);
    curr = parent[curr];
  }

  if (curr) path.unshift(start);
  return { path, visited: Array.from(visited).map(p => p.split(',').map(Number)) };
}
