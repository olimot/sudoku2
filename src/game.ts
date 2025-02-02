import { dig, relLUT, solve } from "./sudoku";

const gameBox = document.body.appendChild(document.createElement("div"));
gameBox.className = "game-box";

const startBox = gameBox.appendChild(document.createElement("div"));
startBox.className = "start-box";

const easierButton = startBox.appendChild(document.createElement("button"));
easierButton.type = "button";
easierButton.className = "easier-button reactive";
easierButton.disabled = true;
easierButton.textContent = "◀";

const startButton = startBox.appendChild(document.createElement("button"));
startButton.type = "button";
startButton.className = "start-button reactive";
startButton.textContent = "Start beginner's sudoku";

const harderButton = startBox.appendChild(document.createElement("button"));
harderButton.type = "button";
harderButton.className = "harder-button reactive";
harderButton.textContent = "▶";

const numCluesBox = gameBox.appendChild(document.createElement("div"));
numCluesBox.className = "num-clues-box";

const timeBox = gameBox.appendChild(document.createElement("div"));
timeBox.className = "time-box";
const timeTextNode = timeBox.appendChild(document.createTextNode("00:00:00"));

const restartButton = timeBox.appendChild(document.createElement("button"));
restartButton.type = "button";
restartButton.className = "restart-button reactive";
restartButton.textContent = "Restart";

const cells: HTMLElement[] = [];
const noteBoxTemplate = Object.assign(document.createElement("span"), {
  className: "note-box",
});
noteBoxTemplate.append(
  ...Array.from(Array(9), (_, i) =>
    Object.assign(document.createElement("sub"), {
      className: `note-${i + 1}`,
    }),
  ),
);
const cellTemplate = document.createElement("span");
cellTemplate.className = "number";

const sudokuBox = gameBox.appendChild(document.createElement("div"));
sudokuBox.className = "sudoku-box";
const sudokuTable = sudokuBox.appendChild(document.createElement("table"));
sudokuTable.className = "sudoku-table";
for (let i = 0; i < 9; i++) {
  const sudokuRow = sudokuTable.appendChild(document.createElement("tr"));
  for (let j = 0; j < 9; j++) {
    const cellTD = sudokuRow.appendChild(document.createElement("td"));
    cellTD.className = "sudoku-cell reactive";
    cellTD.appendChild(noteBoxTemplate.cloneNode(true));
    const cell = cellTD.appendChild(cellTemplate.cloneNode(true));
    cells.push(cell as HTMLElement);
  }
}

const blockBorders = sudokuBox.appendChild(document.createElement("table"));
blockBorders.className = "sudoku-block-borders";
for (let i = 0; i < 3; i++) {
  const row = blockBorders.appendChild(document.createElement("tr"));
  for (let j = 0; j < 3; j++) {
    const cell = row.appendChild(document.createElement("td"));
    cell.className = "sudoku-block-border";
  }
}

const overlayScreen = sudokuBox.appendChild(document.createElement("div"));
overlayScreen.className = "overlay-screen";
overlayScreen.textContent = "Press start button above to play a game!";

const levels: [number, string][] = [
  [50, `beginner's`],
  [36, `easy`],
  [22, `hard`],
  [17, "diabolical"],
];

const state = {
  noteFirst: false,
  ctrlKey: false,
  isNoteMode: false,
  startLevel: 0,
  control: "VIEW",
  startTime: 0,
};

easierButton.addEventListener("click", () => {
  state.startLevel -= 1;
  easierButton.disabled = state.startLevel < 1;
  harderButton.disabled = state.startLevel > 2;
  startButton.textContent = `Start ${levels[state.startLevel][1]} sudoku`;
});

harderButton.addEventListener("click", () => {
  state.startLevel += 1;
  easierButton.disabled = state.startLevel < 1;
  harderButton.disabled = state.startLevel > 2;
  startButton.textContent = `Start ${levels[state.startLevel][1]} sudoku`;
});

const s17res = await fetch(new URL("./sudoku17.txt", import.meta.url));
const s17text = await s17res.text();
const sudoku17s = s17text
  .split("\n")
  .map((line) => Array.from(line, (n) => Number(n)));

let quiz: Uint32Array | undefined;

