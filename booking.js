document.addEventListener('DOMContentLoaded', initBooking);

let flight = null;
let currentStep = 1;

const bookingState = {
passenger: { title: '', firstName: '', lastName: '', birthDate: '', email: '', phone: '' },
seat: { number: '', price: 0 },
baggage: { type: 'none', label: 'Kein zusätzliches Aufgabegepäck', price: 0 },
payment: { method: 'card', holder: '', last4: '' }
};

function escapeHtml(value) {
const div = document.createElement('div');
div.textContent = String(value ?? '');
return div.innerHTML;
}

function formatDate(dateString) {
if (!dateString) return '';
return new Date(dateString + 'T12:00:00').toLocaleDateString('de-DE', {
weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
});
}

function getTotalPrice() {
return Number(flight?.basePrice ?? flight?.price ?? 0) + Number(bookingState.seat.price || 0) + Number(bookingState.baggage.price || 0);
}

function initBooking() {
const raw = sessionStorage.getItem('eesel_pending_flight');
const app = document.getElementById('booking-app');
const errorBox = document.getElementById('booking-error');

if (!raw) {
app?.classList.add('hidden');
if (errorBox) {
errorBox.classList.remove('hidden');
errorBox.innerHTML = '<h2 class="font-bold text-xl">Kein Flug ausgewählt</h2><p class="mt-2">Bitte wähle zuerst auf der Startseite einen Flug aus.</p><a href="index.html#flight-search" class="inline-block mt-5 bg-cyan-500 px-5 py-3 rounded-xl font-semibold">Zur Flugsuche</a>';
}
return;
}

try {
flight = JSON.parse(raw);
if (!flight.flightNumber || !flight.fromCode || !flight.toCode || !flight.departureDate || !flight.departureTime) throw new Error('Flugdaten unvollständig.');
renderFlightSummary();
renderPriceSummary();
renderStep();
} catch (error) {
console.error(error);
app?.classList.add('hidden');
if (errorBox) {
errorBox.classList.remove('hidden');
errorBox.textContent = 'Flugdaten konnten nicht gelesen werden.';
}
}
}

function renderFlightSummary() {
const container = document.getElementById('selected-flight-summary');
if (!container || !flight) return;
container.innerHTML = `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-6"><div class="grid md:grid-cols-[160px_1fr_160px] gap-6 items-center"><div><div class="font-semibold">${escapeHtml(flight.flightNumber)}</div><div class="text-sm text-slate-500">Eesel Air · Economy</div></div><div class="grid grid-cols-[auto_1fr_auto] gap-5 items-center"><div><div class="text-3xl font-bold">${escapeHtml(flight.departureTime)}</div><div class="text-cyan-400 font-semibold">${escapeHtml(flight.fromCode)}</div><div class="text-xs text-slate-500">${escapeHtml(flight.from)}</div></div><div><div class="h-px bg-slate-700"></div><div class="text-center text-xs text-emerald-400 mt-2">Direktflug</div></div><div class="text-right"><div class="text-3xl font-bold">${escapeHtml(flight.arrivalTime)}</div><div class="text-cyan-400 font-semibold">${escapeHtml(flight.toCode)}</div><div class="text-xs text-slate-500">${escapeHtml(flight.to)}</div></div></div><div class="md:text-right"><div class="text-sm text-slate-500">${formatDate(flight.departureDate)}</div><div class="text-2xl font-bold text-cyan-400">${Number(flight.basePrice ?? flight.price ?? 0).toFixed(0)} €</div></div></div></div>`;
}

function renderPriceSummary() {
const container = document.getElementById('price-summary');
if (!container || !flight) return;
container.innerHTML = `<div class="flex justify-between text-sm"><span class="text-slate-400">Flug</span><span>${Number(flight.basePrice ?? flight.price ?? 0).toFixed(0)} €</span></div><div class="flex justify-between text-sm"><span class="text-slate-400">Sitzplatz</span><span>${Number(bookingState.seat.price).toFixed(0)} €</span></div><div class="flex justify-between text-sm"><span class="text-slate-400">Gepäck</span><span>${Number(bookingState.baggage.price).toFixed(0)} €</span></div><div class="border-t border-slate-800 pt-4 flex justify-between"><strong>Gesamt</strong><strong class="text-xl text-cyan-400">${getTotalPrice().toFixed(0)} €</strong></div>`;
}

