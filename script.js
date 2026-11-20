let players = [];
let rounds = [];
let currentPhase = "setup";
let currentRound = 0;
let currentPlayer = 0;

const $ = id => document.getElementById(id);

function saveData() {
  localStorage.setItem("gameSettlementData", JSON.stringify({
    players,
    rounds,
    currentPhase,
    currentRound,
    currentPlayer
  }));
}

function loadData() {
  const saved = localStorage.getItem("gameSettlementData");
  if (!saved) return;

  try {
    const data = JSON.parse(saved);
    players = data.players || [];
    rounds = data.rounds || [];
    currentPhase = data.currentPhase || "setup";
    currentRound = data.currentRound || 0;
    currentPlayer = data.currentPlayer || 0;

    renderPlayerList();

    if (currentPhase !== "setup") {
      $("gameSection").classList.remove("hidden");
      renderCurrentPhase();
      renderTable();
    }
  } catch (error) {
    localStorage.removeItem("gameSettlementData");
  }
}

function addPlayer() {
  const name = $("playerName").value.trim();

  if (!name) return alert("참가자 이름을 입력해주세요.");
  if (players.includes(name)) return alert("이미 등록된 이름입니다.");

  players.push(name);
  $("playerName").value = "";

  renderPlayerList();
  saveData();
}

function renderPlayerList() {
  $("playerList").innerHTML = "";

  players.forEach(name => {
    const tag = document.createElement("span");
    tag.className = "player-tag";
    tag.textContent = name;
    $("playerList").appendChild(tag);
  });
}

function startGame() {
  const count = Number($("totalRounds").value);

  if (players.length < 2) {
    return alert("참가자를 2명 이상 등록해주세요.");
  }

  if (!Number.isInteger(count) || count < 1 || count > 200) {
    return alert("라운드 수는 1~200 사이로 입력해주세요.");
  }

  if (!confirm(`${count}라운드 게임을 시작할까요?`)) return;

  rounds = Array.from({ length: count }, () => ({
    winner: null,
    payments: {}
  }));

  currentPhase = "winner";
  currentRound = 0;
  currentPlayer = 0;

  $("gameSection").classList.remove("hidden");
  $("finalResult").classList.add("hidden");

  saveData();
  renderCurrentPhase();
  renderTable();

  $("gameSection").scrollIntoView({ behavior: "smooth" });
}

// 1등 선택: 참가자 버튼을 누르면 즉시 다음 라운드
function chooseWinner(playerIndex) {
  const round = rounds[currentRound];

  if (round.winner !== playerIndex) {
    round.winner = playerIndex;
    round.payments = {};
  }

  currentRound++;

  if (currentRound >= rounds.length) {
    currentPhase = "payment";
    currentPlayer = 0;
    currentRound = 0;
  }

  saveData();
  renderCurrentPhase();
  renderTable();
}

function renderWinnerPhase() {
  $("phaseTitle").textContent = "1등 선택";
  $("phaseDescription").textContent =
    "각 라운드의 1등을 참가자 이름 버튼으로 선택하세요. 누르면 자동으로 다음 라운드로 이동합니다.";

  $("progressText").textContent =
    `${currentRound + 1} / ${rounds.length} 라운드`;

  const round = rounds[currentRound];

  $("roundArea").innerHTML = `
    <div class="round-card">
      <div class="round-title">${currentRound + 1}라운드 - 1등은 누구인가요?</div>
      <div class="player-buttons" id="winnerButtons"></div>
    </div>
    <div class="navigation">
      <button id="prevWinnerBtn" class="secondary">이전 라운드</button>
    </div>
  `;

  players.forEach((name, index) => {
    const button = document.createElement("button");
    button.className = "player-button";
    button.textContent = name;

    button.addEventListener("click", () => chooseWinner(index));

    $("winnerButtons").appendChild(button);
  });

  $("prevWinnerBtn").disabled = currentRound === 0;
  $("prevWinnerBtn").addEventListener("click", () => {
    currentRound--;
    renderCurrentPhase();
  });
}

