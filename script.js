// script.js
const DOM = {
  facilitySelect: document.getElementById("facilitySelect"),
  itemSelect: document.getElementById("itemSelect"),
  countInput: document.getElementById("targetCount"),
  calcBtn: document.getElementById("calcBtn"),
  craftResult: document.getElementById("craftResult"),
  rawResult: document.getElementById("rawResult"),
  // 신설 보유재료 DOM (form 내부의 input을 정확히 가리키도록 수정)
  invSearchInput: document.querySelector("#invSearchInput"),
  searchResults: document.querySelector("#searchResults"),
  invInputRow: document.getElementById("invInputRow"),
  selectedItemName: document.getElementById("selectedItemName"),
  invCountInput: document.getElementById("invCountInput"),
  addInvBtn: document.getElementById("addInvBtn"),
  invList: document.getElementById("invList"), // ⚠️ 끝에 쉼표(,)가 있는지 확인하세요!
  quickSearchInput: document.querySelector("#quickSearchInput"),
  quickSearchResults: document.querySelector("#quickSearchResults")
};

// 유저가 입력한 보유 재료 상태 관리 (예: { "철괴": 5, "철 광석": 20 })
let USER_INVENTORY = {};

// 게임 내 존재하는 모든 아이템 마스터 리스트 및 태그 정보 생성
// ✅ 지운 자리에 이 코드를 통째로 복붙하세요!
function getMasterList() {
  // 이미 생성된 캐시가 있다면 그걸 반환
  if (window.ITEM_MASTER_CACHE && Object.keys(window.ITEM_MASTER_CACHE).length > 0) {
    return window.ITEM_MASTER_CACHE;
  }
  
  // 데이터 구조가 아직 안 불려왔다면 빈 객체 반환 방지
  if (typeof GAME_DB === 'undefined') return {};

  const allItems = {};
  
  // 1단계: 가공품 등록
  for (const category in GAME_DB) {
    let categoryName = "";
    switch(category) {
      case 'metal': categoryName = "금속"; break;
      case 'wood': categoryName = "목재"; break;
      case 'leather': categoryName = "가죽"; break;
      case 'cloth': categoryName = "옷감"; break;
      case 'potion': categoryName = "약품"; break;
      case 'food': categoryName = "식재료"; break;
    }
    for (const itemName in GAME_DB[category]) {
      allItems[itemName] = { isCrafted: true, tagText: `${categoryName} 가공품` };
    }
  }

  // 2단계: 순수 원재료 등록
  for (const category in GAME_DB) {
    for (const itemName in GAME_DB[category]) {
      const ingredients = GAME_DB[category][itemName].ingredients;
      for (const matName in ingredients) {
        if (!allItems[matName]) {
          allItems[matName] = { isCrafted: false, tagText: "원재료" };
        }
      }
    }
  }

  window.ITEM_MASTER_CACHE = allItems;
  return allItems;
}

// 특정 시설의 아이템 목록 가져오기 (기존 유지)
function getItemsByFacility(facilityKey) {
  if (!facilityKey || !GAME_DB[facilityKey]) return [];
  return Object.keys(GAME_DB[facilityKey]);
}

