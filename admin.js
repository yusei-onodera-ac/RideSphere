import {
  addEvent,
  getPlace,
  loadState,
  placeOptions,
  rankDrivers,
  registerPwa,
  renderEvents,
  renderMap,
  requestNotifications,
  reservationStatusLabel,
  saveState,
  setDefaultReservationTime,
  showNotification,
  updateCurrentLocation
} from "./shared.js";

let state = loadState();

const elements = {
  mapCanvas: document.querySelector("#mapCanvas"),
  reservationForm: document.querySelector("#reservationForm"),
  customerName: document.querySelector("#customerName"),
  pickupSelect: document.querySelector("#pickupSelect"),
  destinationSelect: document.querySelector("#destinationSelect"),
  reservationTime: document.querySelector("#reservationTime"),
  reservationList: document.querySelector("#reservationList"),
  eventLog: document.querySelector("#eventLog"),
  notifyButton: document.querySelector("#notifyButton"),
  refreshDriversButton: document.querySelector("#refreshDriversButton"),
  shareLocationButton: document.querySelector("#shareLocationButton"),
  clearLogButton: document.querySelector("#clearLogButton")
};

function renderReservations() {
  elements.reservationList.innerHTML = state.reservations.map((reservation) => {
    const pickup = getPlace(reservation.pickupId);
    const destination = getPlace(reservation.destinationId);
    const assigned = state.drivers.find((driver) => driver.id === reservation.assignedDriverId);
    const candidates = rankDrivers(state, reservation).map((driver) => `
      <div class="candidate-row">
        <span>${driver.name} / ${driver.vehicle}<br><small>${driver.distance.toFixed(1)}km・約${driver.eta}分・${driver.shift}</small></span>
        <button class="primary assign-button" data-reservation-id="${reservation.id}" data-driver-id="${driver.id}" ${reservation.status === "completed" ? "disabled" : ""}>通知</button>
      </div>
    `).join("");

    return `
      <article class="dispatch-card">
        <h3>${reservation.id} ${reservation.customerName}</h3>
        <p class="meta">${pickup.name} → ${destination.name}<br>${new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(reservation.time))}</p>
        <p class="meta">状態: <strong>${reservationStatusLabel(reservation.status)}</strong>${assigned ? ` / 担当: ${assigned.name}` : ""} / 受付: ${reservation.source === "customer" ? "顧客アプリ" : "管理者アプリ"}</p>
        <div class="candidate-list">${candidates || '<p class="hint">条件に合う空き運転手がいません。</p>'}</div>
      </article>
    `;
  }).join("") || '<p class="hint">予約はまだありません。</p>';
}

function render() {
  renderMap(elements.mapCanvas, state);
  renderReservations();
  renderEvents(elements.eventLog, state);
}

function createReservation(event) {
  event.preventDefault();
  const form = new FormData(elements.reservationForm);
  const id = `RS-${Math.floor(1000 + Math.random() * 9000)}`;
  state.reservations.unshift({
    id,
    customerId: null,
    customerName: form.get("customerName"),
    pickupId: form.get("pickupSelect"),
    destinationId: form.get("destinationSelect"),
    time: new Date(form.get("reservationTime")).toISOString(),
    status: "waiting",
    assignedDriverId: null,
    source: "admin"
  });
  elements.reservationForm.reset();
  initializeForm();
  addEvent(state, `${id} の予約を管理者アプリで登録しました。`);
  render();
}

function assignDriver(reservationId, driverId) {
  const reservation = state.reservations.find((item) => item.id === reservationId);
  const driver = state.drivers.find((item) => item.id === driverId);
  if (!reservation || !driver || driver.status !== "available") return;
  reservation.assignedDriverId = driverId;
  reservation.status = "notified";
  driver.status = "busy";
  addEvent(state, `管理者アプリから ${driver.name} に ${reservation.id} の配車通知を送信しました。`);
  showNotification("配車通知", `${driver.name} に ${reservation.customerName}様の依頼を通知しました。`);
  render();
}

function showNearestDrivers() {
  const waiting = state.reservations.find((reservation) => ["waiting", "requested"].includes(reservation.status));
  if (!waiting) {
    addEvent(state, "未配車の予約はありません。");
    render();
    return;
  }
  const ranked = rankDrivers(state, waiting);
  addEvent(state, ranked.length ? `${waiting.id} の最短候補: ${ranked[0].name}（${ranked[0].distance.toFixed(1)}km・約${ranked[0].eta}分）` : `${waiting.id} の条件に合う空き運転手が見つかりません。`);
  render();
}

function shareAdminLocation() {
  updateCurrentLocation((coords) => {
    state.adminLocation = { lat: coords.latitude, lng: coords.longitude, name: "管理者の現在地" };
    addEvent(state, "管理者アプリで現在地を更新しました。");
    render();
  });
}

function initializeForm() {
  elements.pickupSelect.innerHTML = placeOptions("tokyo");
  elements.destinationSelect.innerHTML = placeOptions("haneda");
  setDefaultReservationTime(elements.reservationTime);
}

function bindEvents() {
  elements.reservationForm.addEventListener("submit", createReservation);
  elements.reservationList.addEventListener("click", (event) => {
    const button = event.target.closest(".assign-button");
    if (button) assignDriver(button.dataset.reservationId, button.dataset.driverId);
  });
  elements.refreshDriversButton.addEventListener("click", showNearestDrivers);
  elements.shareLocationButton.addEventListener("click", shareAdminLocation);
  elements.notifyButton.addEventListener("click", async () => {
    await requestNotifications(state);
    render();
  });
  elements.clearLogButton.addEventListener("click", () => {
    state.events = [];
    saveState(state);
    render();
  });
}

initializeForm();
bindEvents();
registerPwa();
render();