// 현재 참가자에게 모든 라운드를 입력받는 방식
function renderPaymentPhase() {
  if (currentPlayer >= players.length) {
    currentPhase = "finished";
    saveData();
    renderFinalResult();
    renderTable();
    return;
  }

  const playerName = players[currentPlayer];

  $("phaseTitle").textContent = "개인별 금액 입력";
  $("phaseDescription").textContent =
    `${playerName}님의 모든 라운드 지불 금액을 입력하세요. 입력을 마치면 다음 참가자로 넘어갑니다.`;

  $("progressText").textContent =
    `${currentPlayer + 1} / ${players.length} 명`;

  let html = "";

  rounds.forEach((round, index) => {
    const isWinner = round.winner === currentPlayer;

    html += `
      <div class="round-card">
        <div class="round-title">
          ${index + 1}라운드
          ${isWinner ? " · 🏆 본인 1등" : ""}
        </div>
    `;

    if (round.winner === null) {
      html += `<p class="muted">아직 1등이 선택되지 않았습니다.</p>`;
    } else if (isWinner) {
      html += `<p class="muted">1등이므로 금액을 입력하지 않습니다.</p>`;
    } else {
      const value = round.payments[currentPlayer] ?? "";

      html += `
        <div class="payment-row">
          <span>${players[round.winner]}에게</span>
          <input
            type="number"
            min="0"
            step="1"
            class="payment-input"
            data-round="${index}"
            value="${value}"
            placeholder="지불 금액"
          >
          <button class="d-button" data-dround="${index}">D</button>
        </div>
      `;
    }

    html += `</div>`;
  });

  html += `
    <div class="navigation">
      <button id="prevPlayerBtn" class="secondary">이전 사람</button>
      <button id="nextPlayerBtn" class="primary">다음 사람</button>
    </div>
  `;

  $("roundArea").innerHTML = html;

  document.querySelectorAll(".payment-input").forEach(input => {
    input.addEventListener("input", () => {
      const roundIndex = Number(input.dataset.round);
      const value = input.value;

      if (value === "") {
        delete rounds[roundIndex].payments[currentPlayer];
      } else {
        const amount = Number(value);

        if (!Number.isFinite(amount) || amount < 0) {
          input.setCustomValidity("0 이상의 금액을 입력해주세요.");
          return;
        }

        input.setCustomValidity("");
        rounds[roundIndex].payments[currentPlayer] = amount;
      }

      saveData();
      renderTable();
    });
  });

    const inputs = Array.from(document.querySelectorAll(".payment-input"));

  inputs.forEach((input, idx) => {
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        const nextInput = inputs[idx + 1];
        if (nextInput) {
          nextInput.focus();
          nextInput.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          input.blur();
          $("nextPlayerBtn").scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    });
  });


  document.querySelectorAll("[data-dround]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.dround);
      rounds[index].payments[currentPlayer] = 100;
      saveData();
      renderPaymentPhase();
      renderTable();
    });
  });

  $("prevPlayerBtn").disabled = currentPlayer === 0;

  $("prevPlayerBtn").addEventListener("click", () => {
    currentPlayer--;
    saveData();
    renderCurrentPhase();
  });

  $("nextPlayerBtn").addEventListener("click", () => {
    if (!validateCurrentPlayer()) return;

    currentPlayer++;
    saveData();
    renderCurrentPhase();
  });
}

function validateCurrentPlayer() {
  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];

    if (round.winner === null) {
      alert(`${i + 1}라운드의 1등이 선택되지 않았습니다.`);
      return false;
    }

    if (round.winner === currentPlayer) continue;

    const value = round.payments[currentPlayer];

    if (value === undefined || value === null || value === "") {
      alert(`${i + 1}라운드 금액을 입력해주세요. D를 누르면 100점으로 입력됩니다.`);
      return false;
    }

    if (!Number.isFinite(Number(value)) || Number(value) < 0) {
      alert(`${i + 1}라운드 금액을 확인해주세요.`);
      return false;
    }
  }

  return true;
}

function renderCurrentPhase() {
  $("gameSection").classList.remove("hidden");

  if (currentPhase === "winner") {
    renderWinnerPhase();
  } else if (currentPhase === "payment") {
    renderPaymentPhase();
  } else if (currentPhase === "finished") {
    renderFinalResult();
  }

  renderTable();
}

// 라운드별 실시간 점수 계산
function calculateResults() {
  const totals = players.map(() => 0);

  rounds.forEach(round => {
    if (round.winner === null) return;

    let received = 0;

    players.forEach((_, playerIndex) => {
      if (playerIndex === round.winner) return;

      const amount = Number(round.payments[playerIndex]);

      if (Number.isFinite(amount) && amount >= 0) {
        totals[playerIndex] -= amount;
        received += amount;
      }
    });

    totals[round.winner] += received;
  });

  return totals;
}

// 표에 표시할 라운드별 점수
function getRoundCell(round, playerIndex) {
  if (round.winner === null) {
    return { text: "미정", type: "pending" };
  }

  if (round.winner === playerIndex) {
    let received = 0;
    let allEntered = true;

    players.forEach((_, index) => {
      if (index === round.winner) return;

      const value = round.payments[index];

      if (value === undefined || value === null || value === "") {
        allEntered = false;
      } else {
        received += Number(value);
      }
    });

    return {
      text: allEntered ? `+${received}` : `+${received} (입력중)`,
      type: "positive"
    };
  }

  const amount = round.payments[playerIndex];

  if (amount === undefined || amount === null || amount === "") {
    return { text: "미입력", type: "pending" };
  }

  return { text: `-${Number(amount)}`, type: "negative" };
}

