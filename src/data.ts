export type GameData = {
  puzzle: Uint8Array;
  input: Uint8Array;
  notes: Uint32Array;
  time: number;
};

export function unpackSudokuTable(src: Uint8Array<ArrayBufferLike>) {
  const tableNumber = src.reduce((prev, it, i) => {
    return prev | (BigInt(it) << (8n * BigInt(i)));
  }, 0n);
  return Array.from(tableNumber.toString(10).padStart(81, "0"), Number);
}

export function packSudokuTable(
  dst: Uint8Array<ArrayBufferLike>,
  table: number[],
  offset = 0,
) {
  let x = BigInt(table.join(""));
  for (let i = 0; i < 34; i++) {
    dst[offset + i] = Number(x & 255n);
    x >>= 8n;
  }
  return dst;
}

export const fromBase64 = (text: string | undefined | null) => {
  if (!text) return new Uint8Array();
  const b64 = text.replace(/\./g, "+").replace(/_/g, "/").replace(/-/g, "=");
  return Uint8Array.from(atob(b64), (it) => it.codePointAt(0) || 0);
};

export const toBase64 = (bytes: Uint8Array<ArrayBufferLike>) =>
  btoa(String.fromCodePoint(...bytes))
    .replace(/\+/g, ".")
    .replace(/\//g, "_")
    .replace(/=/g, "-");

export const toHex = (bytes: Uint8Array<ArrayBufferLike>) =>
  bytes.reduce((prev, it) => `${prev} ${it.toString(16).padStart(2, "0")}`, "");

export function createGameData(puzzle: number[]) {
  return packSudokuTable(new Uint8Array(238), puzzle);
}

export function getPuzzle(bytes: Uint8Array<ArrayBufferLike>) {
  return unpackSudokuTable(bytes.subarray(0, 34));
}

export function getInputs(bytes: Uint8Array<ArrayBufferLike>) {
  return unpackSudokuTable(bytes.subarray(42, 76));
}

export function getNoteBits(bytes: Uint8Array<ArrayBufferLike>) {
  return new Uint16Array(bytes.buffer, 76, 81);
}

export function getTime(bytes: Uint8Array<ArrayBufferLike>) {
  return new DataView(bytes.buffer).getFloat64(34, true);
}

export function setInput(
  bytes: Uint8Array<ArrayBufferLike>,
  cellIndex = 0,
  value = 0,
) {
  const inputs = unpackSudokuTable(bytes.subarray(42, 76));
  inputs[cellIndex] = value;
  packSudokuTable(bytes, inputs, 42);
  return bytes;
}

export function orNoteBits(
  bytes: Uint8Array<ArrayBufferLike>,
  cellIndex = 0,
  value = 0,
) {
  const notes = new Uint16Array(bytes.buffer, 76, 81);
  notes[cellIndex] |= value;
  return bytes;
}

export function andNoteBits(
  bytes: Uint8Array<ArrayBufferLike>,
  cellIndex = 0,
  value = 0,
) {
  const notes = new Uint16Array(bytes.buffer, 76, 81);
  notes[cellIndex] &= value;
  return bytes;
}

export function setTime(bytes: Uint8Array<ArrayBufferLike>, time = 0) {
  return new DataView(bytes.buffer).setFloat64(34, time, true);
}
