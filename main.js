const CDN_BASE = "https://cdn.jsdelivr.net/gh/srestre/world-countries-cities-db@main";
const AIRPORTS_URL = CDN_BASE + "/airports/airports.json";
const COUNTRIES_URL = CDN_BASE + "/metadata/countries.json";

let airports = [];
let countries = [];
let airportDatabaseReady = false;

let currentSearch = null;
let totalGeneratedFlights = 0;

let fromSuggestionBox = null;
let toSuggestionBox = null;
let fromAutocompleteTimer = null;
let toAutocompleteTimer = null;

const DOM = {
    fromInput: null,
    toInput: null,
    departureDateInput: null,
    returnDateInput: null,
    requestedTimeInput: null,
    searchButton: null,
    errorBox: null,
    resultsSection: null,
    resultsContainer: null,
    resultsDescription: null,
    resultsCount: null,
    databaseStatus: null,
    tripReturn: null,
    tripOneWay: null,
    returnDateWrapper: null,
    loadMoreWrapper: null,
    loadMoreButton: null,
    loadMoreSpinner: null,
    loadMoreText: null
};

const germanCountryNames = {
    "deutschland": "DE",
    "frankreich": "FR",
    "spanien": "ES",
    "italien": "IT",
    "portugal": "PT",
    "niederlande": "NL",
    "belgien": "BE",
    "osterreich": "AT",
    "schweiz": "CH",
    "polen": "PL",
    "tschechien": "CZ",
    "ungarn": "HU",
    "griechenland": "GR",
    "turkei": "TR",
    "vereinigtes konigreich": "GB",
    "grossbritannien": "GB",
    "england": "GB",
    "irland": "IE",
    "norwegen": "NO",
    "schweden": "SE",
    "finnland": "FI",
    "danemark": "DK",
    "island": "IS",
    "kroatien": "HR",
    "serbien": "RS",
    "bulgarien": "BG",
    "rumanien": "RO",
    "slowakei": "SK",
    "slowenien": "SI",
    "vietnam": "VN",
    "thailand": "TH",
    "japan": "JP",
    "china": "CN",
    "indien": "IN",
    "indonesien": "ID",
    "malaysia": "MY",
    "singapur": "SG",
    "sudkorea": "KR",
    "philippinen": "PH",
    "taiwan": "TW",
    "kambodscha": "KH",
    "laos": "LA",
    "usa": "US",
    "vereinigte staaten": "US",
    "amerika": "US",
    "kanada": "CA",
    "mexiko": "MX",
    "brasilien": "BR",
    "argentinien": "AR",
    "chile": "CL",
    "peru": "PE",
    "kolumbien": "CO",
    "australien": "AU",
    "neuseeland": "NZ",
    "sudafrika": "ZA",
    "agypten": "EG",
    "marokko": "MA",
    "kenia": "KE",
    "tansania": "TZ",
    "vereinigte arabische emirate": "AE",
    "vae": "AE",
    "katar": "QA",
    "saudi arabien": "SA",
    "israel": "IL"
};

function cacheDOM() {
    DOM.fromInput = document.getElementById("flight-from");
    DOM.toInput = document.getElementById("flight-to");
    DOM.departureDateInput = document.getElementById("flight-date");
    DOM.returnDateInput = document.getElementById("return-date");
    DOM.requestedTimeInput = document.getElementById("flight-time");
    DOM.searchButton = document.getElementById("search-flights-btn");
    DOM.errorBox = document.getElementById("flight-search-error");
    DOM.resultsSection = document.getElementById("flight-results-section");
    DOM.resultsContainer = document.getElementById("flight-results");
    DOM.resultsDescription = document.getElementById("flight-results-description");
    DOM.resultsCount = document.getElementById("flight-results-count");
    DOM.databaseStatus = document.getElementById("airport-database-status");
    DOM.tripReturn = document.getElementById("trip-return");
    DOM.tripOneWay = document.getElementById("trip-oneway");
    DOM.returnDateWrapper = document.getElementById("return-date-wrapper");
    DOM.loadMoreWrapper = document.getElementById("load-more-wrapper");
    DOM.loadMoreButton = document.getElementById("load-more-flights");
    DOM.loadMoreSpinner = document.getElementById("load-more-spinner");
    DOM.loadMoreText = document.getElementById("load-more-text");
}

