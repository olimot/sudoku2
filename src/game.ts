import {
  andNoteBits,
  createGameData,
  fromBase64,
  getInputs,
  getNoteBits,
  getPuzzle,
  getTime,
  orNoteBits,
  setInput,
  setTime,
  toBase64,
} from "./data";
import { generate, relLUT } from "./sudoku";

const gameBox = document.body.appendChild(document.createElement("div"));
gameBox.className = "game-box";

const startBox = gameBox.appendChild(document.createElement("div"));
startBox.className = "start-box";
startBox.dataset.level = "0";

const easierButton = startBox.appendChild(document.createElement("button"));
easierButton.type = "button";
easierButton.className = "easier-button";
easierButton.disabled = true;

const startButton = startBox.appendChild(document.createElement("button"));
startButton.type = "button";
startButton.className = "start-button";

const harderButton = startBox.appendChild(document.createElement("button"));
harderButton.type = "button";
harderButton.className = "harder-button";

const sudokuBox = gameBox.appendChild(document.createElement("div"));
sudokuBox.className = "sudoku-box";

const statBar = sudokuBox.appendChild(document.createElement("div"));
statBar.className = "stat-bar";

const numCluesBox = statBar.appendChild(document.createElement("div"));
numCluesBox.className = "num-clues-box";

const timeBox = statBar.appendChild(document.createElement("div"));
timeBox.className = "time-box";
timeBox.appendChild(document.createTextNode("00:00:00"));

const restartButton = timeBox.appendChild(document.createElement("button"));
restartButton.type = "button";
restartButton.className = "restart-button";
restartButton.textContent = "Restart";

const cells: HTMLElement[] = [];

const sudokuTable = sudokuBox.appendChild(document.createElement("table"));
sudokuTable.className = "sudoku-table";
for (let i = 0; i < 9; i++) {
  const sudokuRow = sudokuTable.appendChild(document.createElement("tr"));
  for (let j = 0; j < 9; j++) {
    const cell = sudokuRow.appendChild(document.createElement("td"));
    cell.className = "button";
    cells.push(cell);
  }
}

const overlay = sudokuBox.appendChild(document.createElement("div"));
overlay.className = "overlay-screen";
overlay.textContent = "Press start button above to play a game!";

const controlBox = gameBox.appendChild(document.createElement("form"));
controlBox.className = "control-box";
controlBox.dataset.value = "0";

for (const value of ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0"]) {
  const button = controlBox.appendChild(document.createElement("button"));
  button.type = "button";
  button.name = "value";
  button.value = value;
  button.textContent = value !== "0" ? value : "Clear";
  if (value !== "0") button.dataset.codes = `Digit${value} Numpad${value}`;
  else button.dataset.codes = `Digit${value} Numpad${value} KeyC`;
  if (value === controlBox.dataset.value) button.className = "selected";
}

const toggleNote = controlBox.appendChild(document.createElement("button"));
toggleNote.type = "button";
toggleNote.name = "toggle-notemode";
toggleNote.textContent = "Toggle note";
toggleNote.dataset.codes = "Space Backquote Minus NumpadDecimal";

function setPuzzle(puzzle: number[]) {
  let nClues = 0;
  for (let i = 0; i < 81; i++) {
    const cell = cells[i];
    const clue = puzzle[i] ? `${puzzle[i]}` : "";
    nClues += puzzle[i] && 1;
    cell.className = "button";
    if (clue) cell.dataset.clue = clue;
    else delete cell.dataset.clue;
  }
  document.querySelector(".num-clues-box")!.textContent = `${nClues} clues`;
}

const getFilled = (it: HTMLElement) =>
  Number(it.dataset.clue ?? it.dataset.value ?? "");

function updateNumberClassName(cells: HTMLElement[], control: number) {
  const cellsByFilled: HTMLElement[][] = Array.from(Array(10), () => []);
  const isErrorByFilled: boolean[] = Array(10).fill(false);
  for (let i = 0; i < 81; i++) {
    const cell = cells[i];
    const filled = getFilled(cell);
    let isError = false;
    for (let j = i * 20, e = j + 20; filled && j < e && !isError; j++) {
      isError = filled === getFilled(cells[relLUT[j]]);
    }
    if (isError) isErrorByFilled[filled] = true;
    cellsByFilled[filled].push(cell);
    cell.classList.toggle("error", isError);
    cell.classList.toggle("in-control", control !== 0 && control === filled);
  }

  for (let i = 0; i < 10; i++) {
    const cells = cellsByFilled[i];
    const isComplete = i > 0 && !isErrorByFilled[i] && cells.length === 9;
    const shouldHighlight = control === i && isComplete;
    for (const it of cells) it.classList.toggle("complete", shouldHighlight);
    const button = document.querySelector(`.control-box button[value="${i}"]`);
    button?.classList.toggle("complete", isComplete);
    button?.classList.toggle("selected", control === i);
  }
}

