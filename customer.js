import {
  addEvent,
  getPlace,
  loadState,
  placeOptions,
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
let activeCustomerId = localStorage.getItem("ridesphere-customer-id") || state.customers[0].id;

const elements = {
  customerSelect: document.querySelector("#customerSelect"),
  requestForm: document.querySelector("#requestForm"),
  pickupSelect: document.querySelector("#pickupSelect"),
  destinationSelect: document.querySelector("#destinationSelect"),
  reservationTime: document.querySelector("#reservationTime"),
  statusList: document.querySelector("#statusList"),
  mapCanvas: document.querySelector("#mapCanvas"),
  shareLocationButton: document.querySelector("#shareLocationButton"),
  emergencyButton: document.querySelector("#emergencyButton"),
  notifyButton: document.querySelector("#notifyButton"),
  eventLog: document.querySelector("#eventLog")
};

function activeCustomer() {
  return state.customers.find((customer) => customer.id === activeCustomerId) || state.customers[0];
}

function customerReservations() {
  const customer = activeCustomer();
  return state.reservations.filter((reservation) => reservation.customerId === customer.id || reservation.customerName === customer.name);
}

function renderCustomerSelect() {
  elements.customerSelect.innerHTML = state.customers.map((customer) => `<option value="${customer.id}">${customer.name}</option>`).join("");
  elements.customerSelect.value = activeCustomer().id;
}

function renderStatuses() {
  const reservations = customerReservations();
  elements.statusList.innerHTML = reservations.map((reservation) => {
    const pickup = getPlace(reservation.pickupId);
    const destination = getPlace(reservation.destinationId);
    const driver = state.drivers.find((item) => item.id === reservation.assignedDriverId);
    return `
      <article class="dispatch-card">
        <h3>${reservation.id} ${reservationStatusLabel(reservation.status)}</h3>
        <p class="meta">${pickup.name} → ${destination.name}<br>${new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(reservation.time))}</p>
        <p class="meta">${driver ? `担当ドライバー: ${driver.name} / ${driver.vehicle}` : "担当ドライバーはまだ決まっていません。"}</p>
      </article>
    `;
  }).join("") || '<p class="hint">予約はまだありません。顧客アプリから依頼を作成できます。</p>';

  renderMap(elements.mapCanvas, state, { reservationId: reservations[0]?.id });
}

function render() {
  renderCustomerSelect();
  renderStatuses();
  renderEvents(elements.eventLog, state);
}

function createRequest(event) {
  event.preventDefault();
  const customer = activeCustomer();
  const form = new FormData(elements.requestForm);
  const id = `RS-${Math.floor(1000 + Math.random() * 9000)}`;
  state.reservations.unshift({
    id,
    customerId: customer.id,
    customerName: customer.name,
    pickupId: form.get("pickupSelect"),
    destinationId: form.get("destinationSelect"),
    time: new Date(form.get("reservationTime")).toISOString(),
    status: "requested",
    assignedDriverId: null,
    source: "customer"
  });
  elements.requestForm.reset();
  initializeForm();
  addEvent(state, `顧客アプリから ${customer.name} が ${id} を依頼しました。管理者アプリで配車してください。`);
  showNotification("新規顧客依頼", `${customer.name}様から予約依頼が届きました。`);
  render();
}

function shareCustomerLocation() {
  updateCurrentLocation((coords) => {
    const nearest = state.reservations.find((reservation) => reservation.customerId === activeCustomer().id && !["completed", "cancelled"].includes(reservation.status));
    if (nearest) {
      nearest.customerLocation = { lat: coords.latitude, lng: coords.longitude };
    }
    addEvent(state, `顧客アプリで ${activeCustomer().name} の現在地を共有しました。`);
    saveState(state);
    render();
  });
}

function emergencyReport() {
  const reservation = customerReservations().find((item) => !["completed", "cancelled"].includes(item.status));
  addEvent(state, `緊急通知: 顧客 ${activeCustomer().name} / ${reservation ? reservation.id : "予約なし"}。管理者へ即時通知しました。`);
  showNotification("顧客緊急通知", `${activeCustomer().name}様から緊急通知が送信されました。`);
  render();
}

function initializeForm() {
  elements.pickupSelect.innerHTML = placeOptions("tokyo");
  elements.destinationSelect.innerHTML = placeOptions("haneda");
  setDefaultReservationTime(elements.reservationTime);
}

function bindEvents() {
  elements.customerSelect.addEventListener("change", (event) => {
    activeCustomerId = event.target.value;
    localStorage.setItem("ridesphere-customer-id", activeCustomerId);
    render();
  });
  elements.requestForm.addEventListener("submit", createRequest);
  elements.shareLocationButton.addEventListener("click", shareCustomerLocation);
  elements.emergencyButton.addEventListener("click", emergencyReport);
  elements.notifyButton.addEventListener("click", async () => {
    await requestNotifications(state);
    render();
  });
}

initializeForm();
bindEvents();
registerPwa();
render();
