import { createReservation, drivers, isEligibleDriver, rankDrivers } from './dispatch.js';

const state = {
  reservation: null,
  assignedDriver: null,
  jobStatus: '未割当'
};

const elements = {
  form: document.querySelector('#reservationForm'),
  driverList: document.querySelector('#driverList'),
  rankingSummary: document.querySelector('#rankingSummary'),
  map: document.querySelector('#dispatchMap'),
  driverSelect: document.querySelector('#driverSelect'),
  shareLocationButton: document.querySelector('#shareLocationButton'),
  jobTitle: document.querySelector('#jobTitle'),
  jobPickup: document.querySelector('#jobPickup'),
  jobDestination: document.querySelector('#jobDestination'),
  jobEta: document.querySelector('#jobEta'),
  jobStatus: document.querySelector('#jobStatus'),
  acceptButton: document.querySelector('#acceptButton'),
  completeButton: document.querySelector('#completeButton'),
  navigationInfo: document.querySelector('#navigationInfo'),
  emergencyButton: document.querySelector('#emergencyButton'),
  networkStatus: document.querySelector('#networkStatus'),
  installButton: document.querySelector('#installButton'),
  toast: document.querySelector('#toast')
};

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  window.setTimeout(() => elements.toast.classList.remove('visible'), 3200);
}

function renderMapPins() {
  for (const node of elements.map.querySelectorAll('.driver-pin')) {
    node.remove();
  }

  drivers.forEach((driver) => {
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = `driver-pin ${isEligibleDriver(driver) ? 'available' : 'unavailable'}`;
    pin.style.setProperty('--x', `${driver.location.x}%`);
    pin.style.setProperty('--y', `${driver.location.y}%`);
    pin.title = `${driver.name} / ${driver.status}`;
    pin.textContent = driver.name.slice(0, 1);
    elements.map.append(pin);
  });
}

function renderDriverOptions() {
  elements.driverSelect.innerHTML = drivers
    .map((driver) => `<option value="${driver.id}">${driver.name}（${driver.status}）</option>`)
    .join('');
}

function renderDriverList() {
  const ranked = rankDrivers(drivers);
  elements.rankingSummary.textContent = `${ranked.length}名が条件一致`;
  elements.driverList.innerHTML = ranked
    .map(
      (driver, index) => `
        <article class="driver-card">
          <div>
            <span class="rank">候補 ${index + 1}</span>
            <h4>${driver.name}</h4>
            <p>${driver.vehicleNumber}</p>
          </div>
          <dl>
            <div><dt>距離</dt><dd>${driver.distanceKm.toFixed(1)}km</dd></div>
            <div><dt>到着</dt><dd>${driver.etaMinutes}分</dd></div>
            <div><dt>スコア</dt><dd>${driver.score}</dd></div>
          </dl>
          <button type="button" data-driver-id="${driver.id}">通知する</button>
        </article>
      `
    )
    .join('');
}

function assignDriver(driverId) {
  const driver = drivers.find((candidate) => candidate.id === driverId);
  if (!driver || !state.reservation) {
    showToast('先に予約を登録してください。');
    return;
  }

  state.assignedDriver = driver;
  state.jobStatus = '通知済み';
  elements.driverSelect.value = driver.id;
  renderJob();
  showToast(`${driver.name}へ配車通知を送信しました。`);
}

function renderJob() {
  const reservation = state.reservation;
  const driver = state.assignedDriver;
  elements.jobTitle.textContent = reservation && driver ? `${reservation.customerName}様の予約` : '通知待ち';
  elements.jobPickup.textContent = reservation?.pickup ?? '-';
  elements.jobDestination.textContent = reservation?.destination ?? '-';
  elements.jobEta.textContent = driver ? `${driver.etaMinutes}分（${driver.distanceKm.toFixed(1)}km）` : '-';
  elements.jobStatus.textContent = state.jobStatus;
  elements.acceptButton.disabled = !(reservation && driver && state.jobStatus === '通知済み');
  elements.completeButton.disabled = state.jobStatus !== '承認済み';
  elements.navigationInfo.textContent = reservation && driver
    ? `${driver.name}から${reservation.pickup}まで約${driver.etaMinutes}分。承認後に降車場所までのナビを表示します。`
    : '乗車場所までのルートを準備中です。渋滞・通行止め情報は今後API連携します。';
}

function updateNetworkStatus() {
  elements.networkStatus.textContent = navigator.onLine ? 'オンライン' : 'オフライン（最低限表示）';
  elements.networkStatus.classList.toggle('offline', !navigator.onLine);
}

elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  state.reservation = createReservation(new FormData(elements.form));
  state.assignedDriver = null;
  state.jobStatus = '候補検索済み';
  renderDriverList();
  renderJob();
  showToast(`予約 ${state.reservation.id} を登録しました。候補を選択してください。`);
});

elements.driverList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-driver-id]');
  if (button) {
    assignDriver(button.dataset.driverId);
  }
});

elements.acceptButton.addEventListener('click', () => {
  state.jobStatus = '承認済み';
  renderJob();
  showToast('運転手が承認しました。配車確定です。');
});

elements.completeButton.addEventListener('click', () => {
  state.jobStatus = '運行完了';
  renderJob();
  showToast('運行完了を記録しました。');
});

elements.shareLocationButton.addEventListener('click', () => {
  const driver = drivers.find((candidate) => candidate.id === elements.driverSelect.value);
  if (!navigator.geolocation) {
    showToast(`${driver.name}のデモ現在地を共有しました。`);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    () => showToast(`${driver.name}の現在地を共有しました。`),
    () => showToast(`${driver.name}のデモ現在地を共有しました。`),
    { enableHighAccuracy: true, timeout: 3000 }
  );
});

elements.emergencyButton.addEventListener('click', () => {
  const driver = drivers.find((candidate) => candidate.id === elements.driverSelect.value);
  const reservationId = state.reservation?.id ?? '未割当';
  showToast(`緊急通知: ${driver.name} / 予約ID ${reservationId} / 現在地を管理者へ送信しました。`);
});

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  elements.installButton.hidden = false;
  elements.installButton.addEventListener('click', async () => {
    elements.installButton.hidden = true;
    await event.prompt();
  }, { once: true });
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    elements.networkStatus.textContent = 'Service Worker登録に失敗';
  });
}

renderMapPins();
renderDriverOptions();
renderDriverList();
renderJob();
updateNetworkStatus();