// 아이템 선택 Select 박스 업데이트 (기존 유지)
function updateItemSelect(facilityKey) {
  DOM.itemSelect.innerHTML = "";
  const items = getItemsByFacility(facilityKey);

  if (!facilityKey) {
    DOM.itemSelect.disabled = true;
    DOM.itemSelect.innerHTML = `<option value="">시설을 먼저 선택</option>`;
    return;
  }

  DOM.itemSelect.disabled = false;
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

// 전체 DB에서 특정 아이템 정보 검색 (기존 유지)
function findItem(itemName) {
  for (const category in GAME_DB) {
    if (GAME_DB[category][itemName]) {
      return GAME_DB[category][itemName];
    }
  }
  return null;
}

// 보유재료 검색창 입력 이벤트 (오류 교정 및 최적화 완료!)
DOM.invSearchInput.addEventListener("input", (e) => {
  const currentMaster = getMasterList();

  const query = e.target.value.trim().toLowerCase();
  if (!query) {
    DOM.searchResults.classList.add("hidden");
    return;
  }

  DOM.searchResults.innerHTML = "";
  let hasResults = false;

  // 💥 ITEM_MASTER를 currentMaster로 정확하게 수정했습니다!
  for (const [name, info] of Object.entries(currentMaster)) {
    if (name.toLowerCase().includes(query)) {
      hasResults = true;
      const div = document.createElement("div");
      div.className = "search-item";
      div.innerHTML = `
        <span>${name}</span>
        <span class="badge ${info.isCrafted ? 'crafted' : 'raw'}">${info.tagText}</span>
      `;
      
      // 검색된 아이템 클릭 시 입력창 활성화
      div.addEventListener("click", () => {
        DOM.selectedItemName.textContent = name;
        DOM.invCountInput.value = 1;
        DOM.invInputRow.classList.remove("hidden");
        DOM.searchResults.classList.add("hidden");
        DOM.invSearchInput.value = "";
      });

      DOM.searchResults.appendChild(div);
    }
  }

  if (hasResults) {
    DOM.searchResults.classList.remove("hidden");
  } else {
    DOM.searchResults.classList.add("hidden");
  }
});

      DOM.searchResults.appendChild(div);
    }
  }

  if (hasResults) {
    DOM.searchResults.classList.remove("hidden");
  } else {
    DOM.searchResults.classList.add("hidden");
  }
});

// 외부 클릭 시 검색결과 닫기
document.addEventListener("click", (e) => {
  if (!DOM.invSearchInput.contains(e.target) && !DOM.searchResults.contains(e.target)) {
    DOM.searchResults.classList.add("hidden");
  }
});

// 보유 재료 '추가' 버튼 클릭
DOM.addInvBtn.addEventListener("click", () => {
  const name = DOM.selectedItemName.textContent;
  const count = parseInt(DOM.invCountInput.value);

  if (!name || isNaN(count) || count <= 0) return;

  // 기존 재고가 있다면 더해줌
  USER_INVENTORY[name] = (USER_INVENTORY[name] || 0) + count;
  
  DOM.invInputRow.classList.add("hidden");
  renderInventoryTags();
});

// 보유 재료 태그 리스트 렌더링
function renderInventoryTags() {
  DOM.invList.innerHTML = "";
  for (const [name, count] of Object.entries(USER_INVENTORY)) {
    if (count <= 0) continue;
    
    const tag = document.createElement("div");
    tag.className = "inv-tag";
    tag.innerHTML = `
      <span>${name} x ${count}</span>
      <button class="remove-btn" data-name="${name}">×</button>
    `;

    // 삭제 버튼 클릭 시 보유량 소멸
    tag.querySelector(".remove-btn").addEventListener("click", (e) => {
      const targetName = e.target.getAttribute("data-name");
      delete USER_INVENTORY[targetName];
      renderInventoryTags();
    });

    DOM.invList.appendChild(tag);
  }
}

// --- ⚙️ 보유 재료 차감을 포함한 재귀 연산 핵심 로직 ---

function resolveItem(itemName, quantity, result, currentInventory) {
  // 1. 현재 필요 수량에서 유저가 보유한 재고가 있다면 차감
  if (currentInventory[itemName] && currentInventory[itemName] > 0) {
    const available = currentInventory[itemName];
    if (available >= quantity) {
      // 보유량으로 다 메꿀 수 있는 경우
      currentInventory[itemName] -= quantity;
      return; // 더 이상 하위 재료 전개 없음
    } else {
      // 일부만 메꾸고 부족분만큼 수량 차감
      quantity -= available;
      currentInventory[itemName] = 0;
    }
  }

  const item = findItem(itemName);

  // 제작할 수 없는 원재료인 경우 종료 조건
  if (!item) {
    result.materials[itemName] = (result.materials[itemName] || 0) + quantity;
    return;
  }

  // 부족분에 대한 제작 횟수 올림 계산
  const craftsNeeded = Math.ceil(quantity / item.output);
  result.processCount[itemName] = (result.processCount[itemName] || 0) + craftsNeeded;

  // 남은 잉여 생산품(Overproduction)이 있다면 인벤토리에 넣어 다음 연산에 기여하게 함
  const totalProduced = craftsNeeded * item.output;
  const surplus = totalProduced - quantity;
  if (surplus > 0) {
    currentInventory[itemName] = (currentInventory[itemName] || 0) + surplus;
  }

  for (const [mat, amt] of Object.entries(item.ingredients)) {
    resolveItem(mat, amt * craftsNeeded, result, currentInventory);
  }
}

