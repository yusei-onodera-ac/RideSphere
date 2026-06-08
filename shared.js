export const STORAGE_KEY = "ridesphere-mvp-state-v2";

export const places = [
  { id: "tokyo", name: "東京駅 八重洲口", lat: 35.6812, lng: 139.7671 },
  { id: "ginza", name: "銀座四丁目", lat: 35.6717, lng: 139.7650 },
  { id: "nihonbashi", name: "日本橋", lat: 35.6846, lng: 139.7745 },
  { id: "roppongi", name: "六本木ヒルズ", lat: 35.6605, lng: 139.7292 },
  { id: "haneda", name: "羽田空港 第3ターミナル", lat: 35.5494, lng: 139.7798 },
  { id: "shinjuku", name: "新宿駅 西口", lat: 35.6909, lng: 139.7003 }
];

const initialState = {
  adminLocation: { lat: 35.6812, lng: 139.7671, name: "管理センター" },
  customers: [
    { id: "customer-1", name: "山田 太郎", phone: "090-0000-0001" },
    { id: "customer-2", name: "佐藤 花子", phone: "090-0000-0002" }
  ],
  drivers: [
    { id: "driver-1", name: "田中 一郎", vehicle: "品川500 あ 12-34", status: "available", shift: "09:00-18:00", location: { lat: 35.6762, lng: 139.7649 }, area: "都心" },
    { id: "driver-2", name: "鈴木 次郎", vehicle: "品川500 い 56-78", status: "available", shift: "10:00-20:00", location: { lat: 35.6896, lng: 139.7006 }, area: "西部" },
    { id: "driver-3", name: "高橋 三郎", vehicle: "練馬500 う 90-12", status: "busy", shift: "08:00-17:00", location: { lat: 35.6586, lng: 139.7454 }, area: "都心" }
  ],
  reservations: [
    {
      id: "RS-1001",
      customerId: "customer-1",
      customerName: "山田 太郎",
      pickupId: "tokyo",
      destinationId: "haneda",
      time: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      status: "waiting",
      assignedDriverId: null,
      source: "admin"
    }
  ],
  events: ["MVPを起動しました。管理者・ドライバー・顧客は別々のPWA入口から利用します。"]
};

export function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : structuredClone(initialState);
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function addEvent(state, message) {
  const stamp = new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short" }).format(new Date());
  state.events.unshift(`${stamp} ${message}`);
  state.events = state.events.slice(0, 60);
  saveState(state);
}

export function getPlace(id) {
  return places.find((place) => place.id === id);
}

export function placeOptions(selectedId = "") {
  return places.map((place) => `<option value="${place.id}" ${place.id === selectedId ? "selected" : ""}>${place.name}</option>`).join("");
}

export function distanceKm(origin, destination) {
  const radius = 6371;
  const lat1 = origin.lat * Math.PI / 180;
  const lat2 = destination.lat * Math.PI / 180;
  const deltaLat = (destination.lat - origin.lat) * Math.PI / 180;
  const deltaLng = (destination.lng - origin.lng) * Math.PI / 180;
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function etaMinutes(distance) {
  return Math.max(3, Math.round((distance / 24) * 60));
}

export function rankDrivers(state, reservation) {
  const pickup = getPlace(reservation.pickupId);
  return state.drivers
    .filter((driver) => driver.status === "available")
    .map((driver) => {
      const distance = distanceKm(driver.location, pickup);
      return { ...driver, distance, eta: etaMinutes(distance) };
    })
    .sort((a, b) => a.eta - b.eta);
}

export function reservationStatusLabel(status) {
  return {
    waiting: "未配車",
    requested: "顧客依頼",
    notified: "通知済み",
    accepted: "承認済み",
    completed: "運行完了",
    cancelled: "キャンセル"
  }[status] ?? status;
}

function project(location) {
  const bounds = { minLat: 35.53, maxLat: 35.71, minLng: 139.68, maxLng: 139.80 };
  const x = ((location.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
  const y = (1 - ((location.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat))) * 100;
  return { x: Math.min(96, Math.max(4, x)), y: Math.min(96, Math.max(4, y)) };
}

function marker({ location, type, label, text }) {
  const point = project(location);
  return `<div class="marker ${type}" style="left:${point.x}%;top:${point.y}%" title="${label}">${text}<span class="marker-label">${label}</span></div>`;
}

function routeLine(start, end) {
  const startPoint = project(start);
  const endPoint = project(end);
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const distance = Math.sqrt(dx ** 2 + dy ** 2);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return `<div class="route" style="--x1:${startPoint.x}%;--y1:${startPoint.y}%;--distance:${distance}%;--angle:${angle}deg"></div>`;
}

export function renderMap(canvas, state, options = {}) {
  const activeReservations = state.reservations.filter((reservation) => reservation.status !== "completed" && reservation.status !== "cancelled");
  const visibleReservations = options.reservationId
    ? activeReservations.filter((reservation) => reservation.id === options.reservationId)
    : activeReservations;
  const routes = visibleReservations.map((reservation) => routeLine(getPlace(reservation.pickupId), getPlace(reservation.destinationId))).join("");
  const reservationMarkers = visibleReservations.map((reservation) => {
    const pickup = getPlace(reservation.pickupId);
    const destination = getPlace(reservation.destinationId);
    return marker({ location: pickup, type: "pickup", label: `${reservation.customerName} 乗車`, text: "乗" }) +
      marker({ location: destination, type: "destination", label: `${reservation.customerName} 目的地`, text: "降" });
  }).join("");
  const driverMarkers = state.drivers
    .filter((driver) => options.driverId ? driver.id === options.driverId : true)
    .map((driver) => marker({
      location: driver.location,
      type: driver.status === "available" ? "driver" : "busy",
      label: `${driver.name} / ${driver.status === "available" ? "空き" : "対応中"}`,
      text: "車"
    })).join("");
  canvas.innerHTML = `<div class="map-grid"></div>${routes}${reservationMarkers}${driverMarkers}${marker({ location: state.adminLocation, type: "admin", label: state.adminLocation.name, text: "管" })}`;
}

export function renderEvents(list, state) {
  list.innerHTML = state.events.map((event) => `<li>${event}</li>`).join("");
}

export function setDefaultReservationTime(input) {
  const now = new Date(Date.now() + 30 * 60 * 1000);
  now.setSeconds(0, 0);
  input.value = now.toISOString().slice(0, 16);
}

export function updateCurrentLocation(onUpdate) {
  const fallback = () => {
    const place = places[Math.floor(Math.random() * places.length)];
    onUpdate({ latitude: place.lat, longitude: place.lng });
  };
  if (!navigator.geolocation) {
    fallback();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => onUpdate(position.coords),
    fallback,
    { enableHighAccuracy: true, timeout: 5000 }
  );
}

export async function requestNotifications(state) {
  if (!("Notification" in window)) {
    addEvent(state, "このブラウザは通知に対応していません。");
    return;
  }
  const permission = await Notification.requestPermission();
  addEvent(state, permission === "granted" ? "通知が有効になりました。" : "通知は許可されませんでした。ブラウザ設定を確認してください。");
}

export function showNotification(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  navigator.serviceWorker?.ready.then((registration) => registration.showNotification(title, { body, icon: "icons/icon.svg", badge: "icons/icon.svg" }));
}

export function registerPwa() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
  }
}