function updateProgress() {
document.querySelectorAll('[data-progress]').forEach(element => {
const step = Number(element.dataset.progress);
const circle = element.querySelector('.step-circle');
const label = element.querySelector('p');
if (!circle || !label) return;
circle.className = `step-circle mx-auto w-9 h-9 rounded-full ${step <= currentStep ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-500'} flex items-center justify-center font-bold`;
label.className = `text-xs mt-2 ${step <= currentStep ? 'text-slate-300' : 'text-slate-500'}`;
});
}

function renderStep() {
updateProgress();
if (currentStep === 1) renderPassengerStep();
else if (currentStep === 2) renderSeatStep();
else if (currentStep === 3) renderBaggageStep();
else if (currentStep === 4) renderPaymentStep();
else renderReviewStep();
}

function renderPassengerStep() {
const container = document.getElementById('booking-step');
container.innerHTML = `<p class="text-cyan-400 text-sm font-semibold">SCHRITT 1 VON 5</p><h2 class="text-2xl font-bold mt-2">Angaben zum Reisenden</h2><form id="passenger-form" class="mt-7 grid md:grid-cols-2 gap-5"><select id="passenger-title" required class="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3"><option value="">Anrede</option><option value="Frau">Frau</option><option value="Herr">Herr</option><option value="Divers">Divers</option></select><input id="passenger-birth" type="date" required class="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3"><input id="passenger-first" placeholder="Vorname" required class="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3"><input id="passenger-last" placeholder="Nachname" required class="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3"><input id="passenger-email" type="email" placeholder="E-Mail" required class="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3"><input id="passenger-phone" placeholder="Telefon" required class="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3"><div class="md:col-span-2 text-right"><button class="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 rounded-xl font-semibold">Weiter zum Sitzplatz →</button></div></form>`;

document.getElementById('passenger-title').value = bookingState.passenger.title;
document.getElementById('passenger-birth').value = bookingState.passenger.birthDate;
document.getElementById('passenger-first').value = bookingState.passenger.firstName;
document.getElementById('passenger-last').value = bookingState.passenger.lastName;
document.getElementById('passenger-email').value = bookingState.passenger.email;
document.getElementById('passenger-phone').value = bookingState.passenger.phone;

document.getElementById('passenger-form').addEventListener('submit', event => {
event.preventDefault();
bookingState.passenger = {
title: document.getElementById('passenger-title').value,
birthDate: document.getElementById('passenger-birth').value,
firstName: document.getElementById('passenger-first').value.trim(),
lastName: document.getElementById('passenger-last').value.trim(),
email: document.getElementById('passenger-email').value.trim(),
phone: document.getElementById('passenger-phone').value.trim()
};
currentStep = 2;
renderStep();
});
}

const seatOptions = [['4A',25],['4B',18],['4C',25],['4D',25],['4E',18],['4F',25],['8A',15],['8B',10],['8C',15],['8D',15],['8E',10],['8F',15],['12A',9],['12B',0],['12C',9],['12D',9],['12E',0],['12F',9]];

function renderSeatStep() {
const container = document.getElementById('booking-step');
container.innerHTML = `<p class="text-cyan-400 text-sm font-semibold">SCHRITT 2 VON 5</p><h2 class="text-2xl font-bold mt-2">Sitzplatz auswählen</h2><div class="mt-7 grid grid-cols-6 gap-3">${seatOptions.map(([number, price]) => `<button type="button" data-seat="${number}" data-price="${price}" class="seat-option border ${bookingState.seat.number === number ? 'border-cyan-400 bg-cyan-500/20' : 'border-slate-700 bg-slate-950'} rounded-xl p-3"><strong>${number}</strong><div class="text-xs text-slate-500">${price ? `+${price} €` : 'inklusive'}</div></button>`).join('')}</div><div class="mt-8 flex justify-between"><button id="seat-back" type="button" class="border border-slate-700 px-5 py-3 rounded-xl">← Zurück</button><button id="seat-next" type="button" class="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 rounded-xl font-semibold">Weiter zum Gepäck →</button></div>`;

document.querySelectorAll('.seat-option').forEach(button => button.addEventListener('click', () => {
bookingState.seat = { number: button.dataset.seat, price: Number(button.dataset.price) };
renderPriceSummary();
renderSeatStep();
}));

document.getElementById('seat-back').addEventListener('click', () => { currentStep = 1; renderStep(); });
document.getElementById('seat-next').addEventListener('click', () => {
if (!bookingState.seat.number) return alert('Bitte wähle einen Sitzplatz.');
currentStep = 3;
renderStep();
});
}