function updateNumberClassName() {
  const cellsByNums: HTMLElement[][] = Array.from(Array(10), () => []);
  const haveNumsError: boolean[] = Array(10).fill(false);
  const ctrlNum = parseInt(state.control) || 0;
  for (let i = 0; i < 81; i++) {
    const cell = cells[i];
    const num = Number(cell.textContent);
    let isError = false;
    if (num) {
      for (let j = i * 20, e = j + 20; j < e && !isError; j++) {
        isError = num === Number(cells[relLUT[j]].textContent);
      }
      if (isError) haveNumsError[num] = true;
    }
    cellsByNums[num].push(cell);
    const cellTD = cell.parentElement!;
    cellTD.classList.toggle("error", isError);
    cellTD.classList.toggle("in-control", ctrlNum !== 0 && ctrlNum === num);
  }

  const numControls = document.querySelectorAll(".control-button--number");
  for (let i = 0; i < 10; i++) {
    const cellsByNum = cellsByNums[i];
    const isComplete = !haveNumsError[i] && cellsByNum.length === 9;
    const cellComplete = i !== 0 && ctrlNum === i && isComplete;
    for (let j = 0; j < cellsByNum.length; j++) {
      cellsByNum[j].parentElement!.classList.toggle("complete", cellComplete);
    }
    for (let j = 0; j < numControls.length; j++) {
      if (numControls[j].textContent !== `${i}`) continue;
      numControls[j].classList.toggle("complete", isComplete);
      break;
    }
  }
}

function startGame() {
  if (!quiz) return;
  overlayScreen.style.display = "none";
  state.startTime = performance.now();
  document.querySelectorAll(".note").forEach((e) => e.classList.remove("note"));
  let nClues = 0;
  for (let i = 0; i < 81; i++) {
    const cell = cells[i];
    const value = quiz[i] ? Math.log2(quiz[i]) + 1 : "\u00A0";
    cell.textContent = `${value}`;
    cell.className = "number";
    if (!quiz[i]) continue;
    cell.classList.add("number--clue", `number--${value}`);
    nClues++;
  }
  numCluesBox.textContent = `${nClues} clues`;
  updateNumberClassName();
}

restartButton.addEventListener("click", startGame);

startButton.addEventListener("click", () => {
  let minClues = 81;
  const [targetClues] = levels[state.startLevel];
  console.log(targetClues);
  if (targetClues === 17) {
    const s17 = sudoku17s[Math.trunc(sudoku17s.length * Math.random())];
    quiz = new Uint32Array(81);
    for (let i = 0; i < 81; i++) {
      quiz[i] = s17[i] && 1 << (s17[i] - 1);
    }
  } else {
    const genStartTime = performance.now();
    let i = 0;
    for (i = 0; i < 100 && targetClues < minClues; i++) {
      const nextQuiz = new Uint32Array(81);
      solve(nextQuiz);
      dig(nextQuiz, targetClues);
      let nClues = 0;
      for (let j = 0; j < 81; j++) if (nextQuiz[j]) nClues++;
      if (nClues >= minClues) continue;
      minClues = nClues;
      quiz = nextQuiz;
    }
    const t = Math.round(performance.now() - genStartTime);
    console.log(`# of iterations: ${i}, elapsed: ${t} ms`);
  }
  startGame();
});

const updateNoteMode = () => {
  state.isNoteMode = state.noteFirst ? !state.ctrlKey : state.ctrlKey;
  if (state.isNoteMode !== gameBox.classList.contains("note-mode")) {
    gameBox.classList.toggle("note-mode", state.isNoteMode);
  }
};

const toggleNoteMode = () => {
  Object.assign(state, { noteFirst: !state.noteFirst });
  noteModeControl.input.checked = state.noteFirst;
  updateNoteMode();
};

type Control = {
  type: "radio" | "checkbox";
  modifier?: string;
  labelText: string;
  value: string;
  codes: string;
  label: HTMLLabelElement;
  input: HTMLInputElement;
  onChange: ControlHandler;
};

const defaultOnChange = ({ type, input }: Control) => {
  if (type === "radio" && input.checked) toggleNoteMode();
  input.checked = true;
  state.control = input.value;
  updateNumberClassName();
};

const controlBox = gameBox.appendChild(document.createElement("form"));
controlBox.className = "control-box";

const Control = (init: Partial<Control>): Control => {
  const { value = "", labelText = "", type = "radio", modifier } = init;
  const label = controlBox.appendChild(document.createElement("label"));
  label.classList.add("control-button");
  label.classList.add("reactive");
  if (modifier) label.classList.add(`control-button--${modifier}`);
  const input = label.appendChild(document.createElement("input"));
  Object.assign(input, { type, name: `control-${type}`, value });
  label.appendChild(document.createTextNode(labelText));
  const codes = init.codes ?? "";
  const onChange = init.onChange ?? defaultOnChange;
  return { type, labelText, codes, onChange, value, modifier, label, input };
};

type ControlHandler = (control: Control) => void;

const controls: Control[] = [];

for (const value of ["7", "8", "9", "4", "5", "6", "1", "2", "3"]) {
  const numControl = Control({
    type: "radio",
    labelText: value,
    codes: `Digit${value} Numpad${value}`,
    value,
    modifier: "number",
  });
  controls.push(numControl);
}

const clearControl = Control({
  type: "radio",
  labelText: "Clear",
  codes: "KeyC Digit0 Numpad0",
  value: "CLEAR",
  modifier: "clear",
});
controls.push(clearControl);
clearControl.input.checked = true;