async function loadAirportDatabase() {
    try {
        if (DOM.databaseStatus) {
            DOM.databaseStatus.textContent = "Flughafen-Datenbank wird geladen...";
        }
        const [airportResponse, countryResponse] = await Promise.all([
            fetch(AIRPORTS_URL),
            fetch(COUNTRIES_URL)
        ]);
        if (!airportResponse.ok) {
            throw new Error("Flughafen-Datenbank konnte nicht geladen werden.");
        }
        if (!countryResponse.ok) {
            throw new Error("Länder-Datenbank konnte nicht geladen werden.");
        }
        const airportData = await airportResponse.json();
        const countryData = await countryResponse.json();
        airports = Array.isArray(airportData) ? airportData : [];
        countries = Array.isArray(countryData) ? countryData : [];
        airports = airports.filter(airport => {
            const lat = Number(airport.lat);
            const lng = Number(airport.lng);
            if (!airport.name) {
                return false;
            }
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                return false;
            }
            return Boolean(
                airport.iata ||
                airport.icao ||
                airport.type === "large_airport" ||
                airport.type === "medium_airport"
            );
        });
        airportDatabaseReady = true;
        if (DOM.databaseStatus) {
            DOM.databaseStatus.textContent = "✓ " + airports.length.toLocaleString("de-DE") + " Flughäfen geladen";
            DOM.databaseStatus.classList.remove("text-slate-500", "text-red-600");
            DOM.databaseStatus.classList.add("text-emerald-600");
        }
        console.log("Eesel Air:", airports.length, "Flughäfen geladen");
    } catch (error) {
        console.error("Fehler beim Laden der Flughafen-Datenbank:", error);
        airportDatabaseReady = false;
        if (DOM.databaseStatus) {
            DOM.databaseStatus.textContent = "Flughafen-Datenbank konnte nicht geladen werden.";
            DOM.databaseStatus.classList.remove("text-slate-500", "text-emerald-600");
            DOM.databaseStatus.classList.add("text-red-600");
        }
    }
}

function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ß/g, "ss");
}

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = String(value ?? "");
    return element.innerHTML;
}

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getCountryDisplayName(countryCode) {
    if (!countryCode) {
        return "";
    }
    try {
        const displayNames = new Intl.DisplayNames(["de"], { type: "region" });
        return displayNames.of(countryCode) || countryCode;
    } catch (error) {
        return countryCode;
    }
}

function findCountryCode(input) {
    const search = normalizeText(input);
    if (!search) {
        return null;
    }
    if (germanCountryNames[search]) {
        return germanCountryNames[search];
    }
    const country = countries.find(item => {
        const name = normalizeText(item.name || item.country || "");
        const nativeName = normalizeText(item.native || item.native_name || "");
        const iso2 = normalizeText(item.iso2 || item.code || item.alpha2 || "");
        const iso3 = normalizeText(item.iso3 || item.alpha3 || "");
        return name === search || nativeName === search || iso2 === search || iso3 === search;
    });
    if (!country) {
        return null;
    }
    return country.iso2 || country.code || country.alpha2 || null;
}

function sortAirportsByImportance(list) {
    const priority = {
        large_airport: 0,
        medium_airport: 1,
        small_airport: 2,
        seaplane_base: 5,
        heliport: 6,
        closed: 100
    };
    return [...list].sort((a, b) => {
        const aPriority = priority[a.type] ?? 20;
        const bPriority = priority[b.type] ?? 20;
        if (aPriority !== bPriority) {
            return aPriority - bPriority;
        }
        if (a.iata && !b.iata) {
            return -1;
        }
        if (!a.iata && b.iata) {
            return 1;
        }
        return String(a.name || "").localeCompare(String(b.name || ""), "de");
    });
}

function findMainAirportOfCountry(countryCode) {
    if (!countryCode) {
        return null;
    }
    const matches = airports.filter(airport => {
        return airport.iso_country === countryCode && airport.iata;
    });
    if (!matches.length) {
        return null;
    }
    return sortAirportsByImportance(matches)[0];
}

function calculateAirportSuggestionScore(airport, search) {
    const city = normalizeText(airport.municipality);
    const name = normalizeText(airport.name);
    const iata = normalizeText(airport.iata);
    const icao = normalizeText(airport.icao);
    if (iata === search) {
        return 0;
    }
    if (icao === search) {
        return 1;
    }
    if (city === search) {
        return 2;
    }
    if (name === search) {
        return 3;
    }
    if (city.startsWith(search)) {
        return 4;
    }
    if (name.startsWith(search)) {
        return 5;
    }
    if (iata.startsWith(search)) {
        return 6;
    }
    if (icao.startsWith(search)) {
        return 7;
    }
    if (city.includes(search)) {
        return 8;
    }
    if (name.includes(search)) {
        return 9;
    }
    return null;
}

