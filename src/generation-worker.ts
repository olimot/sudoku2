import { findMinimumPuzzle, solve } from "./sudoku";

const puzzle = Array(81).fill(0);

const min = new Uint32Array(81);
const genStartTime = performance.now();

solve(min.fill(0));
findMinimumPuzzle(min);

for (let j = 0; j < 81; j++) puzzle[j] = min[j] ? Math.log2(min[j]) + 1 : 0;
const t = Math.round(performance.now() - genStartTime);
console.log(`elapsed: ${t} ms`);

postMessage(puzzle);