const noteModeControl = Control({
  type: "checkbox",
  labelText: "Note",
  codes: "Space Minus NumpadDecimal",
  value: "NOTE",
  onChange() {
    state.noteFirst = !state.noteFirst;
    noteModeControl.input.checked = state.noteFirst;
    updateNoteMode();
  },
});
controls.push(noteModeControl);

requestAnimationFrame(function callback(prev, time = prev) {
  requestAnimationFrame(callback.bind(null, time));
  if (overlayScreen.style.display !== "none") return;
  const elapsed = time - state.startTime;
  const hms = [
    Math.trunc(elapsed / 3600000) % 100,
    Math.trunc(elapsed / 60000) % 60,
    Math.trunc(elapsed / 1000) % 60,
  ];
  const text = hms.map((i) => i.toString().padStart(2, "0")).join(":");
  if (timeTextNode.textContent !== text) timeTextNode.textContent = text;
});

window.addEventListener("keydown", (e) => {
  state.ctrlKey = e.ctrlKey;
  updateNoteMode();
  if (!e.code) return;
  for (const control of controls) {
    if (control.codes.includes(e.code)) {
      e.preventDefault();
      control.label.classList.add("active");
      return;
    }
  }
  console.log("key:", e.key, "code:", e.code);
});

window.addEventListener("keyup", (e) => {
  state.ctrlKey = e.ctrlKey;
  updateNoteMode();
  if (!e.code) return;
  for (const control of controls) {
    if (control.codes.includes(e.code)) {
      e.preventDefault();
      control.label.classList.remove("active");
      control.onChange(control);
      return;
    }
  }
});

window.addEventListener("click", (e) => {
  state.ctrlKey = e.ctrlKey;
  updateNoteMode();
  for (const control of controls) {
    if (control.label === e.target) {
      e.preventDefault();
      control.onChange(control);
      return;
    }
  }

  if (!(e.target instanceof HTMLSpanElement)) return;
  const cell = e.target;
  const index = cells.indexOf(cell);
  const cellTD = cell.parentElement;
  if (index === -1 || cellTD === null) return;
  if (cell.classList.contains("number--clue")) return;

  const prev = cell.textContent;
  let value = prev;
  if (isFinite(parseInt(state.control))) {
    if (state.isNoteMode) {
      cellTD.querySelector(`.note-${state.control}`)?.classList.toggle("note");
    } else {
      value = value === state.control ? "\u00A0" : state.control;
    }
  } else if (state.control === "CLEAR") {
    const isFilled = value !== "\u00A0";
    if (state.isNoteMode !== isFilled) {
      if (state.isNoteMode) {
        const nodeList = cellTD.querySelectorAll(".note");
        nodeList.forEach((it) => it.classList.remove("note"));
      } else {
        value = "\u00a0";
      }
    }
  }

  if (prev !== value) {
    cell.textContent = value;
    if (prev !== "\u00A0") cell.classList.remove(`number--${prev}`);
    if (value !== "\u00A0") cell.classList.add(`number--${value}`);

    updateNumberClassName();

    const nErrors = gameBox.querySelectorAll(".error").length;
    const cellNums = cells.map((it) => Number(it.textContent));
    const nFilled = cellNums.reduce((prev, it) => (it ? prev + 1 : prev), 0);

    if (!nErrors && nFilled === 81) {
      overlayScreen.innerHTML = "";
      const congratText = overlayScreen.appendChild(
        document.createElement("div"),
      );
      congratText.textContent = "Congratulations!";
      const congratTime = overlayScreen.appendChild(
        document.createElement("div"),
      );
      congratTime.textContent = timeTextNode.textContent;
      overlayScreen.removeAttribute("style");
    } else {
      console.log({ nErrors, nFilled });
    }
  }
});

window.addEventListener("pointerdown", (e) => {
  if (!(e.target instanceof HTMLElement)) return;
  const actives: HTMLElement[] = [];
  for (const element of e.composedPath()) {
    if (!(element instanceof HTMLElement)) continue;
    if (!element.classList.contains("reactive")) continue;
    element.classList.add("active");
    actives.push(element);
  }
  const { pointerId } = e;
  const pointerup = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    actives.forEach((it) => it.classList.remove("active"));
    window.removeEventListener("pointerup", pointerup);
  };
  window.addEventListener("pointerup", pointerup);
});

export function toBigInt(x = new ArrayBuffer()) {
  return new Uint8Array(x).reduce((prev, it, i) => {
    return prev | (BigInt(it) << (8n * BigInt(i)));
  }, 0n);
}

export function fromBigInt(n = 0n) {
  const y = [];
  for (let x = BigInt(n); x; x >>= 8n) y.push(Number(x & 255n));
  return new Uint8Array(y).buffer;
}

export function toBase64(arrayBuffer = new ArrayBuffer()) {
  return btoa(String.fromCodePoint(...new Uint8Array(arrayBuffer)));
}

export function fromBase64(text = "") {
  return Uint8Array.from(atob(text), (it) => it.codePointAt(0) || 0).buffer;
}