function searchAirportSuggestions(query) {
    const search = normalizeText(query);
    if (!search || search.length < 2) {
        return [];
    }
    const typePriority = {
        large_airport: 0,
        medium_airport: 1,
        small_airport: 2,
        seaplane_base: 5,
        heliport: 6
    };
    const matches = [];
    for (const airport of airports) {
        const score = calculateAirportSuggestionScore(airport, search);
        if (score === null) {
            continue;
        }
        matches.push({
            airport,
            score,
            typePriority: typePriority[airport.type] ?? 20
        });
    }
    matches.sort((a, b) => {
        if (a.score !== b.score) {
            return a.score - b.score;
        }
        if (a.typePriority !== b.typePriority) {
            return a.typePriority - b.typePriority;
        }
        if (a.airport.iata && !b.airport.iata) {
            return -1;
        }
        if (!a.airport.iata && b.airport.iata) {
            return 1;
        }
        return String(a.airport.name || "").localeCompare(String(b.airport.name || ""), "de");
    });
    const result = [];
    const used = new Set();
    for (const item of matches) {
        const airport = item.airport;
        const key = airport.ident || airport.iata || airport.icao || (airport.name + "|" + airport.municipality);
        if (used.has(key)) {
            continue;
        }
        used.add(key);
        result.push(airport);
        if (result.length >= 20) {
            break;
        }
    }
    return result;
}

function createAirportSuggestionBox(id) {
    const existingBox = document.getElementById(id);
    if (existingBox) {
        existingBox.remove();
    }
    const box = document.createElement("div");
    box.id = id;
    box.className = "bg-white text-slate-900 border border-slate-200 rounded-xl shadow-2xl";
    box.style.position = "fixed";
    box.style.zIndex = "2147483647";
    box.style.display = "none";
    box.style.visibility = "hidden";
    box.style.boxSizing = "border-box";
    box.style.overflowX = "hidden";
    box.style.overflowY = "auto";
    box.style.maxHeight = "420px";
    box.style.minHeight = "0";
    box.style.backgroundColor = "#ffffff";
    box.style.isolation = "isolate";
    box.style.pointerEvents = "none";
    box.style.overscrollBehavior = "contain";
    box.style.webkitOverflowScrolling = "touch";
    box.style.transform = "translateZ(0)";
    document.body.appendChild(box);
    return box;
}

function positionSuggestionBox(input, box) {
    if (!input || !box) {
        return;
    }
    const rect = input.getBoundingClientRect();
    const gap = 8;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const desiredHeight = 420;
    const minimumUsefulHeight = 180;
    let openAbove = false;
    if (spaceBelow < minimumUsefulHeight && spaceAbove > spaceBelow) {
        openAbove = true;
    }
    let left = rect.left;
    let width = rect.width;
    if (left + width > viewportWidth - 8) {
        left = Math.max(8, viewportWidth - width - 8);
    }
    if (left < 8) {
        left = 8;
    }
    box.style.left = `${Math.round(left)}px`;
    box.style.width = `${Math.round(width)}px`;
    box.style.right = "auto";
    if (openAbove) {
        const availableHeight = Math.max(
            minimumUsefulHeight,
            Math.min(
                desiredHeight,
                spaceAbove - 12
            )
        );
        box.style.top = "auto";
        box.style.bottom = `${Math.round(viewportHeight - rect.top + gap)}px`;
        box.style.maxHeight = `${Math.floor(availableHeight)}px`;
    } else {
        const availableHeight = Math.max(
            minimumUsefulHeight,
            Math.min(
                desiredHeight,
                spaceBelow - 12
            )
        );
        box.style.bottom = "auto";
        box.style.top = `${Math.round(rect.bottom + gap)}px`;
        box.style.maxHeight = `${Math.floor(availableHeight)}px`;
    }
}

function hideSuggestionBox(box) {
    if (!box) {
        return;
    }
    box.style.display = "none";
    box.style.visibility = "hidden";
    box.style.pointerEvents = "none";
}

function showSuggestionBox(input, box) {
    if (!input || !box) {
        return;
    }
    positionSuggestionBox(input, box);
    box.style.display = "block";
    box.style.visibility = "visible";
    box.style.opacity = "1";
    box.style.pointerEvents = "auto";
}

function hideAllSuggestionBoxes() {
    hideSuggestionBox(fromSuggestionBox);
    hideSuggestionBox(toSuggestionBox);
}

