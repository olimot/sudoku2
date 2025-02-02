export const relLUT = new Uint8Array(81 * 20);
const nr = new Uint8Array(81);
const nc = new Uint8Array(81);
const nb = new Uint8Array(81);
for (let i = 0; i < 81; i++) {
  const row = Math.trunc(i / 9);
  const col = i % 9;
  const block = Math.trunc(row / 3) * 3 + Math.trunc(col / 3);
  nr[i] = row;
  nc[i] = col + 9;
  nb[i] = block + 18;
  const relSet = new Set([i]);
  const blockOffset = 9 * 3 * Math.trunc(block / 3) + 3 * (block % 3);
  for (let j = 0; j < 9; j++) {
    relSet.add(row * 9 + j);
    relSet.add(j * 9 + col);
    relSet.add(blockOffset + 9 * Math.trunc(j / 3) + (j % 3));
  }
  const rel = [...relSet].slice(1).sort((a, b) => a - b);
  relLUT.set(rel, i * 20);
}

export function erasePossible(note: Uint32Array, i: number, value: number) {
  const notValue = ~value;
  note[nr[i]] &= notValue;
  note[nc[i]] &= notValue;
  note[nb[i]] &= notValue;
}

export function addPossible(note: Uint32Array, i: number, value: number) {
  note[nr[i]] |= value;
  note[nc[i]] |= value;
  note[nb[i]] |= value;
}

export function getPossibles(note: Uint32Array, i1: number) {
  return note[nr[i1]] & note[nc[i1]] & note[nb[i1]];
}

// http://stackoverflow.com/questions/109023/how-to-count-the-number-of-set-bits-in-a-32-bit-integer
export function bitcnt(i: number) {
  i = i - ((i >> 1) & 0x55555555);
  i = (i & 0x33333333) + ((i >> 2) & 0x33333333);
  return (((i + (i >> 4)) & 0x0f0f0f0f) * 0x01010101) >> 24;
}

export function mapSudokuToNumbers(table: Uint32Array) {
  return [...table.map((it) => (it ? Math.log2(it) + 1 : 0))];
}

export function mapNumbersToSudoku(table: Uint32Array, numbers: number[]) {
  for (let i = 0; i < 81; i++) {
    table[i] = numbers[i] && 1 << (numbers[i] - 1);
  }
}

const arena = new Uint32Array(108).fill(511);
const solverNote = arena.subarray(0, 27);
const untested = arena.subarray(27);
export function solve(table: Uint32Array) {
  arena.fill(511);

  const holes: number[] = [];
  for (let i = 0; i < 81; i++) if (!table[i]) holes.push(i);
  if (!holes.length) return true;

  for (let i = 0; i < 81; i++) erasePossible(solverNote, i, table[i]);

  for (let h = 0, min = 9; h < holes.length; h++) {
    const i1 = holes[h];
    const cnt = bitcnt(getPossibles(solverNote, i1));
    if (cnt < min) [min, holes[0], holes[h]] = [cnt, holes[h], holes[0]];
  }

  let cursor = 0;
  let from = -1;
  while (cursor >= 0 && cursor < holes.length) {
    let i1 = holes[cursor];
    let ps = untested[i1] & getPossibles(solverNote, i1);
    let pcnt = bitcnt(ps);
    if (from !== -1) {
      for (let j = from * 20, e = j + 20; j < e; j++) {
        const i2 = relLUT[j];
        if (table[i2]) continue;
        const ps2 = untested[i2] & getPossibles(solverNote, i2);
        const pcnt2 = bitcnt(ps2);
        if (pcnt2 >= pcnt) continue;
        i1 = i2;
        ps = ps2;
        pcnt = pcnt2;
        holes[holes.indexOf(i2)] = holes[cursor];
        holes[cursor] = i2;
      }
    }

    const prev = table[i1];
    if (prev) addPossible(solverNote, i1, prev);

    if (ps !== 0) {
      let v = 1;
      for (let x = Math.trunc(pcnt * Math.random()); v < 512; v <<= 1, x -= 1) {
        if (!(ps & v)) continue;
        if (x <= 0) break;
      }
      erasePossible(solverNote, i1, v);
      table[i1] = v;
      untested[i1] &= ~v;
      from = i1;
      cursor += 1;
    } else {
      untested[i1] = 511;
      table[i1] = 0;
      from = -1;
      cursor -= 1;
    }
  }

  return cursor !== -1;
}

const diggerNote = new Uint32Array(27).fill(511);
export function dig(table: Uint32Array, minClues: number) {
  diggerNote.fill(511);
  for (let i = 0; i < 81; i++) erasePossible(diggerNote, i, table[i]);

  const queue = [...Array(81).keys()];
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.trunc(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  let nClues = 81;
  for (const i1 of queue) {
    const value = table[i1];
    table[i1] = 0;
    addPossible(diggerNote, i1, value);
    const possibleOutcomes = getPossibles(diggerNote, i1);

    let hasMultiSolution = false;
    if (bitcnt(possibleOutcomes) !== 1) {
      for (let v = 1; v < 512 && !hasMultiSolution; v <<= 1) {
        if (!(possibleOutcomes & v) || v === value) continue;
        table[i1] = v;
        hasMultiSolution = solve(table.slice());
      }
    }

    if (hasMultiSolution) {
      table[i1] = value;
      erasePossible(diggerNote, i1, value);
    } else {
      table[i1] = 0;
    }

    if (!hasMultiSolution && --nClues <= minClues) return;
  }
}

export function parseSudokuCode(text: string) {
  text = text.replace(/[^0-9]+/g, "");
  const table = new Uint32Array(81);
  for (let i = 0; i < 81; i++) {
    const number = parseInt(text[i]) || 0;
    table[i] = number ? 1 << (number - 1) : 0;
  }
  return table;
}

const s17sp = fetch(new URL("./s17s.txt", import.meta.url))
  .then((res) => res.text())
  .then((text) => text.split("\n").map((it) => Array.from(it, Number)));

export async function generate(nTargetClues = 0) {
  const table = Array(81).fill(0);
  if (nTargetClues <= 17) {
    const s17s = await s17sp;
    const s17 = s17s[Math.trunc(s17s.length * Math.random())];
    for (let i = 0; i < 81; i++) table[i] = s17[i];
  } else {
    let nMinClues = 81;
    let i = 0;
    const tmp = new Uint32Array(81);
    const genStartTime = performance.now();
    for (i = 0; i < 100 && nTargetClues < nMinClues; i++) {
      solve(tmp.fill(0));
      dig(tmp, nTargetClues);
      let nClues = 0;
      for (let j = 0; j < 81; j++) if (tmp[j]) nClues++;
      if (nClues >= nMinClues) continue;
      nMinClues = nClues;
      for (let j = 0; j < 81; j++) {
        table[j] = tmp[j] ? Math.log2(tmp[j]) + 1 : 0;
      }
    }
    const t = Math.round(performance.now() - genStartTime);
    console.log(`# of iterations: ${i}, elapsed: ${t} ms`);
  }
  return table;
}
