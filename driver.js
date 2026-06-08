import {
  addEvent,
  distanceKm,
  etaMinutes,
  getPlace,
  loadState,
  registerPwa,
  renderEvents,
  renderMap,
  requestNotifications,
  reservationStatusLabel,
  saveState,
  showNotification,
  updateCurrentLocation
} from "./shared.js";

let state = loadState();
let activeDriverId = localStorage.getItem("ridesphere-driver-id") || state.drivers[0].id;

const elements = {
  driverSelect: document.querySelector("#driverSelect"),
  mapCanvas: document.querySelector("#mapCanvas"),
  driverStatusBadge: document.querySelector("#driverStatusBadge"),
  assignment: document.querySelector("#driverAssignment"),
  acceptDispatchButton: document.querySelector("#acceptDispatchButton"),
  completeRideButton: document.querySelector("#completeRideButton"),
  shareLocationButton: document.querySelector("#shareLocationButton"),
  emergencyButton: document.querySelector("#emergencyButton"),
  notifyButton: document.querySelector("#notifyButton"),
  eventLog: document.querySelector("#eventLog")
};

function activeDriver() {
  return state.drivers.find((driver) => driver.id === activeDriverId) || state.drivers[0];
}

function activeAssignment() {
  return state.reservations.find((reservation) => reservation.assignedDriverId === activeDriver().id && reservation.status !== "completed" && reservation.status !== "cancelled");
}

function renderDriverSelect() {
  elements.driverSelect.innerHTML = state.drivers.map((driver) => `<option value="${driver.id}">${driver.name} / ${driver.vehicle}</option>`).join("");
  elements.driverSelect.value = activeDriver().id;
}

function renderAssignment() {
  const driver = activeDriver();
  const assignment = activeAssignment();
  elements.driverStatusBadge.textContent = driver.status === "available" ? "空き" : "対応中";
  if (!assignment) {
    elements.assignment.innerHTML = '<p class="hint">現在の配車依頼はありません。現在地共有を有効にして待機してください。</p>';
    elements.acceptDispatchButton.disabled = true;
    elements.completeRideButton.disabled = true;
    renderMap(elements.mapCanvas, state, { driverId: driver.id });
    return;
  }
  const pickup = getPlace(assignment.pickupId);
  const destination = getPlace(assignment.destinationId);
  const pickupDistance = distanceKm(driver.location, pickup);
  const rideDistance = distanceKm(pickup, destination);
  elements.assignment.innerHTML = `
    <article class="assignment-card">
      <h3>${assignment.id} ${assignment.customerName}</h3>
      <p class="meta">乗車場所: ${pickup.name}（約${etaMinutes(pickupDistance)}分）</p>
      <p class="meta">降車場所: ${destination.name}（乗車後 約${etaMinutes(rideDistance)}分）</p>
      <p class="meta">状態: <strong>${reservationStatusLabel(assignment.status)}</strong></p>
    </article>
  `;
  elements.acceptDispatchButton.disabled = assignment.status !== "notified";
  elements.completeRideButton.disabled = assignment.status !== "accepted";
  renderMap(elements.mapCanvas, state, { driverId: driver.id, reservationId: assignment.id });
}

function render() {
  renderDriverSelect();
  renderAssignment();
  renderEvents(elements.eventLog, state);
}

function shareLocation() {
  updateCurrentLocation((coords) => {
    const driver = activeDriver();
    driver.location = { lat: coords.latitude, lng: coords.longitude };
    addEvent(state, `ドライバーアプリで ${driver.name} の現在地を共有しました。`);
    render();
  });
}

function acceptDispatch() {
  const driver = activeDriver();
  const reservation = activeAssignment();
  if (!reservation || reservation.status !== "notified") return;
  reservation.status = "accepted";
  addEvent(state, `ドライバーアプリで ${driver.name} が ${reservation.id} を承認しました。`);
  showNotification("配車確定", `${reservation.id} が承認されました。`);
  render();
}

function completeRide() {
  const driver = activeDriver();
  const reservation = activeAssignment();
  if (!reservation || reservation.status !== "accepted") return;
  reservation.status = "completed";
  driver.status = "available";
  addEvent(state, `ドライバーアプリで ${driver.name} が ${reservation.id} の運行を完了しました。`);
  render();
}

function emergencyReport() {
  const driver = activeDriver();
  const reservation = activeAssignment();
  addEvent(state, `緊急通知: ドライバー ${driver.name} / ${reservation ? reservation.id : "予約なし"} / 現在地 ${driver.location.lat.toFixed(4)}, ${driver.location.lng.toFixed(4)}。管理者へ即時通知しました。`);
  showNotification("緊急通知", `${driver.name} から緊急通知が送信されました。`);
  render();
}

function bindEvents() {
  elements.driverSelect.addEventListener("change", (event) => {
    activeDriverId = event.target.value;
    localStorage.setItem("ridesphere-driver-id", activeDriverId);
    render();
  });
  elements.shareLocationButton.addEventListener("click", shareLocation);
  elements.acceptDispatchButton.addEventListener("click", acceptDispatch);
  elements.completeRideButton.addEventListener("click", completeRide);
  elements.emergencyButton.addEventListener("click", emergencyReport);
  elements.notifyButton.addEventListener("click", async () => {
    await requestNotifications(state);
    render();
  });
}

bindEvents();
registerPwa();
render();