function renderAirportSuggestions(input, box) {
    if (!input || !box) {
        return;
    }
    const query = input.value.trim();
    if (!airportDatabaseReady || query.length < 2) {
        box.innerHTML = "";
        hideSuggestionBox(box);
        return;
    }
    const matches = searchAirportSuggestions(query);
    if (!matches.length) {
        box.innerHTML = `
<div class="px-4 py-4 bg-white">
<p class="text-sm font-semibold text-slate-700">
Kein passender Flughafen gefunden
</p>
<p class="text-xs text-slate-400 mt-1">
Versuche einen Städtenamen, Flughafen oder IATA-Code.
</p>
</div>
`;
        showSuggestionBox(input, box);
        return;
    }
    box.innerHTML = matches.map((airport, index) => {
        const city = airport.municipality || airport.name || "";
        const airportName = airport.name || "";
        const code = airport.iata || airport.icao || "";
        const country = getCountryDisplayName(airport.iso_country);
        return `
<button
type="button"
data-airport-index="${index}"
class="airport-autocomplete-item w-full text-left px-4 py-3 bg-white border-b border-slate-100 last:border-b-0 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition"
>
<div class="flex items-center justify-between gap-4">
<div class="min-w-0">
<div class="flex items-center gap-2">
<span class="text-base shrink-0">
✈
</span>
<p class="font-semibold text-slate-900 truncate">
${escapeHtml(city)}
</p>
</div>
<p class="text-xs text-slate-500 mt-1 truncate">
${escapeHtml(airportName)}
${country ? " · " + escapeHtml(country) : ""}
</p>
</div>
${code ? `
<div class="shrink-0 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 font-bold text-sm px-2.5 py-1">
${escapeHtml(code)}
</div>
`: ""}
</div>
</button>
`;
    }).join("");
    showSuggestionBox(input, box);
    box.querySelectorAll(".airport-autocomplete-item").forEach(button => {
        button.addEventListener("pointerdown", event => {
            event.preventDefault();
            event.stopPropagation();
            const index = Number(button.dataset.airportIndex);
            const airport = matches[index];
            if (!airport) {
                return;
            }
            selectAirportSuggestion(airport, input, box);
        });
    });
}

function selectAirportSuggestion(airport, input, box) {
    if (!airport || !input) {
        return;
    }
    const city = airport.municipality || airport.name || "";
    const code = airport.iata || airport.icao || "";
    input.value = code ? `${city} (${code})` : city;
    input.dataset.airportIdent = airport.ident || "";
    input.dataset.airportIata = airport.iata || "";
    input.dataset.airportIcao = airport.icao || "";
    hideSuggestionBox(box);
    input.dispatchEvent(
        new Event("change", { bubbles: true })
    );
}

function getFirstSuggestionButton(box) {
    if (!box) {
        return null;
    }
    return box.querySelector(".airport-autocomplete-item");
}

function selectFirstAirportSuggestion(input, box) {
    const first = getFirstSuggestionButton(box);
    if (!first) {
        return false;
    }
    first.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
    );
    return true;
}

function setupAirportAutocomplete() {
    const from = DOM.fromInput;
    const to = DOM.toInput;
    if (!from || !to) {
        return;
    }
    if (from.dataset.autocompleteReady === "true") {
        return;
    }
    from.dataset.autocompleteReady = "true";
    to.dataset.autocompleteReady = "true";
    from.setAttribute("autocomplete", "off");
    to.setAttribute("autocomplete", "off");
    fromSuggestionBox = createAirportSuggestionBox("flight-from-suggestions");
    toSuggestionBox = createAirportSuggestionBox("flight-to-suggestions");
    from.addEventListener("input", () => {
        delete from.dataset.airportIdent;
        delete from.dataset.airportIata;
        delete from.dataset.airportIcao;
        clearTimeout(fromAutocompleteTimer);
        fromAutocompleteTimer = setTimeout(() => {
            renderAirportSuggestions(from, fromSuggestionBox);
        }, 80);
    });
    to.addEventListener("input", () => {
        delete to.dataset.airportIdent;
        delete to.dataset.airportIata;
        delete to.dataset.airportIcao;
        clearTimeout(toAutocompleteTimer);
        toAutocompleteTimer = setTimeout(() => {
            renderAirportSuggestions(to, toSuggestionBox);
        }, 80);
    });
    from.addEventListener("focus", () => {
        if (from.value.trim().length >= 2) {
            renderAirportSuggestions(from, fromSuggestionBox);
        }
    });
    to.addEventListener("focus", () => {
        if (to.value.trim().length >= 2) {
            renderAirportSuggestions(to, toSuggestionBox);
        }
    });
    from.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            hideSuggestionBox(fromSuggestionBox);
            return;
        }
        if (
            event.key === "Enter" &&
            fromSuggestionBox &&
            fromSuggestionBox.style.display !== "none"
        ) {
            const selected = selectFirstAirportSuggestion(from, fromSuggestionBox);
            if (selected) {
                event.preventDefault();
            }
        }
    });
    to.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            hideSuggestionBox(toSuggestionBox);
            return;
        }
        if (
            event.key === "Enter" &&
            toSuggestionBox &&
            toSuggestionBox.style.display !== "none"
        ) {
            const selected = selectFirstAirportSuggestion(to, toSuggestionBox);
            if (selected) {
                event.preventDefault();
            }
        }
    });
    document.addEventListener("pointerdown", event => {
        const target = event.target;
        if (
            fromSuggestionBox &&
            !from.contains(target) &&
            !fromSuggestionBox.contains(target)
        ) {
            hideSuggestionBox(fromSuggestionBox);
        }
        if (
            toSuggestionBox &&
            !to.contains(target) &&
            !toSuggestionBox.contains(target)
        ) {
            hideSuggestionBox(toSuggestionBox);
        }
    });
    window.addEventListener("resize", () => {
        if (
            fromSuggestionBox &&
            fromSuggestionBox.style.display === "block"
        ) {
            positionSuggestionBox(from, fromSuggestionBox);
        }
        if (
            toSuggestionBox &&
            toSuggestionBox.style.display === "block"
        ) {
            positionSuggestionBox(to, toSuggestionBox);
        }
    });
    window.addEventListener("scroll", () => {
        if (
            fromSuggestionBox &&
            fromSuggestionBox.style.display === "block"
        ) {
            positionSuggestionBox(from, fromSuggestionBox);
        }
        if (
            toSuggestionBox &&
            toSuggestionBox.style.display === "block"
        ) {
            positionSuggestionBox(to, toSuggestionBox);
        }
    }, true);
}

