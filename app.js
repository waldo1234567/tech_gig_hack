// Mobile-first, in-browser only app. No external frameworks.
// Features switch based on orientation:
// - portrait-primary: Alarm Clock
// - landscape-primary: Stopwatch
// - portrait-secondary: Timer
// - landscape-secondary: Weather of the Day

const orientationLabel = document.getElementById('orientation-label');
const views = {
	'alarm': document.getElementById('view-alarm'),
	'stopwatch': document.getElementById('view-stopwatch'),
	'timer': document.getElementById('view-timer'),
	'weather': document.getElementById('view-weather'),
};

function setActiveView(key) {
	for (const [k, el] of Object.entries(views)) {
		el.hidden = k !== key;
	}
}

// Orientation detection with robust fallbacks
function getOrientationType() {
	const screenOrientation = screen.orientation || screen.msOrientation || screen.mozOrientation;
	if (screenOrientation && screenOrientation.type) return screenOrientation.type; // e.g., 'portrait-primary'

	// Fallback via window.orientation (legacy iOS Safari)
	const angle = typeof window.orientation === 'number' ? window.orientation : window.screen?.orientation?.angle;
	const isPortrait = matchMedia('(orientation: portrait)').matches;
	if (isPortrait) {
		return angle === 180 ? 'portrait-secondary' : 'portrait-primary';
	} else {
		// angle 0/180 depends, use heuristic
		return angle === 180 ? 'landscape-secondary' : 'landscape-primary';
	}
}

function updateByOrientation() {
	const type = getOrientationType();
	orientationLabel.textContent = type.replace('-', ' ');
	if (type.startsWith('portrait')) {
		if (type.endsWith('primary')) setActiveView('alarm');
		else setActiveView('timer');
	} else if (type.startsWith('landscape')) {
		if (type.endsWith('primary')) setActiveView('stopwatch');
		else setActiveView('weather');
	}
}

// Listen to orientation changes
['orientationchange', 'resize'].forEach(evt => window.addEventListener(evt, () => {
	updateByOrientation();
}, { passive: true }));

if (screen.orientation && screen.orientation.addEventListener) {
	screen.orientation.addEventListener('change', updateByOrientation, { passive: true });
}

// Initialize
updateByOrientation();

// ================= Alarm =================
const clockTimeEl = document.getElementById('clock-time');
const alarmForm = document.getElementById('alarm-form');
const alarmTimeInput = document.getElementById('alarm-time');
const setAlarmBtn = document.getElementById('set-alarm');
const clearAlarmBtn = document.getElementById('clear-alarm');
const alarmStatusEl = document.getElementById('alarm-status');
const alarmRingingEl = document.getElementById('alarm-ringing');
const alarmStopBtn = document.getElementById('alarm-stop');
const alarmSnoozeBtn = document.getElementById('alarm-snooze');

let alarmTimeoutId = null;
let alarmTargetMs = null;
let alarmAudio = null;

function formatClock(date) {
	const h = String(date.getHours()).padStart(2, '0');
	const m = String(date.getMinutes()).padStart(2, '0');
	const s = String(date.getSeconds()).padStart(2, '0');
	return `${h}:${m}:${s}`;
}

function tickClock() {
	clockTimeEl.textContent = formatClock(new Date());
}
setInterval(tickClock, 500);
tickClock();

