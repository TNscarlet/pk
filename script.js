document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("calculateButton").addEventListener("click", calculate);
});

function calculate() {
  clearError();

  const input = getInput();
  const error = validateInput(input);

  if (error) {
    showError(error);
    clearResults();
    return;
  }

  const result = searchBestEV(input);

  if (!hasAnyResult(result)) {
    showError("この条件では配分できません。振り分け合計を確認してください。");
    clearResults();
    return;
  }

  showSummary(input);
  displayResult(result);
}

function getInput() {
  return {
    baseHP: Number(document.getElementById("baseHP").value),
    baseDef: Number(document.getElementById("baseDef").value),
    baseSpDef: Number(document.getElementById("baseSpDef").value),
    totalEV: Number(document.getElementById("totalEV").value),
    nature: getCheckedValue("nature"),
    item: getCheckedValue("item")
  };
}

function getCheckedValue(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : "none";
}

function validateInput(input) {
  if (
    !Number.isFinite(input.baseHP) ||
    !Number.isFinite(input.baseDef) ||
    !Number.isFinite(input.baseSpDef) ||
    input.baseHP <= 0 ||
    input.baseDef <= 0 ||
    input.baseSpDef <= 0
  ) {
    return "HP・防御・特防の種族値をすべて1以上で入力してください。";
  }

  if (
    !Number.isInteger(input.totalEV) ||
    input.totalEV < 0 ||
    input.totalEV > 66
  ) {
    return "振り分け合計は0～66の整数で入力してください。";
  }

  return "";
}

function calcStats(input, hEV, bEV, dEV) {
  const hp = input.baseHP + 75 + hEV;
  let def = input.baseDef + 20 + bEV;
  let spDef = input.baseSpDef + 20 + dEV;

  if (input.nature === "def") {
    def = Math.floor(def * 1.1);
  }

  if (input.nature === "spdef") {
    spDef = Math.floor(spDef * 1.1);
  }

  if (input.item === "vest") {
    spDef = Math.floor(spDef * 1.5);
  }

  if (input.item === "eviolite") {
    def = Math.floor(def * 1.5);
    spDef = Math.floor(spDef * 1.5);
  }

  return { hp, def, spDef };
}

function calcIndexes(stats) {
  const physical = stats.hp * stats.def;
  const special = stats.hp * stats.spDef;
  const total = physical + special;

  return { physical, special, total };
}

function searchBestEV(input) {
  const best = {
    total: { value: -1, rows: [] },
    physical: { value: -1, rows: [] },
    special: { value: -1, rows: [] }
  };

  for (let h = 0; h <= 32; h++) {
    for (let b = 0; b <= 32; b++) {
      for (let d = 0; d <= 32; d++) {
        if (h + b + d !== input.totalEV) {
          continue;
        }

        const stats = calcStats(input, h, b, d);
        const indexes = calcIndexes(stats);

        const row = {
          h,
          b,
          d,
          hp: stats.hp,
          def: stats.def,
          spDef: stats.spDef,
          physical: indexes.physical,
          special: indexes.special,
          total: indexes.total
        };

        updateBest(best.total, indexes.total, row);
        updateBest(best.physical, indexes.physical, row);
        updateBest(best.special, indexes.special, row);
      }
    }
  }

  return best;
}

function updateBest(target, value, row) {
  if (value > target.value) {
    target.value = value;
    target.rows = [row];
    return;
  }

  if (value === target.value) {
    target.rows.push(row);
  }
}

function hasAnyResult(result) {
  return (
    result.total.rows.length > 0 &&
    result.physical.rows.length > 0 &&
    result.special.rows.length > 0
  );
}

function displayResult(result) {
  renderSection("total", result.total.rows, result.total.value);
  renderSection("physical", result.physical.rows, result.physical.value);
  renderSection("special", result.special.rows, result.special.value);
}

function renderSection(type, rows, value) {
  const tableId = `${type}Table`;
  const cardsId = `${type}Cards`;
  const countId = `${type}Count`;

  createTable(tableId, rows, type);
  createCards(cardsId, rows, type);
  setCount(countId, rows.length, value);
}

function createTable(tableId, rows, type) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = "";

  rows.forEach((row) => {
    const tr = document.createElement("tr");

    const cells = [
      row.h,
      row.b,
      row.d,
      row.hp,
      row.def,
      row.spDef
    ];

    if (type === "total") {
      cells.push(formatNumber(row.physical), formatNumber(row.special), formatNumber(row.total));
    } else if (type === "physical") {
      cells.push(formatNumber(row.physical));
    } else {
      cells.push(formatNumber(row.special));
    }

    tr.innerHTML = cells.map((cell) => `<td>${cell}</td>`).join("");
    tbody.appendChild(tr);
  });
}

function createCards(containerId, rows, type) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  rows.forEach((row) => {
    const card = document.createElement("article");
    card.className = "result-card";

    const statRows = [
      ["HP", row.hp],
      ["防御", row.def],
      ["特防", row.spDef]
    ];

    if (type === "total") {
      statRows.push(
        ["物理", formatNumber(row.physical)],
        ["特殊", formatNumber(row.special)],
        ["総合", formatNumber(row.total), "main-value"]
      );
    } else if (type === "physical") {
      statRows.push(["物理", formatNumber(row.physical), "main-value"]);
    } else {
      statRows.push(["特殊", formatNumber(row.special), "main-value"]);
    }

    card.innerHTML = `
      <div class="ev-line">
        <span>H努力値 ${row.h}</span>
        <span>B努力値 ${row.b}</span>
        <span>D努力値 ${row.d}</span>
      </div>
      <dl>
        ${statRows.map(([label, value, className]) => `
          <div class="${className || ""}">
            <dt>${label}</dt>
            <dd>${value}</dd>
          </div>
        `).join("")}
      </dl>
    `;

    container.appendChild(card);
  });
}

function setCount(elementId, count, value) {
  const element = document.getElementById(elementId);
  element.textContent = `最大値：${formatNumber(value)} ／ 同率1位：${count}件`;
}

function showSummary(input) {
  const summary = document.getElementById("conditionSummary");
  summary.hidden = false;

  const items = [
    `H種族値：${input.baseHP}`,
    `B種族値：${input.baseDef}`,
    `D種族値：${input.baseSpDef}`,
    `振り分け合計：${input.totalEV}`,
    `性格補正：${natureLabel(input.nature)}`,
    `アイテム：${itemLabel(input.item)}`
  ];

  summary.innerHTML = items.map((item) => `<span>${item}</span>`).join("");
}

function clearResults() {
  ["total", "physical", "special"].forEach((type) => {
    const tbody = document.querySelector(`#${type}Table tbody`);
    const cards = document.getElementById(`${type}Cards`);
    const count = document.getElementById(`${type}Count`);

    if (tbody) tbody.innerHTML = "";
    if (cards) cards.innerHTML = "";
    if (count) count.textContent = "";
  });

  const summary = document.getElementById("conditionSummary");
  summary.hidden = true;
  summary.innerHTML = "";
}

function showError(message) {
  document.getElementById("errorMessage").textContent = message;
}

function clearError() {
  document.getElementById("errorMessage").textContent = "";
}

function formatNumber(value) {
  return Number(value).toLocaleString("ja-JP");
}

function natureLabel(value) {
  if (value === "def") return "防御↑";
  if (value === "spdef") return "特防↑";
  return "なし";
}

function itemLabel(value) {
  if (value === "vest") return "とつげきチョッキ";
  if (value === "eviolite") return "しんかのきせき";
  return "なし";
}