function findAirport(input) {
    const search = normalizeText(input);
    if (!search) {
        return null;
    }
    const codeMatch = String(input).match(/\(([A-Z0-9]{3,4})\)\s*$/i);
    if (codeMatch) {
        const code = codeMatch[1].toUpperCase();
        const airport = airports.find(item => {
            return (
                (item.iata && item.iata.toUpperCase() === code) ||
                (item.icao && item.icao.toUpperCase() === code)
            );
        });
        if (airport) {
            return airport;
        }
    }
    let airport = airports.find(item => {
        return item.iata && normalizeText(item.iata) === search;
    });
    if (airport) {
        return airport;
    }
    airport = airports.find(item => {
        return item.icao && normalizeText(item.icao) === search;
    });
    if (airport) {
        return airport;
    }
    const cityMatches = airports.filter(item => {
        return item.municipality && normalizeText(item.municipality) === search;
    });
    if (cityMatches.length) {
        return sortAirportsByImportance(cityMatches)[0];
    }
    airport = airports.find(item => {
        return item.name && normalizeText(item.name) === search;
    });
    if (airport) {
        return airport;
    }
    const countryCode = findCountryCode(input);
    if (countryCode) {
        return findMainAirportOfCountry(countryCode);
    }
    const suggestions = searchAirportSuggestions(input);
    return suggestions[0] || null;
}

function getAirportFromInput(input) {
    if (!input) {
        return null;
    }
    const ident = input.dataset.airportIdent;
    if (ident) {
        const exact = airports.find(airport => airport.ident === ident);
        if (exact) {
            return exact;
        }
    }
    const iata = input.dataset.airportIata;
    if (iata) {
        const exact = airports.find(airport => {
            return airport.iata && airport.iata.toUpperCase() === iata.toUpperCase();
        });
        if (exact) {
            return exact;
        }
    }
    const value = input.value.trim();
    const codeMatch = value.match(/\(([A-Z0-9]{3,4})\)\s*$/i);
    if (codeMatch) {
        const code = codeMatch[1].toUpperCase();
        const exact = airports.find(airport => {
            return (
                (airport.iata && airport.iata.toUpperCase() === code) ||
                (airport.icao && airport.icao.toUpperCase() === code)
            );
        });
        if (exact) {
            return exact;
        }
    }
    return findAirport(value);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const earthRadius = 6371;
    const toRadians = value => value * Math.PI / 180;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
}

function estimateFlightDuration(distance) {
    let speed;
    let extraMinutes;
    if (distance < 300) {
        speed = 450;
        extraMinutes = 35;
    }
    else if (distance < 700) {
        speed = 560;
        extraMinutes = 38;
    }
    else if (distance < 1500) {
        speed = 670;
        extraMinutes = 42;
    }
    else if (distance < 3500) {
        speed = 760;
        extraMinutes = 45;
    }
    else if (distance < 7000) {
        speed = 830;
        extraMinutes = 50;
    }
    else {
        speed = 870;
        extraMinutes = 55;
    }
    let minutes =
        Math.round(
            distance /
            speed *
            60
        ) +
        extraMinutes;
    minutes += randomNumber(-10, 18);
    return Math.max(35, minutes);
}

function formatDuration(totalMinutes) {
    const minutes = Number(totalMinutes || 0);
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (!hours) {
        return `${rest} Min.`;
    }
    return hours + " Std. " + String(rest).padStart(2, "0") + " Min.";
}

function timeToMinutes(time) {
    const [hour, minute] = String(time).split(":").map(Number);
    return hour * 60 + minute;
}

function minutesToTime(total) {
    total = ((total % 1440) + 1440) % 1440;
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0");
}

function changeTime(time, difference) {
    return minutesToTime(
        timeToMinutes(time) + difference
    );
}

function randomDepartureTime(requestedTime, minOffset, maxOffset) {
    return changeTime(
        requestedTime,
        randomNumber(minOffset, maxOffset)
    );
}

function createFlightNumber() {
    return "EA " + randomNumber(101, 989);
}