function scheduleAlarm(targetDate) {
	const now = Date.now();
	const delay = Math.max(0, targetDate.getTime() - now);
	clearTimeout(alarmTimeoutId);
	alarmTimeoutId = setTimeout(triggerAlarm, delay);
	alarmTargetMs = targetDate.getTime();
	alarmStatusEl.textContent = `Alarm set for ${targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function triggerAlarm() {
	alarmRingingEl.hidden = false;
	alarmStatusEl.textContent = 'Alarm ringing!';
	try {
		if (!alarmAudio) {
			alarmAudio = new Audio('data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAA...');
			// Using a tiny silent-then-beep placeholder; browsers may block without interaction.
		}
		alarmAudio.loop = true;
		alarmAudio.play().catch(() => {});
	} catch (e) {}
}

function stopAlarmAudio() {
	if (alarmAudio) {
		try { alarmAudio.pause(); } catch (e) {}
		alarmAudio.currentTime = 0;
	}
}

alarmForm.addEventListener('submit', (e) => {
	e.preventDefault();
	const value = alarmTimeInput.value; // HH:MM
	if (!value) return;
	const [hh, mm] = value.split(':').map(Number);
	const now = new Date();
	const target = new Date();
	target.setHours(hh, mm, 0, 0);
	if (target.getTime() <= now.getTime()) {
		// schedule for next day
		target.setDate(target.getDate() + 1);
	}
	scheduleAlarm(target);
	alarmRingingEl.hidden = true;
});

clearAlarmBtn.addEventListener('click', () => {
	clearTimeout(alarmTimeoutId);
	alarmTimeoutId = null;
	alarmTargetMs = null;
	alarmStatusEl.textContent = 'Alarm cleared';
	alarmRingingEl.hidden = true;
	stopAlarmAudio();
});

alarmStopBtn.addEventListener('click', () => {
	alarmRingingEl.hidden = true;
	alarmStatusEl.textContent = 'Alarm stopped';
	stopAlarmAudio();
});

alarmSnoozeBtn.addEventListener('click', () => {
	const snoozeMs = 5 * 60 * 1000;
	const target = new Date(Date.now() + snoozeMs);
	scheduleAlarm(target);
	alarmRingingEl.hidden = true;
	stopAlarmAudio();
});

// ================= Stopwatch =================
const swTimeEl = document.getElementById('stopwatch-time');
const swStartStopBtn = document.getElementById('sw-start-stop');
const swLapBtn = document.getElementById('sw-lap');
const swResetBtn = document.getElementById('sw-reset');
const swLapsEl = document.getElementById('sw-laps');

let swRunning = false;
let swStartEpoch = 0;
let swElapsedMs = 0;
let swRafId = 0;

function formatStopwatch(ms) {
	const totalCentis = Math.floor(ms / 10);
	const minutes = Math.floor(totalCentis / 6000);
	const seconds = Math.floor((totalCentis % 6000) / 100);
	const centis = totalCentis % 100;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

function swTick() {
	if (swRunning) {
		const now = performance.now();
		swElapsedMs = now - swStartEpoch;
		swTimeEl.textContent = formatStopwatch(swElapsedMs);
		swRafId = requestAnimationFrame(swTick);
	}
}

swStartStopBtn.addEventListener('click', () => {
	if (!swRunning) {
		swRunning = true;
		swStartEpoch = performance.now() - swElapsedMs;
		swRafId = requestAnimationFrame(swTick);
		swStartStopBtn.textContent = 'Pause';
	} else {
		swRunning = false;
		cancelAnimationFrame(swRafId);
		swStartStopBtn.textContent = 'Start';
	}
});

swLapBtn.addEventListener('click', () => {
	const li = document.createElement('li');
	const lapIndex = swLapsEl.children.length + 1;
	li.innerHTML = `<span>Lap ${lapIndex}</span><span>${formatStopwatch(swElapsedMs)}</span>`;
	swLapsEl.prepend(li);
});

swResetBtn.addEventListener('click', () => {
	swRunning = false;
	cancelAnimationFrame(swRafId);
	swElapsedMs = 0;
	swTimeEl.textContent = '00:00.00';
	swStartStopBtn.textContent = 'Start';
	swLapsEl.innerHTML = '';
});

// ================= Timer =================
const timerTimeEl = document.getElementById('timer-time');
const timerRing = document.getElementById('timer-ring');
const timerStartStopBtn = document.getElementById('timer-start-stop');
const timerResetBtn = document.getElementById('timer-reset');
const timerMinInput = document.getElementById('timer-min');
const timerSecInput = document.getElementById('timer-sec');
const timerStatusEl = document.getElementById('timer-status');
const timerForm = document.getElementById('timer-form');

let timerTotalMs = 0;
let timerRemainingMs = 0;
let timerEndEpoch = 0;
let timerRunning = false;
let timerRafId = 0;

function formatTimer(ms) {
	const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function drawRing(progress) {
	const ctx = timerRing.getContext('2d');
	const size = timerRing.width;
	const center = size / 2;
	const radius = center - 8;
	ctx.clearRect(0, 0, size, size);
	ctx.lineWidth = 10;
	// background
	ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ring');
	ctx.beginPath();
	ctx.arc(center, center, radius, 0, Math.PI * 2);
	ctx.stroke();
	// progress
	ctx.strokeStyle = '#22d3ee';
	ctx.beginPath();
	const start = -Math.PI / 2;
	ctx.arc(center, center, radius, start, start + Math.PI * 2 * progress);
	ctx.stroke();
}

function timerTick() {
	if (!timerRunning) return;
	const now = performance.now();
	const remaining = Math.max(0, timerEndEpoch - now);
	timerRemainingMs = remaining;
	timerTimeEl.textContent = formatTimer(remaining);
	const progress = timerTotalMs === 0 ? 0 : (timerTotalMs - remaining) / timerTotalMs;
	drawRing(progress);
	if (remaining <= 0) {
		timerRunning = false;
		timerStatusEl.textContent = 'Time is up!';
		try { new Notification('Timer complete'); } catch (e) {}
		vibrate([200, 100, 200, 100, 200]);
		return;
	}
	timerRafId = requestAnimationFrame(timerTick);
}

function getTimerInputMs() {
	const min = parseInt(timerMinInput.value || '0', 10) || 0;
	const sec = parseInt(timerSecInput.value || '0', 10) || 0;
	return (min * 60 + sec) * 1000;
}

timerStartStopBtn.addEventListener('click', () => {
	if (!timerRunning) {
		timerTotalMs = timerRemainingMs > 0 ? timerRemainingMs : getTimerInputMs();
		if (timerTotalMs <= 0) {
			timerStatusEl.textContent = 'Set a duration first';
			return;
		}
		timerRunning = true;
		timerEndEpoch = performance.now() + timerTotalMs;
		timerStatusEl.textContent = 'Running…';
		timerRafId = requestAnimationFrame(timerTick);
		timerStartStopBtn.textContent = 'Pause';
	} else {
		// pause
		timerRunning = false;
		cancelAnimationFrame(timerRafId);
		timerRemainingMs = Math.max(0, timerEndEpoch - performance.now());
		timerStatusEl.textContent = 'Paused';
		timerStartStopBtn.textContent = 'Resume';
	}
});

timerResetBtn.addEventListener('click', () => {
	timerRunning = false;
	cancelAnimationFrame(timerRafId);
	timerRemainingMs = 0;
	timerTotalMs = 0;
	timerTimeEl.textContent = '00:00';
	drawRing(0);
	timerStartStopBtn.textContent = 'Start';
	timerStatusEl.textContent = '';
});

timerForm.addEventListener('click', (e) => {
	const btn = e.target.closest('[data-preset]');
	if (!btn) return;
	const seconds = parseInt(btn.getAttribute('data-preset'), 10) || 0;
	timerMinInput.value = String(Math.floor(seconds / 60));
	timerSecInput.value = String(seconds % 60);
	drawRing(0);
	timerTimeEl.textContent = formatTimer(seconds * 1000);
});

// ================= Weather =================
const weatherLocationEl = document.getElementById('weather-location');
const weatherTempEl = document.getElementById('weather-temp');
const weatherDescEl = document.getElementById('weather-desc');
const weatherExtraEl = document.getElementById('weather-extra');
const weatherIconEl = document.getElementById('weather-icon');

async function fetchWeather(lat, lon) {
	const url = new URL('https://api.open-meteo.com/v1/forecast');
	url.searchParams.set('latitude', String(lat));
	url.searchParams.set('longitude', String(lon));
	url.searchParams.set('current_weather', 'true');
	url.searchParams.set('hourly', 'relative_humidity_2m,apparent_temperature,precipitation_probability,uv_index');
	url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_hours');
	url.searchParams.set('timezone', 'auto');
	const res = await fetch(url.toString());
	if (!res.ok) throw new Error('Weather fetch failed');
	return res.json();
}

function iconFor(code) {
	// Simplified mapping
	// https://open-meteo.com/en/docs#api_form
	const map = new Map([
		[[0], '☀️'],
		[[1, 2], '🌤️'],
		[[3], '☁️'],
		[[45, 48], '🌫️'],
		[[51, 53, 55], '🌦️'],
		[[61, 63, 65], '🌧️'],
		[[71, 73, 75], '❄️'],
		[[80, 81, 82], '🌧️'],
		[[95, 96, 99], '⛈️'],
	]);
	for (const [keys, emoji] of map.entries()) {
		if (keys.includes(code)) return emoji;
	}
	return '⛅️';
}

function describeWeather(code, wind) {
	const desc = {
		0: 'Clear sky',
		1: 'Mainly clear',
		2: 'Partly cloudy',
		3: 'Overcast',
		45: 'Fog',
		48: 'Depositing rime fog',
		51: 'Light drizzle',
		53: 'Moderate drizzle',
		55: 'Heavy drizzle',
		61: 'Light rain',
		63: 'Moderate rain',
		65: 'Heavy rain',
		71: 'Light snow',
		73: 'Moderate snow',
		75: 'Heavy snow',
		80: 'Rain showers',
		81: 'Rain showers',
		82: 'Violent rain showers',
		95: 'Thunderstorm',
		96: 'Thunderstorm with hail',
		99: 'Thunderstorm with hail',
	};
	const text = desc[code] || 'Weather';
	if (typeof wind === 'number') return `${text} • ${Math.round(wind)} km/h wind`;
	return text;
}

async function loadWeatherWithGeo() {
	function fallback() {
		// Default to New York City fallback
		return { coords: { latitude: 40.7128, longitude: -74.0060 }, label: 'New York, USA (fallback)' };
	}
	const permission = await navigator.permissions?.query?.({ name: 'geolocation' }).catch(() => null);
	const shouldAsk = !permission || permission.state !== 'denied';
	let coords;
	if (shouldAsk && navigator.geolocation) {
		coords = await new Promise(resolve => {
			navigator.geolocation.getCurrentPosition(
				(pos) => resolve({ coords: pos.coords, label: 'Your location' }),
				() => resolve(fallback()),
				{ enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
			);
		});
	} else {
		coords = fallback();
	}
	try {
		const data = await fetchWeather(coords.coords.latitude, coords.coords.longitude);
		const c = data.current_weather;
		const temp = Math.round(c.temperature);
		weatherTempEl.textContent = temp;
		weatherIconEl.textContent = iconFor(c.weathercode);
		weatherDescEl.textContent = describeWeather(c.weathercode, c.windspeed);
		weatherLocationEl.textContent = coords.label;
		const max = Math.round(data.daily.temperature_2m_max[0]);
		const min = Math.round(data.daily.temperature_2m_min[0]);
		const uv = Math.round(data.daily.uv_index_max[0]);
		const pr = Math.round((data.hourly.precipitation_probability?.[new Date().getHours()] ?? 0));
		weatherExtraEl.innerHTML = `
			<div><div class="muted small">High</div><div>${max}°</div></div>
			<div><div class="muted small">Low</div><div>${min}°</div></div>
			<div><div class="muted small">UV</div><div>${uv}</div></div>
			<div><div class="muted small">Feels</div><div>${Math.round(data.hourly.apparent_temperature[0])}°</div></div>
			<div><div class="muted small">Precip</div><div>${pr}%</div></div>
		`;
	} catch (e) {
		weatherLocationEl.textContent = 'Weather unavailable';
		weatherDescEl.textContent = 'Check connection';
	}
}

// Load weather when weather view becomes active to save API calls
const observer = new MutationObserver(() => {
	if (!views.weather.hidden) {
		loadWeatherWithGeo();
	}
});
observer.observe(views.weather, { attributes: true, attributeFilter: ['hidden'] });

// ============ Utilities ============
function vibrate(pattern) {
	if (navigator.vibrate) {
		navigator.vibrate(pattern);
	}
}

// Notification permission prompt
if ('Notification' in window && Notification.permission === 'default') {
	try { Notification.requestPermission().catch(() => {}); } catch (e) {}
}

// iOS PWA prompt: lock orientation API is unreliable; we rely on detection instead.