const baggageOptions = [
{ type: 'none', label: 'Kein zusätzliches Aufgabegepäck', price: 0 },
{ type: '15kg', label: '15 kg Aufgabegepäck', price: 29 },
{ type: '23kg', label: '23 kg Aufgabegepäck', price: 45 },
{ type: '32kg', label: '32 kg Aufgabegepäck', price: 79 }
];

function renderBaggageStep() {
const container = document.getElementById('booking-step');
container.innerHTML = `<p class="text-cyan-400 text-sm font-semibold">SCHRITT 3 VON 5</p><h2 class="text-2xl font-bold mt-2">Gepäck auswählen</h2><div class="mt-7 space-y-4">${baggageOptions.map(option => `<button type="button" data-bag="${option.type}" class="bag-option w-full text-left border ${bookingState.baggage.type === option.type ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-800 bg-slate-950'} rounded-2xl p-5 flex justify-between"><span>${option.label}</span><strong class="text-cyan-400">${option.price ? `+${option.price} €` : '0 €'}</strong></button>`).join('')}</div><div class="mt-8 flex justify-between"><button id="baggage-back" type="button" class="border border-slate-700 px-5 py-3 rounded-xl">← Zurück</button><button id="baggage-next" type="button" class="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 rounded-xl font-semibold">Weiter zur Bezahlung →</button></div>`;

document.querySelectorAll('.bag-option').forEach(button => button.addEventListener('click', () => {
bookingState.baggage = { ...baggageOptions.find(item => item.type === button.dataset.bag) };
renderPriceSummary();
renderBaggageStep();
}));

document.getElementById('baggage-back').addEventListener('click', () => { currentStep = 2; renderStep(); });
document.getElementById('baggage-next').addEventListener('click', () => { currentStep = 4; renderStep(); });
}

function renderPaymentStep() {
const container = document.getElementById('booking-step');
container.innerHTML = `<p class="text-cyan-400 text-sm font-semibold">SCHRITT 4 VON 5</p><h2 class="text-2xl font-bold mt-2">Bezahlung</h2><p class="text-slate-400 mt-2">Demo-Zahlung – es wird nichts abgebucht.</p><form id="payment-form" class="mt-7 grid md:grid-cols-2 gap-5"><input id="card-holder" placeholder="Karteninhaber" required class="md:col-span-2 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3"><input id="card-number" placeholder="1234 5678 9012 3456" required maxlength="19" inputmode="numeric" class="md:col-span-2 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3"><input id="card-expiry" placeholder="MM/JJ" required maxlength="5" class="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3"><input id="card-cvc" placeholder="CVC" required maxlength="4" inputmode="numeric" class="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3"><div class="md:col-span-2 flex justify-between"><button id="payment-back" type="button" class="border border-slate-700 px-5 py-3 rounded-xl">← Zurück</button><button class="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 rounded-xl font-semibold">Weiter zur Prüfung →</button></div></form>`;

const cardNumber = document.getElementById('card-number');
cardNumber.addEventListener('input', event => {
const digits = event.target.value.replace(/\D/g, '').slice(0, 16);
event.target.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
});

document.getElementById('payment-back').addEventListener('click', () => { currentStep = 3; renderStep(); });
document.getElementById('payment-form').addEventListener('submit', event => {
event.preventDefault();
const digits = cardNumber.value.replace(/\D/g, '');
if (digits.length < 12) return alert('Bitte gib eine gültige Demo-Kartennummer ein.');
bookingState.payment = { method: 'card', holder: document.getElementById('card-holder').value.trim(), last4: digits.slice(-4) };
currentStep = 5;
renderStep();
});
}

function renderReviewStep() {
const container = document.getElementById('booking-step');
container.innerHTML = `<p class="text-cyan-400 text-sm font-semibold">SCHRITT 5 VON 5</p><h2 class="text-2xl font-bold mt-2">Buchung prüfen</h2><div class="mt-7 space-y-4"><div class="bg-slate-950 border border-slate-800 rounded-xl p-5">${escapeHtml(bookingState.passenger.title)} ${escapeHtml(bookingState.passenger.firstName)} ${escapeHtml(bookingState.passenger.lastName)}</div><div class="grid sm:grid-cols-2 gap-4"><div class="bg-slate-950 border border-slate-800 rounded-xl p-5">Sitz: <strong>${escapeHtml(bookingState.seat.number)}</strong></div><div class="bg-slate-950 border border-slate-800 rounded-xl p-5">${escapeHtml(bookingState.baggage.label)}</div></div><div class="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-5 flex justify-between"><span>Gesamt</span><strong class="text-2xl text-cyan-400">${getTotalPrice().toFixed(0)} €</strong></div></div><label class="flex gap-3 mt-7 text-sm text-slate-400"><input id="final-confirmation" type="checkbox" class="accent-cyan-500 mt-1"><span>Ich bestätige die Buchung und möchte sie verbindlich speichern.</span></label><div class="mt-8 flex justify-between"><button id="review-back" type="button" class="border border-slate-700 px-5 py-3 rounded-xl">← Zurück</button><button id="confirm-booking" type="button" class="bg-gradient-to-r from-cyan-500 to-blue-600 px-7 py-3 rounded-xl font-semibold">Buchung bestätigen · ${getTotalPrice().toFixed(0)} €</button></div>`;

document.getElementById('review-back').addEventListener('click', () => { currentStep = 4; renderStep(); });
document.getElementById('confirm-booking').addEventListener('click', confirmBooking);
}

