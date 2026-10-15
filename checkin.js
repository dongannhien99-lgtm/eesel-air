document.addEventListener('DOMContentLoaded', initCheckin);

let currentBooking = null;

function escapeHtml(value) {
const div = document.createElement('div');
div.textContent = String(value ?? '');
return div.innerHTML;
}

function createQRToken() {
const randomPart = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
return `EeselAir|${currentBooking.bookingCode}|${currentBooking.flightNumber}|${randomPart}`;
}

async function initCheckin() {
const bookingId = new URLSearchParams(location.search).get('id');
const container = document.getElementById('checkin-area');
if (!container) return;

if (!window.EeselDB) {
container.innerHTML = '<div class="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl p-6">Die Browser-Datenbank konnte nicht geladen werden.</div>';
return;
}

try {
currentBooking = bookingId ? await EeselDB.getBooking(bookingId) : await EeselDB.getNextFlight();
} catch (error) {
console.error('Fehler beim Lesen der Buchung:', error);
container.innerHTML = '<div class="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl p-6">Buchung konnte nicht aus IndexedDB geladen werden.</div>';
return;
}

if (!currentBooking) {
container.innerHTML = '<div class="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center"><h2 class="text-2xl font-bold">Keine Buchung gefunden</h2><p class="text-slate-400 mt-2">Buche zuerst einen Flug oder öffne eine gespeicherte Buchung.</p><a href="bookings.html" class="inline-block mt-6 bg-cyan-500 px-5 py-3 rounded-xl font-semibold">Meine Buchungen</a></div>';
return;
}

if (currentBooking.checkedIn) {
if (!currentBooking.qrCode) {
currentBooking.qrCode = createQRToken();
currentBooking.qrCreatedAt = new Date().toISOString();
try {
await EeselDB.updateBooking(currentBooking);
} catch (error) {
console.error('QR-Token konnte nicht gespeichert werden:', error);
}
}
renderBoardingPass();
return;
}

renderCheckinOverview();
}

function renderCheckinOverview() {
const container = document.getElementById('checkin-area');
if (!container || !currentBooking) return;
container.innerHTML = `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-7"><h2 class="text-2xl font-bold">Online Check-in</h2><p class="text-slate-400 mt-2">${escapeHtml(currentBooking.fromCode)} → ${escapeHtml(currentBooking.toCode)} · ${escapeHtml(currentBooking.departureTime)}</p><label class="flex gap-3 mt-7 text-sm text-slate-400"><input id="checkin-agree" type="checkbox" class="accent-cyan-500"><span>Ich bestätige, dass die Reisedaten korrekt sind.</span></label><button id="start-checkin" type="button" class="mt-6 bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 rounded-xl font-semibold">Check-in starten</button></div>`;

document.getElementById('start-checkin').addEventListener('click', startCheckin);
}

async function startCheckin() {
const agree = document.getElementById('checkin-agree');
if (!agree?.checked) {
alert('Bitte bestätige deine Angaben.');
return;
}

const button = document.getElementById('start-checkin');
if (button) {
button.disabled = true;
button.textContent = 'Check-in wird gespeichert...';
}

try {
currentBooking.checkedIn = true;
currentBooking.checkinStarted = true;
currentBooking.qrCode = currentBooking.qrCode || createQRToken();
currentBooking.qrCreatedAt = currentBooking.qrCreatedAt || new Date().toISOString();
currentBooking.scanConfirmed = false;
currentBooking = await EeselDB.updateBooking(currentBooking);
renderBoardingPass();
} catch (error) {
console.error('Check-in Fehler:', error);
if (button) {
button.disabled = false;
button.textContent = 'Check-in starten';
}
alert('Der Check-in konnte nicht gespeichert werden.');
}
}