// 메인 계산 함수
function calculate() {
  const item = DOM.itemSelect.value;
  const count = Number(DOM.countInput.value);

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

  // 기존 보유창 상태가 손상되지 않도록 딥카피(복사본) 전달하여 연산
  const inventoryCopy = JSON.parse(JSON.stringify(USER_INVENTORY));

  resolveItem(item, count, result, inventoryCopy);
  renderResult(result);
}

// 결과 화면 HTML 출력 (기존 유지)
function renderResult(result) {
  let craftHtml = "";
  let rawHtml = "";

  for (const [item, count] of Object.entries(result.processCount)) {
    if (count > 0) {
      craftHtml += `<div class="result-item"><strong>${item}</strong> : ${count}회 가공</div>`;
    }
  }

  for (const [item, count] of Object.entries(result.materials)) {
    if (count > 0) {
      rawHtml += `<div class="result-item"><strong>${item}</strong> : ${count}개 필요</div>`;
    }
  }

  DOM.craftResult.innerHTML = craftHtml || "공정이 없습니다. (보유 재료 충분)";
  DOM.rawResult.innerHTML = rawHtml || "필요한 원재료가 없습니다. (보유 재료 충분)";
}

// 이벤트 리스너 등록
DOM.facilitySelect.addEventListener("change", e => {
  updateItemSelect(e.target.value);
});

DOM.calcBtn.addEventListener("click", calculate);

// 보유재료 검색창 입력 이벤트
DOM.invSearchInput.addEventListener("input", (e) => {
  const currentMaster = getMasterList();

  const query = e.target.value.trim().toLowerCase();
  if (!query) {
    DOM.searchResults.classList.add("hidden");
    return;
  }

  DOM.searchResults.innerHTML = "";
  let hasResults = false;

  // ITEM_MASTER를 currentMaster로 교정 완료했습니다
  for (const [name, info] of Object.entries(currentMaster)) {
    if (name.toLowerCase().includes(query)) {
      hasResults = true;
      const div = document.createElement("div");
      div.className = "search-item";
      div.innerHTML = `
        <span>${name}</span>
        <span class="badge ${info.isCrafted ? 'crafted' : 'raw'}">${info.tagText}</span>
      `;
      
      // 검색된 아이템 클릭 시 입력창 활성화
      div.addEventListener("click", () => {
        DOM.selectedItemName.textContent = name;
        DOM.invCountInput.value = 1;
        DOM.invInputRow.classList.remove("hidden");
        DOM.searchResults.classList.add("hidden");
        DOM.invSearchInput.value = "";
      });

      DOM.searchResults.appendChild(div);
    }
  }

  if (hasResults) {
    DOM.searchResults.classList.remove("hidden");
  } else {
    DOM.searchResults.classList.add("hidden");
  }
});

// 간편 검색창에서 엔터키 입력 시 첫 번째 결과 선택
DOM.quickSearchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const firstResult = DOM.quickSearchResults.querySelector(".search-item");
    if (firstResult) firstResult.click();
  }
});

// 외부 클릭 시 간편 검색 결과 닫기
document.addEventListener("click", (e) => {
  if (!DOM.quickSearchInput.contains(e.target) && !DOM.quickSearchResults.contains(e.target)) {
    DOM.quickSearchResults.classList.add("hidden");
  }
});

// 아이템 이름을 받아 하단 카테고리를 자동으로 채워주는 함수
function selectItemAutomatically(itemName) {
  let targetFacility = "";

  // 1. 해당 아이템이 어떤 가공시설 카테고리에 속해있는지 DB에서 검색
  for (const facility in GAME_DB) {
    if (GAME_DB[facility][itemName]) {
      targetFacility = facility;
      break;
    }
  }

  if (targetFacility) {
    // 2. 가공시설 Select 박스 값 변경 및 강제 변경 이벤트 발생
    DOM.facilitySelect.value = targetFacility;
    updateItemSelect(targetFacility); // 하위 아이템 목록들 리로드
    
    // 3. 아이템 Select 박스 값 변경
    DOM.itemSelect.value = itemName;
    
    // 4. 검색창 초기화 및 숨기기
    DOM.quickSearchInput.value = "";
    DOM.quickSearchResults.classList.add("hidden");
  }
}