async function confirmBooking() {
const checkbox = document.getElementById('final-confirmation');
const button = document.getElementById('confirm-booking');
if (!checkbox?.checked) return alert('Bitte bestätige zuerst die Buchung.');
button.disabled = true;
button.textContent = 'Buchung wird gespeichert...';

const finalBooking = {
airline: 'Eesel Air',
flightNumber: flight.flightNumber,
from: flight.from,
fromCode: flight.fromCode,
to: flight.to,
toCode: flight.toCode,
departureDate: flight.departureDate,
departureTime: flight.departureTime,
arrivalTime: flight.arrivalTime,
durationMinutes: Number(flight.durationMinutes),
distance: Number(flight.distance),
basePrice: Number(flight.basePrice ?? flight.price ?? 0),
price: getTotalPrice(),
passenger: { ...bookingState.passenger },
seat: { ...bookingState.seat },
baggage: { ...bookingState.baggage },
payment: { method: 'card', holder: bookingState.payment.holder, last4: bookingState.payment.last4, status: 'paid-demo' },
paymentStatus: 'paid',
checkedIn: false,
checkinStarted: false,
qrCode: null,
qrCreatedAt: null,
scanConfirmed: false,
status: 'booked'
};

try {
if (!window.EeselDB) throw new Error('EeselDB wurde nicht geladen.');
const saved = await EeselDB.saveBooking(finalBooking);
const verify = await EeselDB.getBooking(saved.id);
if (!verify) throw new Error('Speichern konnte nicht verifiziert werden.');
sessionStorage.removeItem('eesel_pending_flight');
showConfirmation(verify);
} catch (error) {
console.error(error);
button.disabled = false;
button.textContent = `Buchung bestätigen · ${getTotalPrice().toFixed(0)} €`;
alert('Die Buchung konnte nicht dauerhaft gespeichert werden.');
}
}

function showConfirmation(booking) {
document.getElementById('booking-step').innerHTML = `<div class="text-center py-8"><div class="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-4xl">✓</div><p class="text-emerald-400 font-semibold mt-6">BUCHUNG ERFOLGREICH GESPEICHERT</p><h2 class="text-3xl font-bold mt-2">Dein Flug ist gebucht</h2><p class="text-slate-400 mt-3">Die Buchung wurde dauerhaft in IndexedDB gespeichert.</p><div class="max-w-md mx-auto mt-8 bg-slate-950 border border-slate-800 rounded-2xl p-6"><p class="text-xs text-slate-500">BUCHUNGSCODE</p><p class="text-3xl font-bold tracking-wider text-cyan-400 mt-2">${escapeHtml(booking.bookingCode)}</p><p class="mt-5">${escapeHtml(booking.fromCode)} → ${escapeHtml(booking.toCode)} · ${formatDate(booking.departureDate)} · ${escapeHtml(booking.departureTime)}</p></div><div class="flex flex-col sm:flex-row justify-center gap-3 mt-8"><a href="bookings.html" class="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 rounded-xl font-semibold">Meine Buchungen</a><a href="checkin.html?id=${encodeURIComponent(booking.id)}" class="border border-cyan-500/40 text-cyan-300 px-6 py-3 rounded-xl font-semibold">Online Check-in</a><a href="index.html" class="border border-slate-700 px-6 py-3 rounded-xl font-semibold">Zur Startseite</a></div></div>`;
document.getElementById('price-summary').innerHTML = `<div class="text-center"><p class="text-emerald-400 font-semibold">✓ Bezahlt und gespeichert</p><p class="text-3xl font-bold mt-2">${Number(booking.price).toFixed(0)} €</p></div>`;
}