function renderBoardingPass() {
const container = document.getElementById('checkin-area');
if (!container || !currentBooking) return;

const passenger = currentBooking.passenger || {};

container.innerHTML = `<div class="max-w-3xl mx-auto"><div class="bg-white text-slate-950 rounded-3xl overflow-hidden shadow-2xl"><div class="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-6 md:p-8 flex justify-between items-center"><div><p class="text-xs text-blue-100 uppercase tracking-[0.2em]">Boarding Pass</p><h2 class="text-2xl font-bold mt-1">Eesel Air</h2></div><div class="text-5xl">✈</div></div><div class="p-6 md:p-8"><div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><p class="text-xs text-slate-500 uppercase">Passagier</p><p class="font-bold text-lg mt-1">${escapeHtml(passenger.firstName)} ${escapeHtml(passenger.lastName)}</p></div><div class="sm:text-right"><p class="text-xs text-slate-500 uppercase">Buchung</p><p class="font-bold mt-1">${escapeHtml(currentBooking.bookingCode)}</p></div></div><div class="grid grid-cols-[auto_1fr_auto] items-center gap-5 mt-9"><div><p class="text-4xl font-bold">${escapeHtml(currentBooking.fromCode)}</p><p class="text-sm text-slate-500">${escapeHtml(currentBooking.from)}</p></div><div><div class="h-px bg-slate-300"></div><p class="text-center mt-2">✈</p></div><div class="text-right"><p class="text-4xl font-bold">${escapeHtml(currentBooking.toCode)}</p><p class="text-sm text-slate-500">${escapeHtml(currentBooking.to)}</p></div></div><div class="grid grid-cols-2 sm:grid-cols-4 gap-5 mt-9 pt-6 border-t border-dashed border-slate-300"><div><p class="text-xs text-slate-500">FLUG</p><p class="font-bold mt-1">${escapeHtml(currentBooking.flightNumber)}</p></div><div><p class="text-xs text-slate-500">ABFLUG</p><p class="font-bold mt-1">${escapeHtml(currentBooking.departureTime)}</p></div><div><p class="text-xs text-slate-500">SITZ</p><p class="font-bold mt-1">${escapeHtml(currentBooking.seat?.number || '-')}</p></div><div><p class="text-xs text-slate-500">DATUM</p><p class="font-bold mt-1">${new Date(currentBooking.departureDate + 'T12:00:00').toLocaleDateString('de-DE')}</p></div></div><div class="mt-8 flex flex-col items-center"><p class="text-xs text-slate-500 uppercase tracking-wider mb-4">Boarding QR-Code</p><div class="bg-white p-4 border border-slate-200 rounded-2xl"><div id="boarding-qr" class="w-[220px] h-[220px] flex items-center justify-center"></div></div><p class="text-xs text-slate-400 mt-3 text-center">Diesen QR-Code am Gate scannen.</p></div></div></div><div class="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6"><div class="flex gap-4"><div class="text-3xl">📱</div><div><h3 class="font-bold text-lg">QR-Code gescannt?</h3><p class="text-slate-400 text-sm mt-2">Simuliere hier den Scan am Gate. Die Buchung bleibt gespeichert, bis du ausdrücklich bestätigst, dass der QR-Code erfolgreich gescannt wurde.</p></div></div><button id="simulate-scan-btn" type="button" class="mt-6 w-full sm:w-auto border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 px-6 py-3 rounded-xl font-semibold">QR-Code als gescannt markieren</button><div id="scan-confirm-area" class="hidden mt-6 border-t border-slate-800 pt-6"><p class="text-emerald-400 font-semibold">✓ QR-Code wurde erkannt</p><p class="text-sm text-slate-400 mt-2">Bestätige jetzt den erfolgreichen Scan. Danach wird diese Buchung aus IndexedDB gelöscht.</p><button id="confirm-scan-btn" type="button" class="mt-5 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold">Scan bestätigen und Reise abschließen</button></div></div></div>`;

generateQRCode();

document.getElementById('simulate-scan-btn')?.addEventListener('click', markQRAsScanned);
document.getElementById('confirm-scan-btn')?.addEventListener('click', confirmScannedQR);
}

function generateQRCode() {
const container = document.getElementById('boarding-qr');
if (!container) return;

container.innerHTML = '';

if (!currentBooking?.qrCode) {
container.innerHTML = '<div class="w-full h-full flex items-center justify-center text-center text-sm text-red-500 p-4">QR-Code-Daten fehlen.</div>';
return;
}

if (typeof window.QRCode === 'undefined') {
console.error('QRCode-Bibliothek wurde nicht geladen.');
container.innerHTML = '<div class="w-full h-full flex items-center justify-center text-center text-sm text-red-500 p-4">QR-Code-Bibliothek konnte nicht geladen werden.</div>';
return;
}

try {
new window.QRCode(container, {
text: currentBooking.qrCode,
width: 220,
height: 220,
colorDark: '#000000',
colorLight: '#ffffff',
correctLevel: window.QRCode.CorrectLevel.H
});
} catch (error) {
console.error('Fehler beim Generieren des QR-Codes:', error);
container.innerHTML = '<div class="w-full h-full flex items-center justify-center text-center text-sm text-red-500 p-4">QR-Code konnte nicht erzeugt werden.</div>';
}
}

function markQRAsScanned() {
const area = document.getElementById('scan-confirm-area');
const button = document.getElementById('simulate-scan-btn');
area?.classList.remove('hidden');
if (button) {
button.disabled = true;
button.textContent = '✓ QR-Code gescannt';
}
}

async function confirmScannedQR() {
if (!currentBooking) return;
const button = document.getElementById('confirm-scan-btn');
if (button) {
button.disabled = true;
button.textContent = 'Reise wird abgeschlossen...';
}

try {
await EeselDB.deleteBooking(currentBooking.id);
currentBooking = null;
showFinishedJourney();
} catch (error) {
console.error('Fehler beim Abschließen der Reise:', error);
if (button) {
button.disabled = false;
button.textContent = 'Scan bestätigen und Reise abschließen';
}
alert('Die Reise konnte nicht abgeschlossen werden.');
}
}

function showFinishedJourney() {
const container = document.getElementById('checkin-area');
if (!container) return;
container.innerHTML = '<div class="max-w-xl mx-auto text-center bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12"><div class="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-4xl">✓</div><p class="text-emerald-400 uppercase tracking-widest text-sm font-semibold mt-6">Scan bestätigt</p><h2 class="text-3xl font-bold mt-2">Gute Reise!</h2><p class="text-slate-400 mt-4 leading-relaxed">Der QR-Code wurde erfolgreich bestätigt. Erst jetzt wurde die abgeschlossene Buchung aus deiner Browser-Datenbank entfernt.</p><div class="flex flex-col sm:flex-row justify-center gap-3 mt-8"><a href="bookings.html" class="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 rounded-xl font-semibold">Meine Buchungen</a><a href="index.html#flight-search" class="border border-slate-700 hover:bg-slate-800 px-6 py-3 rounded-xl font-semibold">Neue Reise suchen</a></div></div>';
}
