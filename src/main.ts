import "./main.css";
import { solve, dig, relLUT } from "./sudoku";

const wrapper = document.body.appendChild(document.createElement("div"));
wrapper.className = "wrapper";

const startBox = wrapper.appendChild(document.createElement("div"));
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

const numCluesBox = wrapper.appendChild(document.createElement("div"));
numCluesBox.className = "num-clues-box";

const timeBox = wrapper.appendChild(document.createElement("div"));
timeBox.className = "time-box";
const timeTextNode = timeBox.appendChild(document.createTextNode("00:00:00"));

const restartButton = timeBox.appendChild(document.createElement("button"));
restartButton.type = "button";
restartButton.className = "restart-button";
restartButton.textContent = "RESTART";

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
cellTemplate.classList.add("sudoku-cell");
cellTemplate.classList.add("reactive");

const sudokuBox = wrapper.appendChild(document.createElement("div"));
sudokuBox.className = "sudoku-box";
const sudokuTable = sudokuBox.appendChild(document.createElement("table"));
sudokuTable.className = "sudoku-table";
for (let i = 0; i < 9; i++) {
  const sudokuRow = sudokuTable.appendChild(document.createElement("tr"));
  for (let j = 0; j < 9; j++) {
    const box = sudokuRow.appendChild(document.createElement("td"));
    box.appendChild(noteBoxTemplate.cloneNode(true));
    const cell = box.appendChild(cellTemplate.cloneNode(true)) as HTMLElement;
    cells.push(cell);
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
  timeBegin: 0,
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

let quiz = new Uint32Array(81);

startButton.addEventListener("click", () => {
  let minClues = 81;
  let i = 0;
  for (let j = 0; j < 100; j++) {
    const theQuiz = i++ ? new Uint32Array(81) : quiz;
    solve(theQuiz);
    dig(theQuiz, 0);
    let nClues = 0;
    for (let i = 0; i < 81; i++) if (theQuiz[i]) nClues++;
    if (nClues >= minClues) continue;
    minClues = nClues;
    quiz = theQuiz;
  }
  state.timeBegin = performance.now();
  const t = Math.round(state.timeBegin);
  console.log(`# of iterations: ${i}, elapsed: ${t} ms`);

  // const s17res = await fetch(new URL("./sudoku17.txt", import.meta.url));
  // const s17text = await s17res.text();
  // const sudoku17s = s17text
  //   .split("\n")
  //   .map((line) => Array.from(line, (n) => Number(n)));
  // console.log(sudoku17s[0]);

  overlayScreen.style.display = "none";
  document.querySelectorAll(".note").forEach((e) => e.classList.remove("note"));
  let nClues = 0;
  for (let i = 0; i < 81; i++) {
    const cell = cells[i];
    const value = quiz[i] ? Math.log2(quiz[i]) + 1 : "\u00A0";
    cell.textContent = `${value}`;
    if (!quiz[i]) continue;
    cell.classList.add("sudoku-cell--clue", `number-${value}`);
    nClues++;
  }
  numCluesBox.textContent = `${nClues} clues`;
});

const updateNoteMode = () => {
  state.isNoteMode = state.noteFirst ? !state.ctrlKey : state.ctrlKey;
  if (state.isNoteMode !== wrapper.classList.contains("note-mode")) {
    wrapper.classList.toggle("note-mode", state.isNoteMode);
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
  wrapper.dataset.control = state.control;
};

const controlBox = wrapper.appendChild(document.createElement("form"));
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

const controls: Control[] = [
  ...Array.from(Array(9), (_, i) =>
    Control({
      type: "radio",
      labelText: `${i + 1}`,
      codes: `Digit${i + 1} Numpad${i + 1}`,
      value: `${i + 1}`,
      modifier: "number",
    }),
  ),
];

const clearControl = Control({
  type: "radio",
  labelText: "Clear (c)",
  codes: "KeyC Digit0 Numpad0",
  value: "CLEAR",
  modifier: "clear",
});
controls.push(clearControl);

const viewControl = Control({
  type: "radio",
  labelText: "View (V)",
  codes: "KeyV Minus NumpadDecimal",
  value: "VIEW",
  onChange: ({ input }: Control) => {
    input.checked = true;
    state.control = input.value;
    wrapper.dataset.control = state.control;
  },
});
viewControl.input.checked = true;
controls.push(viewControl);

const noteModeControl = Control({
  type: "checkbox",
  labelText: "Note (space)",
  codes: "Space Equal NumpadEnter",
  value: "NOTE",
  onChange: toggleNoteMode,
});
controls.push(noteModeControl);

const NN = (i = 0) => i.toString().slice(-2).padStart(2, "0");
requestAnimationFrame(function callback(prev, time = prev) {
  requestAnimationFrame(callback.bind(null, time));
  if (state.timeBegin === 0) return;
  const elapsed = time - state.timeBegin;
  const seconds = Math.trunc(elapsed / 1000) % 60;
  const minutes = Math.trunc(elapsed / 60000) % 60;
  const hours = Math.trunc(elapsed / 3600000) % 100;
  const text = `${NN(hours)}:${NN(minutes)}:${NN(seconds)}`;
  if (timeTextNode.textContent !== text) timeTextNode.textContent = text;
});

window.addEventListener("keydown", (e) => {
  state.ctrlKey = e.ctrlKey;
  updateNoteMode();
  for (const control of controls) {
    if (control.codes.includes(e.code)) {
      control.label.classList.add("control-button--active");
      return;
    }
  }
  console.log("key:", e.key, "code:", e.code);
});

window.addEventListener("keyup", (e) => {
  state.ctrlKey = e.ctrlKey;
  updateNoteMode();
  for (const control of controls) {
    if (control.codes.includes(e.code)) {
      control.label.classList.remove("control-button--active");
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
      control.onChange(control);
      return;
    }
  }
});

window.addEventListener("click", (e) => {
  state.ctrlKey = e.ctrlKey;
  updateNoteMode();
  if (!(e.target instanceof HTMLSpanElement)) return;
  const index = cells.indexOf(e.target);
  if (index === -1) return;
  const cell = e.target;
  const cellBox = cell.parentElement;
  if (cellBox === null) return;
  if (quiz[index]) {
    console.log(`Cell#${index} contains`, quiz[index]);
    return;
  }

  const prev = cell.textContent;
  let value = prev;
  const maybeNumber = parseInt(state.control);
  if (isFinite(maybeNumber)) {
    const number = maybeNumber;
    if (state.isNoteMode) {
      const node = cellBox.querySelector(`.note-${number}`);
      node?.classList.toggle("note");
    } else {
      value = value === state.control ? "\u00A0" : state.control;
    }
  } else if (state.control === "CLEAR") {
    const isFilled = value !== "\u00A0";
    if (state.isNoteMode !== isFilled) {
      if (state.isNoteMode) {
        const nodeList = cellBox.querySelectorAll(".note");
        nodeList?.forEach((e) => e.classList.remove("note"));
      } else {
        value = "\u00a0";
      }
    }
  }

  if (prev !== value) {
    cell.textContent = value;
    if (prev !== "\u00A0") cell.classList.remove(`number-${prev}`);
    if (value !== "\u00A0") cell.classList.add(`number-${value}`);
    const cnt = Array.from(Array(3), () => Array.from(Array(10)).fill(0));
    const num = Number(cell.textContent);

    const row = Math.trunc(index / 9);
    const col = index % 9;
    const block = Math.trunc(row / 3) * 3 + Math.trunc(col / 3);

    for (let i = 0; i < 9; i++) {
      cnt[0][Number(cells[row * 9 + i].textContent)]++;
    }

    for (let i = 0; i < 9; i++) {
      cnt[1][Number(cells[i * 9 + col].textContent)]++;
    }

    const blockOffset = 9 * 3 * Math.trunc(block / 3) + 3 * (block % 3);
    for (let i = 0; i < 9; i++) {
      const index = blockOffset + 9 * Math.trunc(i / 3) + (i % 3);
      cnt[2][Number(cells[index].textContent)]++;
    }

    for (let j = index * 20, e = j + 20; j < e; j++) {
      const refCell = cells[relLUT[j]];
      const num = Number(refCell.textContent);
      const multioccur = cnt[0][num] > 1 || cnt[1][num] > 1 || cnt[2][num] > 1;
      refCell.classList.toggle("error", num > 0 && multioccur);
    }

    const multioccur = cnt[0][num] > 1 || cnt[1][num] > 1 || cnt[2][num] > 1;
    cell.classList.toggle("error", num > 0 && multioccur);

    const nErrors = wrapper.querySelectorAll(".error").length;
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
  if (!e.target.classList.contains("reactive")) return;
  const { target, pointerId } = e;
  const pointerup = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    target.classList.remove("active");
    window.removeEventListener("pointerup", pointerup);
  };
  target.classList.add("active");
  window.addEventListener("pointerup", pointerup);
});
