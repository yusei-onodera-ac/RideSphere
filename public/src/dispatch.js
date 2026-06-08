export const drivers = [
  {
    id: 'drv-001',
    name: '田中 一郎',
    vehicleNumber: '品川 500 あ 12-34',
    status: '空き',
    onShift: true,
    vehicleAvailable: true,
    nominatedOnly: false,
    inServiceArea: true,
    resting: false,
    distanceKm: 1.2,
    etaMinutes: 6,
    location: { x: 33, y: 46 }
  },
  {
    id: 'drv-002',
    name: '鈴木 美咲',
    vehicleNumber: '練馬 300 い 56-78',
    status: '空き',
    onShift: true,
    vehicleAvailable: true,
    nominatedOnly: false,
    inServiceArea: true,
    resting: false,
    distanceKm: 2.8,
    etaMinutes: 12,
    location: { x: 54, y: 64 }
  },
  {
    id: 'drv-003',
    name: '高橋 健',
    vehicleNumber: '足立 400 う 90-12',
    status: '対応中',
    onShift: true,
    vehicleAvailable: true,
    nominatedOnly: false,
    inServiceArea: true,
    resting: false,
    distanceKm: 0.9,
    etaMinutes: 5,
    location: { x: 28, y: 35 }
  },
  {
    id: 'drv-004',
    name: '伊藤 葵',
    vehicleNumber: '多摩 500 え 34-56',
    status: '空き',
    onShift: true,
    vehicleAvailable: false,
    nominatedOnly: false,
    inServiceArea: true,
    resting: false,
    distanceKm: 1.8,
    etaMinutes: 9,
    location: { x: 61, y: 39 }
  },
  {
    id: 'drv-005',
    name: '山本 翔',
    vehicleNumber: '品川 330 お 78-90',
    status: '空き',
    onShift: false,
    vehicleAvailable: true,
    nominatedOnly: false,
    inServiceArea: true,
    resting: false,
    distanceKm: 1.5,
    etaMinutes: 8,
    location: { x: 45, y: 74 }
  }
];

export function isEligibleDriver(driver) {
  return (
    driver.status === '空き' &&
    driver.onShift &&
    driver.vehicleAvailable &&
    !driver.nominatedOnly &&
    driver.inServiceArea &&
    !driver.resting
  );
}

export function rankDrivers(driverPool) {
  return driverPool
    .filter(isEligibleDriver)
    .map((driver) => ({
      ...driver,
      score: Math.round(driver.distanceKm * 10 + driver.etaMinutes * 2)
    }))
    .sort((a, b) => a.score - b.score || a.distanceKm - b.distanceKm);
}

export function createReservation(formData) {
  return {
    id: `RS-${Date.now().toString().slice(-6)}`,
    customerName: formData.get('customerName'),
    pickup: formData.get('pickup'),
    destination: formData.get('destination'),
    pickupTime: formData.get('pickupTime'),
    status: '候補検索済み'
  };
}