function getDurationText(elapsed: number) {
  const hms = [
    Math.trunc(elapsed / 3600000) % 100,
    Math.trunc(elapsed / 60000) % 60,
    Math.trunc(elapsed / 1000) % 60,
  ];
  return hms.map((i) => i.toString().padStart(2, "0")).join(":");
}

function checkComplete() {
  const nErrors = document.querySelectorAll(".sudoku-table .error").length;
  const filled = cells.map(getFilled);
  const nFilled = filled.reduce((prev, it) => prev + (it && 1), 0);
  if (!nErrors && nFilled === 81) {
    const sudokuBox = document.querySelector(".sudoku-box")!;
    const overlay = sudokuBox.appendChild(document.createElement("div"));
    overlay.className = "overlay-screen";
    const congratText = overlay.appendChild(document.createElement("div"));
    congratText.textContent = "Congratulations!";
    const congratTime = overlay.appendChild(document.createElement("div"));
    const timeBox = document.querySelector<HTMLElement>(".time-box")!;
    const timeTextNode = timeBox.childNodes[0];
    congratTime.textContent = timeTextNode.textContent;
    delete timeBox.dataset.startTime;
  }
}

function resumeGame() {
  const url = new URL(location.href);
  const data = fromBase64(url.searchParams.get("data"));
  if (!data.length) return;
  setPuzzle(getPuzzle(data));
  const elapsed = getTime(data);
  timeBox.dataset.startTime = `${performance.now() - elapsed}`;
  timeBox.childNodes[0].textContent = getDurationText(elapsed);
  const inputs = getInputs(data);
  const noteBits = getNoteBits(data);
  const cells = [...document.querySelectorAll<HTMLElement>(".sudoku-table td")];
  const notes = document.querySelectorAll(".sudoku-table span");
  notes.forEach((it) => it.remove());
  for (let i = 0; i < 81; i++) {
    const cell = cells[i];
    if (!inputs[i]) delete cell.dataset.value;
    else cell.dataset.value = `${inputs[i]}`;
    if (!noteBits[i]) continue;
    for (let j = 0; j < 9; j++) {
      if (!(noteBits[i] & (1 << j))) continue;
      const noteSub = cell.appendChild(document.createElement("span"));
      noteSub.dataset.value = `${j + 1}`;
    }
  }
  const controlBox = document.querySelector<HTMLElement>(".control-box")!;
  const control = Number(controlBox.dataset.value);
  updateNumberClassName(cells, control);
  document.querySelector(".overlay-screen")?.remove();
  checkComplete();
}

function setGameURL(fn: (data: Uint8Array) => void) {
  const url = new URL(location.href);
  const data = fromBase64(url.searchParams.get("data"));
  fn(data);
  setTime(data, performance.now() - Number(timeBox.dataset.startTime));
  url.searchParams.set("data", toBase64(data));
  history.replaceState(null, "", url);
}

function startGame(cells: HTMLElement[], control: number) {
  if (!document.querySelectorAll("[data-clue]").length) return;
  const timeBox = document.querySelector<HTMLElement>(".time-box")!;
  timeBox.dataset.startTime = `${performance.now()}`;
  const notes = document.querySelectorAll(".sudoku-table span");
  notes.forEach((it) => it.remove());
  cells.forEach((it) => delete it.dataset.value);
  const puzzle = cells.map((it) => Number(it.dataset.clue ?? 0));
  const data = createGameData(puzzle);
  const url = new URL(location.href);
  url.searchParams.set("data", toBase64(data));
  history.replaceState(null, "", url);
  updateNumberClassName(cells, control);
  document.querySelector(".overlay-screen")?.remove();
}

const getButtonByCode = <T extends Element>(code: string) =>
  code ? document.querySelector<T>(`[data-codes~=${code}]`) : null;

resumeGame();