function calculatePrice(distance, returnFlight) {
    let minimum;
    let maximum;
    if (distance < 400) {
        minimum = 49;
        maximum = 99;
    }
    else if (distance < 800) {
        minimum = 59;
        maximum = 139;
    }
    else if (distance < 1500) {
        minimum = 79;
        maximum = 189;
    }
    else if (distance < 3000) {
        minimum = 119;
        maximum = 279;
    }
    else if (distance < 5000) {
        minimum = 189;
        maximum = 399;
    }
    else if (distance < 7000) {
        minimum = 269;
        maximum = 549;
    }
    else if (distance < 9000) {
        minimum = 349;
        maximum = 699;
    }
    else {
        minimum = 449;
        maximum = 849;
    }
    let price = randomNumber(minimum, maximum);
    if (returnFlight) {
        price = Math.round(price * 1.65);
    }
    return price;
}

function formatDate(dateString) {
    if (!dateString) {
        return "";
    }
    const date = new Date(dateString + "T12:00:00");
    return date.toLocaleDateString(
        "de-DE",
        {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}

function showError(message) {
    if (!DOM.errorBox) {
        return;
    }
    DOM.errorBox.textContent = message;
    DOM.errorBox.classList.remove("hidden");
}

function hideError() {
    if (!DOM.errorBox) {
        return;
    }
    DOM.errorBox.classList.add("hidden");
}

function updateTripType() {
    if (
        !DOM.tripOneWay ||
        !DOM.tripReturn ||
        !DOM.returnDateInput ||
        !DOM.returnDateWrapper
    ) {
        return;
    }
    if (DOM.tripOneWay.checked) {
        DOM.returnDateInput.disabled = true;
        DOM.returnDateWrapper.classList.add("opacity-40");
    }
    else {
        DOM.returnDateInput.disabled = false;
        DOM.returnDateWrapper.classList.remove("opacity-40");
    }
}

function searchFlights() {
    hideError();
    if (!airportDatabaseReady) {
        showError("Die Flughafen-Datenbank wird noch geladen.");
        return;
    }
    if (
        !DOM.fromInput ||
        !DOM.toInput ||
        !DOM.departureDateInput ||
        !DOM.requestedTimeInput
    ) {
        showError("Die Flugsuche konnte nicht initialisiert werden.");
        return;
    }
    const fromText = DOM.fromInput.value.trim();
    const toText = DOM.toInput.value.trim();
    const departureDate = DOM.departureDateInput.value;
    const returnDate = DOM.returnDateInput ? DOM.returnDateInput.value : "";
    const requestedTime = DOM.requestedTimeInput.value;
    const isReturn = DOM.tripReturn ? DOM.tripReturn.checked : false;
    if (
        !fromText ||
        !toText ||
        !departureDate ||
        !requestedTime
    ) {
        showError("Bitte fülle Start, Ziel, Datum und Uhrzeit aus.");
        return;
    }
    if (isReturn && !returnDate) {
        showError("Bitte wähle ein Rückflugdatum.");
        return;
    }
    if (
        isReturn &&
        returnDate < departureDate
    ) {
        showError("Der Rückflug darf nicht vor dem Hinflug liegen.");
        return;
    }
    const fromAirport = getAirportFromInput(DOM.fromInput);
    const toAirport = getAirportFromInput(DOM.toInput);
    if (!fromAirport) {
        showError(`Start "${fromText}" wurde nicht gefunden. Bitte wähle einen Flughafen aus den Vorschlägen.`);
        return;
    }
    if (!toAirport) {
        showError(`Ziel "${toText}" wurde nicht gefunden. Bitte wähle einen Flughafen aus den Vorschlägen.`);
        return;
    }
    if (
        fromAirport.ident &&
        toAirport.ident &&
        fromAirport.ident === toAirport.ident
    ) {
        showError("Start und Ziel dürfen nicht derselbe Flughafen sein.");
        return;
    }
    const distance = calculateDistance(
        Number(fromAirport.lat),
        Number(fromAirport.lng),
        Number(toAirport.lat),
        Number(toAirport.lng)
    );
    currentSearch = {
        fromText:
            fromAirport.municipality ||
            fromAirport.name ||
            fromText,
        toText:
            toAirport.municipality ||
            toAirport.name ||
            toText,
        fromAirport,
        toAirport,
        departureDate,
        returnDate,
        requestedTime,
        isReturn,
        distance
    };
    totalGeneratedFlights = 0;
    if (DOM.resultsContainer) {
        DOM.resultsContainer.innerHTML = "";
    }
    hideAllSuggestionBoxes();
    generateFlights(5, true);
    showResults();
}

function generateFlights(amount, initialLoad = false) {
    if (
        !currentSearch ||
        !DOM.resultsContainer
    ) {
        return;
    }
    const flights = [];
    for (let i = 0; i < amount; i++) {
        let departureTime;
        if (initialLoad && i === 2) {
            departureTime = randomDepartureTime(
                currentSearch.requestedTime,
                -7,
                7
            );
        }
        else {
            departureTime = randomDepartureTime(
                currentSearch.requestedTime,
                -125,
                125
            );
        }
        const durationMinutes = estimateFlightDuration(
            currentSearch.distance
        );
        const arrivalTime = changeTime(
            departureTime,
            durationMinutes
        );
        const price = calculatePrice(
            currentSearch.distance,
            currentSearch.isReturn
        );
        flights.push({
            flightNumber: createFlightNumber(),
            departureTime,
            arrivalTime,
            durationMinutes,
            price,
            recommended: initialLoad && i === 2
        });
        totalGeneratedFlights++;
    }
    flights.sort(
        (a, b) =>
            timeToMinutes(a.departureTime) -
            timeToMinutes(b.departureTime)
    );
    for (const flight of flights) {
        DOM.resultsContainer.insertAdjacentHTML(
            "beforeend",
            createFlightCard(flight)
        );
    }
    if (DOM.resultsCount) {
        DOM.resultsCount.textContent =
            totalGeneratedFlights +
            " Flüge gefunden";
    }
}

function createFlightCard(flight) {
    const from = currentSearch.fromAirport;
    const to = currentSearch.toAirport;
    const bookingData = encodeURIComponent(
        JSON.stringify({
            flightNumber: flight.flightNumber,
            from:
                from.municipality ||
                from.name ||
                currentSearch.fromText,
            fromCode:
                from.iata ||
                from.icao ||
                "",
            to:
                to.municipality ||
                to.name ||
                currentSearch.toText,
            toCode:
                to.iata ||
                to.icao ||
                "",
            departureDate: currentSearch.departureDate,
            returnDate: currentSearch.returnDate,
            isReturn: currentSearch.isReturn,
            departureTime: flight.departureTime,
            arrivalTime: flight.arrivalTime,
            durationMinutes: flight.durationMinutes,
            distance: Math.round(currentSearch.distance),
            basePrice: flight.price,
            price: flight.price
        })
    );
    return `
<article class="relative overflow-hidden bg-slate-900 border ${flight.recommended
            ? "border-cyan-500/70"
            : "border-slate-800"
        } rounded-2xl hover:border-cyan-500/50 transition">
${flight.recommended
            ? `
<div class="bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-semibold">
Beste Übereinstimmung mit deiner Wunschzeit
</div>
`
            : ""
        }
<div class="p-5 md:p-7">
<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-7">
<div class="flex items-center gap-4 lg:w-48">
<div class="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xl">
✈
</div>
<div>
<p class="font-semibold text-white">
Eesel Air
</p>
<p class="text-sm text-slate-500">
${escapeHtml(flight.flightNumber)}
</p>
</div>
</div>
<div class="flex-1 grid grid-cols-[auto_1fr_auto] items-center gap-4">
<div>
<p class="text-2xl md:text-3xl font-bold">
${escapeHtml(flight.departureTime)}
</p>
<p class="text-sm text-slate-400 mt-1">
${escapeHtml(from.iata || from.icao || "")}
</p>
<p class="text-xs text-slate-600 mt-1 max-w-36">
${escapeHtml(from.municipality || from.name)}
</p>
</div>
<div>
<p class="text-center text-xs text-slate-500 mb-2">
${formatDuration(flight.durationMinutes)}
</p>
<div class="flex items-center gap-2">
<div class="w-2 h-2 rounded-full bg-cyan-400"></div>
<div class="h-px bg-slate-700 flex-1 relative">
<span class="absolute left-1/2 -translate-x-1/2 -top-3 text-slate-500">
✈
</span>
</div>
<div class="w-2 h-2 rounded-full bg-cyan-400"></div>
</div>
<p class="text-center text-xs text-emerald-400 mt-2">
Direktflug
</p>
</div>
<div class="text-right">
<p class="text-2xl md:text-3xl font-bold">
${escapeHtml(flight.arrivalTime)}
</p>
<p class="text-sm text-slate-400 mt-1">
${escapeHtml(to.iata || to.icao || "")}
</p>
<p class="text-xs text-slate-600 mt-1 max-w-36">
${escapeHtml(to.municipality || to.name)}
</p>
</div>
</div>
<div class="lg:w-44 lg:text-right border-t lg:border-t-0 border-slate-800 pt-5 lg:pt-0">
<p class="text-xs text-slate-500">
${currentSearch.isReturn
            ? "Hin- und Rückflug"
            : "pro Person"
        }
</p>
<p class="text-3xl font-bold text-cyan-400 mt-1">
${flight.price} €
</p>
<button
type="button"
data-booking="${bookingData}"
class="select-flight-btn mt-3 w-full lg:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl transition"
>
Auswählen
</button>
</div>
</div>
<div class="mt-5 pt-4 border-t border-slate-800 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
<span>
✈ ${Math.round(currentSearch.distance).toLocaleString("de-DE")} km
</span>
<span>
Economy
</span>
<span>
1 Handgepäck inklusive
</span>
<span>
${formatDate(currentSearch.departureDate)}
</span>
</div>
</div>
</article>
`;
}

function showResults() {
    if (!currentSearch) {
        return;
    }
    const from = currentSearch.fromAirport;
    const to = currentSearch.toAirport;
    if (DOM.resultsDescription) {
        DOM.resultsDescription.innerHTML = `
<strong class="text-slate-200">
${escapeHtml(from.municipality || from.name)}
${from.iata
                ? " (" + escapeHtml(from.iata) + ")"
                : ""
            }
</strong>
<span class="mx-1 text-slate-600">
→
</span>
<strong class="text-slate-200">
${escapeHtml(to.municipality || to.name)}
${to.iata
                ? " (" + escapeHtml(to.iata) + ")"
                : ""
            }
</strong>
·
${formatDate(currentSearch.departureDate)}
${currentSearch.isReturn
                ? " – " + formatDate(currentSearch.returnDate)
                : ""
            }
· ca.
${Math.round(currentSearch.distance).toLocaleString("de-DE")} km
`;
    }
    DOM.resultsSection?.classList.remove("hidden");
    DOM.loadMoreWrapper?.classList.remove("hidden");
    DOM.resultsSection?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function handleLoadMoreFlights() {
    if (
        !currentSearch ||
        !DOM.loadMoreButton
    ) {
        return;
    }
    DOM.loadMoreButton.disabled = true;
    DOM.loadMoreSpinner?.classList.remove("hidden");
    if (DOM.loadMoreText) {
        DOM.loadMoreText.textContent = "Weitere Flüge werden gesucht...";
    }
    setTimeout(() => {
        generateFlights(5, false);
        DOM.loadMoreSpinner?.classList.add("hidden");
        if (DOM.loadMoreText) {
            DOM.loadMoreText.textContent = "Weitere Flüge";
        }
        DOM.loadMoreButton.disabled = false;
    }, 850);
}

function handleFlightSelection(event) {
    const button = event.target.closest(".select-flight-btn");
    if (!button) {
        return;
    }
    try {
        const encoded = button.dataset.booking;
        if (!encoded) {
            throw new Error("Flugdaten fehlen.");
        }
        const decoded = decodeURIComponent(encoded);
        const flight = JSON.parse(decoded);
        sessionStorage.setItem(
            "eesel_pending_flight",
            JSON.stringify(flight)
        );
        const stored = sessionStorage.getItem("eesel_pending_flight");
        if (!stored) {
            throw new Error("Der Flug konnte nicht zwischengespeichert werden.");
        }
        console.log(
            "Flug für booking.html gespeichert:",
            flight
        );
        window.location.href = "booking.html";
    } catch (error) {
        console.error(
            "Fehler beim Auswählen des Fluges:",
            error
        );
        alert(
            "Der Flug konnte nicht für die Buchung vorbereitet werden."
        );
    }
}

function setupSearchEvents() {
    if (DOM.searchButton) {
        DOM.searchButton.onclick = event => {
            event.preventDefault();
            searchFlights();
        };
    }
    DOM.tripReturn?.addEventListener(
        "change",
        updateTripType
    );
    DOM.tripOneWay?.addEventListener(
        "change",
        updateTripType
    );
    DOM.loadMoreButton?.addEventListener(
        "click",
        handleLoadMoreFlights
    );
    document.addEventListener(
        "click",
        handleFlightSelection
    );
}

function setupDates() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(
        today.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
        today.getDate()
    ).padStart(2, "0");
    const todayString =
        `${year}-${month}-${day}`;
    if (DOM.departureDateInput) {
        DOM.departureDateInput.min = todayString;
    }
    if (DOM.returnDateInput) {
        DOM.returnDateInput.min = todayString;
    }
    DOM.departureDateInput?.addEventListener(
        "change",
        () => {
            if (!DOM.returnDateInput) {
                return;
            }
            DOM.returnDateInput.min =
                DOM.departureDateInput.value ||
                todayString;
            if (
                DOM.returnDateInput.value &&
                DOM.departureDateInput.value &&
                DOM.returnDateInput.value <
                DOM.departureDateInput.value
            ) {
                DOM.returnDateInput.value =
                    DOM.departureDateInput.value;
            }
        }
    );
}

function initializeEeselAir() {
    cacheDOM();
    const hasFlightSearch =
        DOM.fromInput &&
        DOM.toInput &&
        DOM.searchButton;
    if (!hasFlightSearch) {
        return;
    }
    setupAirportAutocomplete();
    setupSearchEvents();
    setupDates();
    updateTripType();
    loadAirportDatabase();
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeEeselAir
    );
}
else {
    initializeEeselAir();
}

window.searchFlights = searchFlights;