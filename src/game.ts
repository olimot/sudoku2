import { generate, relLUT } from "./sudoku";

const gameBox = document.body.appendChild(document.createElement("div"));
gameBox.className = "game-box";

const startBox = gameBox.appendChild(document.createElement("div"));
startBox.className = "start-box";

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
const timeTextNode = timeBox.appendChild(document.createTextNode("00:00:00"));

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

startBox.dataset.level = "0";

function changeLevel(dLevel = 0) {
  const level = Number(startBox.dataset.level) + dLevel;
  startBox.dataset.level = `${level}`;
  easierButton.disabled = level < 1;
  harderButton.disabled = level > 2;
}

easierButton.addEventListener("click", () => changeLevel(-1));
harderButton.addEventListener("click", () => changeLevel(+1));

const getFilled = (it: HTMLElement) =>
  Number(it.dataset.clue ?? it.dataset.value ?? "");

function updateNumberClassName() {
  const cellsByFilled: HTMLElement[][] = Array.from(Array(10), () => []);
  const isErrorByFilled: boolean[] = Array(10).fill(false);
  const control = parseInt(controlBox.dataset.control ?? "");
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
    const button = document.querySelector(`.control-button[value="${i}"]`);
    button?.classList.toggle("complete", isComplete);
    button?.classList.toggle("selected", control === i);
  }
}

function startGame() {
  if (!document.querySelectorAll("[data-clue]").length) return;
  overlay.style.display = "none";
  timeBox.dataset.startTime = `${performance.now()}`;
  document.querySelectorAll(".sudoku-table span").forEach((it) => it.remove());
  for (const it of cells) delete it.dataset.value;
  updateNumberClassName();
}

restartButton.addEventListener("click", startGame);

startButton.addEventListener("click", async () => {
  const levels = [50, 36, 21, 17];
  const puzzle = await generate(levels[Number(startBox.dataset.level)]);

  let nClues = 0;
  for (let i = 0; i < 81; i++) {
    const cell = cells[i];
    const clue = puzzle[i] ? `${puzzle[i]}` : "";
    nClues += puzzle[i] && 1;
    cell.className = "button";
    if (clue) cell.dataset.clue = clue;
    else delete cell.dataset.clue;
  }
  numCluesBox.textContent = `${nClues} clues`;

  startGame();
});

const controlBox = gameBox.appendChild(document.createElement("form"));
controlBox.className = "control-box";
const toggleNoteMode = () => {
  if ("note" in controlBox.dataset) delete controlBox.dataset.note;
  else controlBox.dataset.note = "";
};
const onValueControlClick = (value: string) => {
  controlBox.dataset.control = value;
  updateNumberClassName();
};
onValueControlClick("0");

for (const value of ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0"]) {
  const button = controlBox.appendChild(document.createElement("button"));
  button.type = "button";
  button.className = `control-button button${value === "0" ? " selected" : ""}`;
  button.name = "value";
  button.value = value;
  button.textContent = value !== "0" ? value : "Clear";
  button.addEventListener("click", onValueControlClick.bind(null, value));
  if (value !== "0") button.dataset.codes = `Digit${value} Numpad${value}`;
  else button.dataset.codes = `Digit${value} Numpad${value} KeyC`;
}

const toggleNote = controlBox.appendChild(document.createElement("button"));
toggleNote.type = "button";
toggleNote.className = `control-button button`;
toggleNote.name = "toggle-note";
toggleNote.textContent = "Toggle note";
toggleNote.addEventListener("click", toggleNoteMode);
toggleNote.dataset.codes = "Space Backquote Minus NumpadDecimal";

requestAnimationFrame(function callback(prev, time = prev) {
  requestAnimationFrame(callback.bind(null, time));
  if (!("startTime" in timeBox.dataset)) return;
  const elapsed = time - Number(timeBox.dataset.startTime);
  const hms = [
    Math.trunc(elapsed / 3600000) % 100,
    Math.trunc(elapsed / 60000) % 60,
    Math.trunc(elapsed / 1000) % 60,
  ];
  const text = hms.map((i) => i.toString().padStart(2, "0")).join(":");
  if (timeTextNode.textContent !== text) timeTextNode.textContent = text;
});

window.addEventListener("keydown", (e) => {
  if (!e.code) return;
  for (const control of document.querySelectorAll(".button[data-codes]")) {
    if (!(control as HTMLElement).dataset.codes?.includes(e.code)) continue;
    e.preventDefault();
    control.classList.add("active");
    return;
  }
  console.log("key:", e.key, "code:", e.code);
});

window.addEventListener("keyup", (e) => {
  if (!e.code) return;
  for (const control of document.querySelectorAll(".button[data-codes]")) {
    if (!(control as HTMLElement).dataset.codes?.includes(e.code)) continue;
    e.preventDefault();
    control.classList.remove("active");
    (control as HTMLButtonElement).click?.();
    return;
  }
});

window.addEventListener("click", (e) => {
  if (!(e.target instanceof HTMLElement)) return;
  const cell = e.target;
  const index = cells.indexOf(cell);
  if (index === -1 || "clue" in cell.dataset) return;

  const prev = Number(cell.dataset.value ?? "");
  let value = prev;
  const isNoteMode = "note" in controlBox.dataset;
  const control = parseInt(controlBox.dataset.control ?? "");
  if (isFinite(control)) {
    if (!control && isNoteMode === !prev) {
      if (!isNoteMode) value = 0;
      else cell.querySelectorAll("span").forEach((it) => it.remove());
    } else if (isNoteMode && !prev) {
      const prevNoteSub = cell.querySelector(`[data-value="${control}"]`);
      if (prevNoteSub) {
        prevNoteSub.remove();
      } else {
        const noteSub = cell.appendChild(document.createElement("span"));
        noteSub.dataset.value = `${control}`;
      }
    } else if (!isNoteMode) {
      value = prev === control ? 0 : control;
    }
  }

  if (prev !== value) {
    if (value) cell.dataset.value = `${value}`;
    else delete cell.dataset.value;

    updateNumberClassName();

    const nErrors = gameBox.querySelectorAll(".error").length;
    const filled = cells.map(getFilled);
    const nFilled = filled.reduce((prev, it) => prev + (it && 1), 0);
    if (!nErrors && nFilled === 81) {
      overlay.innerHTML = "";
      const congratText = overlay.appendChild(document.createElement("div"));
      congratText.textContent = "Congratulations!";
      const congratTime = overlay.appendChild(document.createElement("div"));
      congratTime.textContent = timeTextNode.textContent;
      delete timeBox.dataset.startTime;
      overlay.removeAttribute("style");
    }
  }
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