requestAnimationFrame(function callback(prev, time = prev) {
  requestAnimationFrame(callback.bind(null, time));
  const timeBox = document.querySelector<HTMLElement>(".time-box")!;
  const timeTextNode = timeBox.childNodes[0];
  if (!("startTime" in timeBox.dataset)) return;
  const text = getDurationText(time - Number(timeBox.dataset.startTime));
  if (timeTextNode.textContent !== text) timeTextNode.textContent = text;
});

window.addEventListener("click", (e) => {
  if (!(e.target instanceof HTMLElement)) return;
  const startBox = document.querySelector<HTMLElement>(".start-box")!;
  const easier = document.querySelector<HTMLButtonElement>(".easier-button")!;
  const harder = document.querySelector<HTMLButtonElement>(".harder-button")!;
  const cells = [...document.querySelectorAll<HTMLElement>(".sudoku-table td")];
  const controlBox = document.querySelector<HTMLElement>(".control-box")!;
  const isNoteMode = "note" in controlBox.dataset;
  const control = Number(controlBox.dataset.value);

  if (e.target === easier || e.target === harder) {
    const dLevel = e.target === easier ? -1 : 1;
    const level = Number(startBox.dataset.level) + dLevel;
    startBox.dataset.level = `${level}`;
    easier.disabled = level < 1;
    harder.disabled = level > 2;
    return;
  }

  let startP: Promise<void> | undefined;
  if (e.target.classList.contains("restart-button")) {
    startP = Promise.resolve();
  } else if (e.target.classList.contains("start-button")) {
    const level = [50, 36, 21, 17][Number(startBox.dataset.level)];
    startP = generate(level).then(setPuzzle);
  }
  if (startP) return startP.then(startGame.bind(null, cells, control));

  if (e.target.parentElement === controlBox) {
    e.preventDefault();
    switch ((e.target as HTMLButtonElement).name) {
      case "value":
        controlBox.dataset.value = (e.target as HTMLButtonElement).value;
        updateNumberClassName(cells, Number(controlBox.dataset.value));
        break;
      case "toggle-notemode":
        if (isNoteMode) delete controlBox.dataset.note;
        else controlBox.dataset.note = "";
        break;
    }
    return;
  }

  const cell = e.target;
  const index = cells.indexOf(cell);
  if (index === -1 || "clue" in cell.dataset) return;

  const prev = cell.dataset.value;
  if (!control && isNoteMode === !prev) {
    if (!isNoteMode) {
      delete cell.dataset.value;
      setGameURL((data) => setInput(data, index, 0));
    } else {
      cell.querySelectorAll("span").forEach((it) => it.remove());
      setGameURL((data) => andNoteBits(data, index, 0));
    }
  } else if (isNoteMode && !prev) {
    const prevNoteSub = cell.querySelector(`[data-value="${control}"]`);
    if (prevNoteSub) {
      prevNoteSub.remove();
      setGameURL((data) => andNoteBits(data, index, ~(1 << (control - 1))));
    } else {
      const noteSub = cell.appendChild(document.createElement("span"));
      noteSub.dataset.value = `${control}`;
      setGameURL((data) => orNoteBits(data, index, 1 << (control - 1)));
    }
  } else if (control && !isNoteMode) {
    if (prev === `${control}`) {
      delete cell.dataset.value;
      setGameURL((data) => setInput(data, index, 0));
    } else {
      cell.dataset.value = `${control}`;
      setGameURL((data) => setInput(data, index, control));
    }
  }

  if (prev === cell.dataset.value) return;
  updateNumberClassName(cells, control);
  checkComplete();
});

window.addEventListener("pointerdown", (e) => {
  const actives: Element[] = [];
  for (const it of e.composedPath()) {
    if (!(it instanceof Element)) continue;
    if (it instanceof HTMLButtonElement || it.classList.contains("button")) {
      it.classList.add("active");
      actives.push(it);
    }
  }
  if (!actives.length) return;
  const { pointerId } = e;
  const pointerup = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    actives.forEach((it) => it.classList.remove("active"));
    window.removeEventListener("pointerup", pointerup);
  };
  window.addEventListener("pointerup", pointerup);
});

window.addEventListener("keydown", (e) => {
  const button = getButtonByCode<HTMLButtonElement>(e.code);
  if (!button) return;
  e.preventDefault();
  button.classList.add("active");
});

window.addEventListener("keyup", (e) => {
  const button = getButtonByCode<HTMLButtonElement>(e.code);
  if (!button) return;
  e.preventDefault();
  button.classList.remove("active");
  button.click?.();
});
