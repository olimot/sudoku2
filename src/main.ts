import "./main.css";
import { solve, dig } from "./sudoku";

let quiz = new Uint32Array(81);
let minClues = 81;
let i = 0;
function generate() {
  const theQuiz = i++ ? new Uint32Array(81) : quiz;
  solve(theQuiz);
  dig(theQuiz, 36);
  let nClues = 0;
  for (let i = 0; i < 81; i++) if (theQuiz[i]) nClues++;
  if (nClues >= minClues) return;
  minClues = nClues;
  quiz = theQuiz;
}

for (let j = 0; j < 100; j++) generate();

let out = "";
let clues = 0;
for (let i = 0; i < 81; i++) {
  const value = quiz[i] ? Math.log2(quiz[i]) + 1 : " ";
  if (quiz[i]) clues++;
  if (i % 9 === 8) {
    out += `${value}\n`;
    const row = Math.trunc(i / 9);
    if (row % 9 !== 8 && row % 3 === 2) out += `------+-------+------\n`;
  } else {
    out += `${value} `;
    if (i % 3 === 2) out += "| ";
  }
}

const t = Math.round(performance.now());
console.log(out, `# of clues: ${clues}, # of iter: ${i}, elapsed: ${t} ms`);

const wrapper = document.body.appendChild(document.createElement("div"));
wrapper.className = "wrapper";

const startBox = wrapper.appendChild(document.createElement("div"));
startBox.className = "start-box";

const easierButton = startBox.appendChild(document.createElement("button"));
easierButton.type = "button";
easierButton.className = "easier-button";
easierButton.disabled = true;
easierButton.textContent = "◀";

const startButton = startBox.appendChild(document.createElement("button"));
startButton.type = "button";
startButton.className = "start-button";
startButton.textContent = "Start beginner's sudoku";

const harderButton = startBox.appendChild(document.createElement("button"));
harderButton.type = "button";
harderButton.className = "harder-button";
harderButton.textContent = "▶";

const numCluesBox = wrapper.appendChild(document.createElement("div"));
numCluesBox.className = "num-clues-box";
numCluesBox.textContent = `${minClues} clues`;

const timeBox = wrapper.appendChild(document.createElement("div"));
timeBox.className = "time-box";
const timeTextNode = timeBox.appendChild(document.createTextNode(""));

const restartButton = timeBox.appendChild(document.createElement("button"));
restartButton.type = "button";
restartButton.className = "restart-button";
restartButton.textContent = "RESTART";

const sudokuBox = wrapper.appendChild(document.createElement("div"));
sudokuBox.className = "sudoku-box";

const noteBox = document.createElement("span");
noteBox.className = "note-box";
for (let i = 0; i < 9; i++) {
  const noteNumber = noteBox.appendChild(document.createElement("sub"));
  noteNumber.classList.add(`note-${i + 1}`);
}

const sudokuTable = sudokuBox.appendChild(document.createElement("table"));
sudokuTable.className = "sudoku-table";
for (let i = 0; i < 9; i++) {
  const sudokuRow = sudokuTable.appendChild(document.createElement("tr"));
  for (let j = 0; j < 9; j++) {
    const sudokuNumberBox = sudokuRow.appendChild(document.createElement("td"));
    sudokuNumberBox.className = "sudoku-number-box";
    sudokuNumberBox.appendChild(noteBox.cloneNode(true));
    const cell = sudokuNumberBox.appendChild(document.createElement("span"));
    cell.className = "sudoku-cell sudoku-cell--clue";
    const index = i * 9 + j;
    cell.dataset.sudokuCell = `${index}`;
    const value = quiz[index] ? Math.log2(quiz[index]) + 1 : "\u00A0";
    cell.textContent = `${value}`;
    if (quiz[index]) cell.classList.add(`number-${value}`);
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

const state = {
  noteFirst: false,
  ctrlKey: false,
  isNoteMode: false,
  control: "VIEW",
};

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
  ...[...Array(9).keys()].map((i) =>
    Control({
      type: "radio",
      labelText: `${i + 1}`,
      codes: `Digit${i + 1} Numpad${i + 1}`,
      value: `${i + 1}`,
      modifier: "number",
    }),
  ),
  Control({
    type: "radio",
    labelText: "Clear (c)",
    codes: "KeyC Digit0 Numpad0",
    value: "CLEAR",
    modifier: "clear",
  }),
  Control({
    type: "radio",
    labelText: "View (V)",
    codes: "KeyV Minus NumpadDecimal",
    value: "VIEW",
    onChange: ({ input }: Control) => {
      input.checked = true;
      state.control = input.value;
      wrapper.dataset.control = state.control;
    },
  }),
];

const noteModeControl = Control({
  type: "checkbox",
  labelText: "Note (space)",
  codes: "Space Equal NumpadEnter",
  value: "NOTE",
  onChange: toggleNoteMode,
});
controls.push(noteModeControl);

const timeBegin = performance.now();
const NN = (i = 0) => i.toString().slice(-2).padStart(2, "0");
requestAnimationFrame(function callback(prev, time = prev) {
  requestAnimationFrame(callback.bind(null, time));
  const elapsed = time - timeBegin;
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
  if (e.target.dataset.sudokuCell === undefined) return;
  const index = Number(e.target.dataset.sudokuCell);
  if (quiz[index]) {
    console.log(`Cell#${index} contains`, quiz[index]);
    return;
  }
  const maybeNumber = parseInt(state.control);
  if (isFinite(maybeNumber)) {
    const number = maybeNumber;
    if (state.isNoteMode) {
      e.target.parentElement
        ?.querySelector(`.note-${number}`)
        ?.classList.toggle("note");
    } else {
      e.target.textContent =
        e.target.textContent === state.control ? "\u00A0" : state.control;
    }
  } else if (state.control === "CLEAR") {
    const isFilled = e.target.textContent !== "\u00A0";
    if (state.isNoteMode !== isFilled) {
      if (state.isNoteMode) {
        e.target.parentElement
          ?.querySelectorAll(".note")
          .forEach((e) => e.classList.remove("note"));
      } else {
        e.target.textContent = "\u00a0";
      }
    }
  }

  const isFilled = e.target.textContent !== "\u00A0";
  e.target.className = isFilled
    ? `sudoku-cell number-${e.target.textContent}`
    : "sudoku-cell";
});

window.addEventListener("pointerdown", (e) => {
  if (!(e.target instanceof HTMLLabelElement)) return;
  if (!e.target.classList.contains("control-button")) return;
  const { target, pointerId } = e;
  const pointerup = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    target.classList.remove("control-button--active");
    window.removeEventListener("pointerup", pointerup);
  };
  target.classList.add("control-button--active");
  window.addEventListener("pointerup", pointerup);
});
