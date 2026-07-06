// script.js
const DOM = {
  facilitySelect: document.getElementById("facilitySelect"),
  itemSelect: document.getElementById("itemSelect"),
  countInput: document.getElementById("targetCount"),
  calcBtn: document.getElementById("calcBtn"),
  craftResult: document.getElementById("craftResult"),
  rawResult: document.getElementById("rawResult")
};

// 특정 시설의 아이템 목록 가져오기
function getItemsByFacility(facilityKey) {
  if (!facilityKey || !GAME_DB[facilityKey]) return [];
  return Object.keys(GAME_DB[facilityKey]);
}

// 아이템 선택 Select 박스 업데이트
function updateItemSelect(facilityKey) {
  DOM.itemSelect.innerHTML = "";

  const items = getItemsByFacility(facilityKey);

  if (!facilityKey) {
    DOM.itemSelect.disabled = true;
    DOM.itemSelect.innerHTML = `<option value="">시설을 먼저 선택</option>`;
    return;
  }

  DOM.itemSelect.disabled = false;
  
  // 기본 기본 안내 옵션 생성
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "아이템 선택";
  DOM.itemSelect.appendChild(defaultOption);

  items.forEach(item => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    DOM.itemSelect.appendChild(option);
  });
}

// 전체 DB에서 특정 아이템 정보 검색
function findItem(itemName) {
  for (const category in GAME_DB) {
    if (GAME_DB[category][itemName]) {
      return GAME_DB[category][itemName];
    }
  }
  return null;
}

// 재귀적으로 재료 계산 연산
function resolveItem(itemName, quantity, result) {
  const item = findItem(itemName);

  // 제작할 수 없는 원재료인 경우 종료 조건
  if (!item) {
    result.materials[itemName] = (result.materials[itemName] || 0) + quantity;
    return;
  }

  // 제작 횟수 올림 계산 (정수형 회차)
  const craftsNeeded = Math.ceil(quantity / item.output);
  result.processCount[itemName] = (result.processCount[itemName] || 0) + craftsNeeded;

  for (const [mat, amt] of Object.entries(item.ingredients)) {
    resolveItem(mat, amt * craftsNeeded, result);
  }
}

// 메인 계산 함수
function calculate() {
  const item = DOM.itemSelect.value;
  const count = Number(DOM.countInput.value);

  // 입력값 예외 처리 규칙 추가
  if (!item) {
    alert("아이템을 선택해 주세요.");
    return;
  }
  if (!count || count <= 0) {
    alert("올바른 제작 개수를 입력해 주세요.");
    return;
  }

  const result = {
    processCount: {},
    materials: {}
  };

  resolveItem(item, count, result);
  renderResult(result);
}

// 결과 화면 HTML 출력
function renderResult(result) {
  // 가독성과 렌더링 성능 최적화를 위한 템플릿 변수화
  let craftHtml = "";
  let rawHtml = "";

  for (const [item, count] of Object.entries(result.processCount)) {
    craftHtml += `<div class="result-item"><strong>${item}</strong> : ${count}회 가공</div>`;
  }

  for (const [item, count] of Object.entries(result.materials)) {
    rawHtml += `<div class="result-item"><strong>${item}</strong> : ${count}개 필요</div>`;
  }

  DOM.craftResult.innerHTML = craftHtml || "공정이 없습니다.";
  DOM.rawResult.innerHTML = rawHtml || "필요한 원재료가 없습니다.";
}

// 이벤트 리스너 등록
DOM.facilitySelect.addEventListener("change", e => {
  updateItemSelect(e.target.value);
});

DOM.calcBtn.addEventListener("click", calculate);
