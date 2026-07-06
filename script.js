// script.js
const DOM = {
  facilitySelect: document.getElementById("facilitySelect"),
  itemSelect: document.getElementById("itemSelect"),
  countInput: document.getElementById("targetCount"),
  calcBtn: document.getElementById("calcBtn"),
  craftResult: document.getElementById("craftResult"),
  rawResult: document.getElementById("rawResult"),
  invSearchInput: document.querySelector("#invSearchInput"),
  searchResults: document.querySelector("#searchResults"),
  invInputRow: document.getElementById("invInputRow"),
  selectedItemName: document.getElementById("selectedItemName"),
  invCountInput: document.getElementById("invCountInput"),
  addInvBtn: document.getElementById("addInvBtn"),
  invList: document.getElementById("invList"),
  quickSearchInput: document.querySelector("#quickSearchInput"),
  quickSearchResults: document.querySelector("#quickSearchResults")
};

// 유저가 입력한 보유 재료 상태 관리
let USER_INVENTORY = {};

// 게임 내 존재하는 모든 아이템 마스터 리스트 및 태그 정보 생성
function getMasterList() {
  if (window.ITEM_MASTER_CACHE && Object.keys(window.ITEM_MASTER_CACHE).length > 0) {
    return window.ITEM_MASTER_CACHE;
  }
  
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

// [1] 보유재료 검색창 입력 이벤트
DOM.invSearchInput.addEventListener("input", (e) => {
  const currentMaster = getMasterList();
  const query = e.target.value.trim().toLowerCase();
  
  if (!query) {
    DOM.searchResults.classList.add("hidden");
    return;
  }

  DOM.searchResults.innerHTML = "";
  let hasResults = false;

  for (const [name, info] of Object.entries(currentMaster)) {
    if (name.toLowerCase().includes(query)) {
      hasResults = true;
      const div = document.createElement("div");
      div.className = "search-item";
      div.innerHTML = `
        <span>${name}</span>
        <span class="badge ${info.isCrafted ? 'crafted' : 'raw'}">${info.tagText}</span>
      `;
      
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

// 보유재료 검색창 엔터 키 지원 기능 추가
DOM.invSearchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const firstResult = DOM.searchResults.querySelector(".search-item");
    if (firstResult) firstResult.click();
  }
});

// 외부 클릭 시 보유재료 검색결과 닫기
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

    tag.querySelector(".remove-btn").addEventListener("click", (e) => {
      const targetName = e.target.getAttribute("data-name");
      delete USER_INVENTORY[targetName];
      renderInventoryTags();
    });

    DOM.invList.appendChild(tag);
  }
}

// --- ⚙️ 연산 핵심 로직 ---
function resolveItem(itemName, quantity, result, currentInventory) {
  if (currentInventory[itemName] && currentInventory[itemName] > 0) {
    const available = currentInventory[itemName];
    if (available >= quantity) {
      currentInventory[itemName] -= quantity;
      return;
    } else {
      quantity -= available;
      currentInventory[itemName] = 0;
    }
  }

  const item = findItem(itemName);

  if (!item) {
    result.materials[itemName] = (result.materials[itemName] || 0) + quantity;
    return;
  }

  const craftsNeeded = Math.ceil(quantity / item.output);
  result.processCount[itemName] = (result.processCount[itemName] || 0) + craftsNeeded;

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
// 메인 계산 함수 (최종 결과물 보유량 반영 버전)
function calculate() {
  const item = DOM.itemSelect.value;
  let count = Number(DOM.countInput.value); // const를 let으로 변경하여 수량 조절이 가능하게 합니다.

  if (!item) {
    alert("아이템을 선택해 주세요.");
    return;
  }
  if (!count || count <= 0) {
    alert("올바른 제작 개수를 입력해 주세요.");
    return;
  }

  // 얕은 복사로 유저 인벤토리 상태를 가져옵니다.
  const inventoryCopy = JSON.parse(JSON.stringify(USER_INVENTORY));

  // [💡 추가된 핵심 로직] 
  // 만약 만들고자 하는 최종 아이템이 이미 인벤토리에 있다면?
  if (inventoryCopy[item] && inventoryCopy[item] > 0) {
    const available = inventoryCopy[item];
    
    if (available >= count) {
      // 이미 충분히 가지고 있다면 계산할 필요가 없음!
      inventoryCopy[item] -= count; // 인벤토리에서 차감만 해줌
      count = 0; // 더이상 만들 개수가 없음
    } else {
      // 가지고 있는 양이 목표량보다 적다면, 있는 만큼 빼고 부족한 만큼만 목표량으로 설정
      count -= available;
      inventoryCopy[item] = 0; // 인벤토리에 있던 건 전부 사용 처리
    }
  }

  const result = { processCount: {}, materials: {} };

  // 최종적으로 '부족한 개수(count)'가 0보다 클 때만 하위 재료 연산을 돌립니다.
  if (count > 0) {
    resolveItem(item, count, result, inventoryCopy);
  }
  
  renderResult(result);
}

// 결과 화면 HTML 출력
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

// [2] 제작 아이템 간편 검색창 입력 이벤트
DOM.quickSearchInput.addEventListener("input", (e) => {
  const currentMaster = getMasterList();
  const query = e.target.value.trim().toLowerCase();
  
  if (!query) {
    DOM.quickSearchResults.classList.add("hidden");
    return;
  }

  DOM.quickSearchResults.innerHTML = "";
  let hasResults = false;

  for (const [name, info] of Object.entries(currentMaster)) {
    if (info.isCrafted && name.toLowerCase().includes(query)) {
      hasResults = true;
      const div = document.createElement("div");
      div.className = "search-item";
      div.innerHTML = `
        <span>${name}</span>
        <span class="badge crafted">${info.tagText}</span>
      `;
      
      div.addEventListener("click", () => {
        selectItemAutomatically(name);
      });

      DOM.quickSearchResults.appendChild(div);
    }
  }

  if (hasResults) {
    DOM.quickSearchResults.classList.remove("hidden");
  } else {
    DOM.quickSearchResults.classList.add("hidden");
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

  for (const facility in GAME_DB) {
    if (GAME_DB[facility][itemName]) {
      targetFacility = facility;
      break;
    }
  }

  if (targetFacility) {
    DOM.facilitySelect.value = targetFacility;
    updateItemSelect(targetFacility);
    DOM.itemSelect.value = itemName;
    DOM.quickSearchInput.value = "";
    DOM.quickSearchResults.classList.add("hidden");
  }
}

// 이벤트 리스너 등록
DOM.facilitySelect.addEventListener("change", e => {
  updateItemSelect(e.target.value);
});
DOM.calcBtn.addEventListener("click", calculate);

window.addEventListener("DOMContentLoaded", () => {
  // 혹시 모를 캐시 꼬임 방지를 위해 초기화 후 실행
  window.ITEM_MASTER_CACHE = null; 
  getMasterList();
});