function renderTable() {
  if (!rounds.length || !players.length) return;

  const totals = calculateResults();

  let html = `
    <thead>
      <tr>
        <th>라운드</th>
        ${players.map(name => `<th>${escapeHTML(name)}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
  `;

  rounds.forEach((round, roundIndex) => {
    html += `<tr><th>${roundIndex + 1}R</th>`;

    players.forEach((_, playerIndex) => {
      const cell = getRoundCell(round, playerIndex);
      html += `<td class="${cell.type}">${cell.text}</td>`;
    });

    html += `</tr>`;
  });

  html += `<tr class="total-row"><th>합계</th>`;

  totals.forEach(total => {
    const type = total > 0 ? "positive" : total < 0 ? "negative" : "";
    html += `<td class="${type}">${total > 0 ? "+" : ""}${total}</td>`;
  });

  html += `</tr></tbody>`;

  $("resultTable").innerHTML = html;
}

function renderFinalResult() {
  $("finalResult").classList.remove("hidden");

  const totals = calculateResults();

  let summary = "";
  totals.forEach((total, index) => {
    summary += `
      <div class="result-person">
        <span>${escapeHTML(players[index])}</span>
        <strong style="color:${total > 0 ? "#176b35" : total < 0 ? "#d33b3b" : "#555"}">
          ${total > 0 ? "+" : ""}${total}
        </strong>
      </div>
    `;
  });

  $("summaryArea").innerHTML = summary;

  const transfers = makeTransfers(totals);

  let transferHTML = "<h3>송금 내역</h3>";

  if (!transfers.length) {
    transferHTML += `<p class="muted">정산할 금액이 없습니다.</p>`;
  } else {
    transfers.forEach(item => {
      transferHTML += `
        <div class="transfer">
          <strong>${escapeHTML(players[item.from])}</strong>
          →
          <strong>${escapeHTML(players[item.to])}</strong>
          <b>${item.amount}점</b>
        </div>
      `;
    });
  }

  const gain = totals.filter(v => v > 0).reduce((a, b) => a + b, 0);
  const loss = -totals.filter(v => v < 0).reduce((a, b) => a + b, 0);

  transferHTML += `
    <div class="notice">
      총 획득: ${gain}점<br>
      총 지불: ${loss}점<br>
      차이: ${gain - loss}점
      ${gain === loss ? " · 정상 정산" : " · 확인이 필요합니다"}
    </div>
  `;

  $("transferArea").innerHTML = transferHTML;
  $("finalResult").scrollIntoView({ behavior: "smooth" });
}

// 손실 금액을 획득 금액에 맞춰 송금 배분
function makeTransfers(totals) {
  const debtors = totals
    .map((value, index) => ({ index, amount: -value }))
    .filter(item => item.amount > 0);

  const creditors = totals
    .map((value, index) => ({ index, amount: value }))
    .filter(item => item.amount > 0);

  const result = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(
      debtors[i].amount,
      creditors[j].amount
    );

    if (amount > 0) {
      result.push({
        from: debtors[i].index,
        to: creditors[j].index,
        amount
      });
    }

    debtors[i].amount -= amount;
    creditors[j].amount -= amount;

    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }

  return result;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// 엑셀에 붙여넣기 가능한 탭 구분 표 복사
function getTableText() {
  const header = ["라운드", ...players, "1등"];

  const rows = rounds.map((round, index) => {
    const values = players.map((_, playerIndex) => {
      const cell = getRoundCell(round, playerIndex);
      return cell.text;
    });

    return [
      `${index + 1}R`,
      ...values,
      round.winner === null ? "미정" : players[round.winner]
    ];
  });

  const totals = calculateResults();

  return [
    header.join("\t"),
    ...rows.map(row => row.join("\t")),
    ["합계", ...totals, ""].join("\t")
  ].join("\n");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert("복사했습니다. 엑셀이나 메모장에 붙여넣을 수 있습니다.");
  } catch (error) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    alert("복사했습니다.");
  }
}

$("addPlayerBtn").addEventListener("click", addPlayer);

$("playerName").addEventListener("keydown", event => {
  if (event.key === "Enter") addPlayer();
});

$("startBtn").addEventListener("click", startGame);

$("copyTableBtn").addEventListener("click", () => {
  copyText(getTableText());
});

$("copyResultBtn").addEventListener("click", () => {
  const totals = calculateResults();
  const transfers = makeTransfers(totals);

  let text = "참가자별 최종 점수\n";
  players.forEach((name, index) => {
    text += `${name}\t${totals[index]}\n`;
  });

  text += "\n송금 내역\n";

  transfers.forEach(item => {
    text += `${players[item.from]} → ${players[item.to]}: ${item.amount}점\n`;
  });

  copyText(text);
});

function resetGame() {
  if (!confirm("진행 중인 게임과 저장된 데이터를 모두 초기화할까요?")) return;

  localStorage.removeItem("gameSettlementData");
  players = [];
  rounds = [];
  currentPhase = "setup";
  currentRound = 0;
  currentPlayer = 0;

  $("playerList").innerHTML = "";
  $("roundArea").innerHTML = "";
  $("resultTable").innerHTML = "";
  $("summaryArea").innerHTML = "";
  $("transferArea").innerHTML = "";
  $("gameSection").classList.add("hidden");
  $("finalResult").classList.add("hidden");
}

$("resetBtn").addEventListener("click", resetGame);


loadData();
