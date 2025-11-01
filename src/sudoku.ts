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

export function andNoteBits(note: Uint32Array, i: number, value: number) {
  note[nr[i]] &= value;
  note[nc[i]] &= value;
  note[nb[i]] &= value;
}

export function orNoteBits(note: Uint32Array, i: number, value: number) {
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

const arena = new Uint32Array(108).fill(511);
const solverNote = arena.subarray(0, 27);
const untested = arena.subarray(27);
export function solve(table: Uint32Array) {
  arena.fill(511);

  const holes: number[] = [];
  for (let i = 0; i < 81; i++) if (!table[i]) holes.push(i);
  if (!holes.length) return true;

  for (let i = 0; i < 81; i++) andNoteBits(solverNote, i, ~table[i]);

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
      for (let j = cursor; j < holes.length; j++) {
        const i2 = holes[j];
        if (table[i2]) continue;
        const ps2 = untested[i2] & getPossibles(solverNote, i2);
        const pcnt2 = bitcnt(ps2);
        if (pcnt2 >= pcnt) continue;
        i1 = i2;
        ps = ps2;
        pcnt = pcnt2;
        holes[j] = holes[cursor];
        holes[cursor] = i2;
      }
    }

    const prev = table[i1];
    if (prev) orNoteBits(solverNote, i1, prev);

    if (ps !== 0) {
      let v = 1;
      // while (!(ps & v) && v < 512) v <<= 1;
      for (let x = Math.trunc(pcnt * Math.random()); v < 512; v <<= 1, x -= 1) {
        if (!(ps & v)) continue;
        if (x <= 0) break;
      }
      const notV = ~v;
      andNoteBits(solverNote, i1, notV);
      table[i1] = v;
      untested[i1] &= notV;
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

export function logPuzzle(table: number[]) {
  for (let i = 0, out = ""; i < 81; i++) {
    out += `${table[i] ? table[i] : "."}${i !== 80 ? " " : ""}`;
    if (i !== 80 && i % 9 === 8) out += "\n";
    else if (i !== 80 && i % 3 === 2) out += "| ";
    if (i !== 80 && ((i + 1) / 9) % 3 === 0) out += "------+-------+------\n";
    if (i === 80) console.log(out);
  }
}

export const indicesInit = [...Array(81).keys()];
const makerNote = new Uint32Array(27).fill(511);
const makerTmp = new Uint32Array(81);
export function reduceClues(
  table: Uint32Array,
  nTargetClues = 0,
  indices = indicesInit,
) {
  makerNote.fill(511);
  for (let i = 0; i < 81; i++) andNoteBits(makerNote, i, ~table[i]);
  let nClues = 81;
  outerLoop: for (const i1 of indices) {
    const value = table[i1];
    if (value) {
      const alternatives = getPossibles(makerNote, i1) & ~value;
      if (bitcnt(alternatives) > 0) {
        for (let v = 1; v < 512; v <<= 1) {
          if (!(alternatives & v)) continue;
          makerTmp.set(table);
          makerTmp[i1] = v;
          if (solve(makerTmp)) continue outerLoop;
        }
      }
      orNoteBits(makerNote, i1, value);
      table[i1] = 0;
    }
    if (--nClues <= nTargetClues) return nClues;
  }
  return nClues;
}

const uniqueNote = new Uint32Array(27);
const uniqueTmp = new Uint32Array(81);
export function checkUnique(table: Uint32Array) {
  uniqueNote.fill(511);
  for (let i = 0; i < 81; i++) andNoteBits(uniqueNote, i, ~table[i]);
  for (let i1 = 0; i1 < 81; i1++) {
    const value = table[i1];
    if (value) continue;
    const alternatives = getPossibles(uniqueNote, i1);
    if (bitcnt(alternatives) < 2) continue;
    let nAlts = 0;
    for (let v = 1; v < 512; v <<= 1) {
      if (!(alternatives & v)) continue;
      uniqueTmp.set(table);
      uniqueTmp[i1] = v;
      if (solve(uniqueTmp) && ++nAlts > 1) return false;
    }
  }
  return true;
}

export function debugLogPuzzle(table: Uint32Array) {
  let out = "";
  for (let i = 0; i < 81; i++) {
    out += `${table[i] ? Math.log2(table[i]) + 1 : "."}${i !== 80 ? " " : ""}`;
    if (i !== 80 && i % 9 === 8) out += "\n";
    else if (i !== 80 && i % 3 === 2) out += "| ";
    if (i !== 80 && ((i + 1) / 9) % 3 === 0) out += "------+-------+------\n";
  }
  console.log(out);
}

export function findMinimumPuzzle(table: Uint32Array) {
  const solution = new Uint32Array(table);
  solve(solution);
  const initPuzzle = table.slice();
  let nMinClues = reduceClues(initPuzzle);
  const queue: Uint32Array[] = [initPuzzle];
  let nIter = 0;
  while (queue.length) {
    nIter += 1;
    const altTable = queue.shift()!;
    console.log(`iteration#${nIter}`, queue.length, nMinClues);
    let nextAltTable = altTable;
    for (let i = 0; i < 81; i++) {
      if (!altTable[i]) continue;
      for (let j = 0; j < 81; j++) {
        if (i === j || altTable[j]) continue;
        const nextTable = new Uint32Array(altTable);
        nextTable[i] = 0;
        nextTable[j] = solution[j];
        if (!checkUnique(nextTable)) continue;
        const nClues = reduceClues(nextTable);
        if (nClues < nMinClues) {
          nextAltTable = nextTable;
          nMinClues = nClues;
        }
      }
    }
    if (nextAltTable !== altTable) {
      queue.push(nextAltTable);
      table.set(nextAltTable);
    }
  }
}
