// Mobile-first, in-browser only app. No external frameworks.
// Orientation → Feature:
// - portrait-primary: Alarm
// - landscape-primary: Stopwatch
// - portrait-secondary: Timer
// - landscape-secondary: Weather

// DOM refs (may be null until DOM parsed)
var orientationLabel = document.getElementById('orientation-label');
var views = {
	'alarm': document.getElementById('view-alarm'),
	'stopwatch': document.getElementById('view-stopwatch'),
	'timer': document.getElementById('view-timer'),
	'weather': document.getElementById('view-weather')
};

function setActiveView(key) {
	for (var k in views) {
		if (!Object.prototype.hasOwnProperty.call(views, k)) continue;
		var el = views[k];
		if (el) el.hidden = k !== key;
	}
}

function getOrientationType() {
	var so = (typeof screen !== 'undefined') && (screen.orientation || screen.msOrientation || screen.mozOrientation);
	if (so && so.type) return so.type;
	if (typeof window !== 'undefined' && typeof window.orientation === 'number') {
		var a = window.orientation; // 0, 90, -90, 180
		if (a === 0) return 'portrait-primary';
		if (a === 180) return 'portrait-secondary';
		if (a === 90) return 'landscape-primary';
		if (a === -90) return 'landscape-secondary';
	}
	var isPortrait = false;
	try { isPortrait = !!(window.matchMedia && window.matchMedia('(orientation: portrait)').matches); } catch (e) {}
	return isPortrait ? 'portrait-primary' : 'landscape-primary';
}

function prettyOrientation(type) {
	var map = {
		'portrait-primary': 'Portrait • Alarm',
		'portrait-secondary': 'Portrait (Upside-down) • Timer',
		'landscape-primary': 'Landscape • Stopwatch',
		'landscape-secondary': 'Landscape (Opposite) • Weather'
	};
	return map[type] || type.replace('-', ' ');
}

function updateByOrientation() {
	var type = getOrientationType();
	var labelEl = document.getElementById('orientation-label');
	if (labelEl) labelEl.textContent = prettyOrientation(type);
	if (type.indexOf('portrait') === 0) {
		if (type.indexOf('primary') > -1) setActiveView('alarm'); else setActiveView('timer');
	} else if (type.indexOf('landscape') === 0) {
		if (type.indexOf('primary') > -1) setActiveView('stopwatch'); else setActiveView('weather');
	}
}

['orientationchange', 'resize'].forEach(function(evt){
	window.addEventListener(evt, function(){ updateByOrientation(); }, { passive: true });
});
if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.addEventListener) {
	screen.orientation.addEventListener('change', updateByOrientation, { passive: true });
}

function initApp() {
	updateByOrientation();
	startClock();
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', function(){ initApp(); }, { once: true });
} else {
	initApp();
}

// ================= Alarm =================
var clockTimeEl = document.getElementById('clock-time');
var alarmForm = document.getElementById('alarm-form');
var alarmTimeInput = document.getElementById('alarm-time');
var clearAlarmBtn = document.getElementById('clear-alarm');
var alarmStatusEl = document.getElementById('alarm-status');
var alarmRingingEl = document.getElementById('alarm-ringing');
var alarmStopBtn = document.getElementById('alarm-stop');
var alarmSnoozeBtn = document.getElementById('alarm-snooze');

var alarmTimeoutId = null;
var alarmTargetMs = null;
var alarmAudio = null;

function formatClock(date) {
	var h = String(date.getHours()).padStart(2, '0');
	var m = String(date.getMinutes()).padStart(2, '0');
	var s = String(date.getSeconds()).padStart(2, '0');
	return h + ':' + m + ':' + s;
}

function tickClock() {
	if (clockTimeEl) clockTimeEl.textContent = formatClock(new Date());
}
function startClock(){ setInterval(tickClock, 500); tickClock(); }

function scheduleAlarm(targetDate) {
	var now = Date.now();
	var delay = Math.max(0, targetDate.getTime() - now);
	clearTimeout(alarmTimeoutId);
	alarmTimeoutId = setTimeout(triggerAlarm, delay);
	alarmTargetMs = targetDate.getTime();
	if (alarmStatusEl) alarmStatusEl.textContent = 'Alarm set for ' + targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function triggerAlarm() {
	if (alarmRingingEl) alarmRingingEl.hidden = false;
	if (alarmStatusEl) alarmStatusEl.textContent = 'Alarm ringing!';
	try {
		if (!alarmAudio) alarmAudio = new Audio('data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAA...');
		alarmAudio.loop = true;
		alarmAudio.play().catch(function(){});
	} catch (e) {}
}

function stopAlarmAudio() {
	if (alarmAudio) {
		try { alarmAudio.pause(); } catch (e) {}
		alarmAudio.currentTime = 0;
	}
}

if (alarmForm) alarmForm.addEventListener('submit', function(e){
	e.preventDefault();
	var value = alarmTimeInput && alarmTimeInput.value;
	if (!value) return;
	var parts = value.split(':');
	var hh = parseInt(parts[0], 10) || 0;
	var mm = parseInt(parts[1], 10) || 0;
	var now = new Date();
	var target = new Date();
	target.setHours(hh, mm, 0, 0);
	if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
	scheduleAlarm(target);
	if (alarmRingingEl) alarmRingingEl.hidden = true;
});

if (clearAlarmBtn) clearAlarmBtn.addEventListener('click', function(){
	clearTimeout(alarmTimeoutId);
	alarmTimeoutId = null;
	alarmTargetMs = null;
	if (alarmStatusEl) alarmStatusEl.textContent = 'Alarm cleared';
	if (alarmRingingEl) alarmRingingEl.hidden = true;
	stopAlarmAudio();
});

if (alarmStopBtn) alarmStopBtn.addEventListener('click', function(){
	if (alarmRingingEl) alarmRingingEl.hidden = true;
	if (alarmStatusEl) alarmStatusEl.textContent = 'Alarm stopped';
	stopAlarmAudio();
});

if (alarmSnoozeBtn) alarmSnoozeBtn.addEventListener('click', function(){
	var snoozeMs = 5 * 60 * 1000;
	var target = new Date(Date.now() + snoozeMs);
	scheduleAlarm(target);
	if (alarmRingingEl) alarmRingingEl.hidden = true;
	stopAlarmAudio();
});

// ================= Stopwatch =================
var swTimeEl = document.getElementById('stopwatch-time');
var swStartStopBtn = document.getElementById('sw-start-stop');
var swLapBtn = document.getElementById('sw-lap');
var swResetBtn = document.getElementById('sw-reset');
var swLapsEl = document.getElementById('sw-laps');

var swRunning = false;
var swStartEpoch = 0;
var swElapsedMs = 0;
var swRafId = 0;

function formatStopwatch(ms) {
	var totalCentis = Math.floor(ms / 10);
	var minutes = Math.floor(totalCentis / 6000);
	var seconds = Math.floor((totalCentis % 6000) / 100);
	var centis = totalCentis % 100;
	return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0') + '.' + String(centis).padStart(2, '0');
}

function swTick() {
	if (swRunning) {
		var now = performance.now();
		swElapsedMs = now - swStartEpoch;
		if (swTimeEl) swTimeEl.textContent = formatStopwatch(swElapsedMs);
		swRafId = requestAnimationFrame(swTick);
	}
}

if (swStartStopBtn) swStartStopBtn.addEventListener('click', function(){
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

if (swLapBtn) swLapBtn.addEventListener('click', function(){
	if (!swLapsEl) return;
	var li = document.createElement('li');
	var lapIndex = swLapsEl.children.length + 1;
	li.innerHTML = '<span>Lap ' + lapIndex + '</span><span>' + formatStopwatch(swElapsedMs) + '</span>';
	swLapsEl.prepend(li);
});

if (swResetBtn) swResetBtn.addEventListener('click', function(){
	swRunning = false;
	cancelAnimationFrame(swRafId);
	swElapsedMs = 0;
	if (swTimeEl) swTimeEl.textContent = '00:00.00';
	if (swStartStopBtn) swStartStopBtn.textContent = 'Start';
	if (swLapsEl) swLapsEl.innerHTML = '';
});

// ================= Timer =================
var timerTimeEl = document.getElementById('timer-time');
var timerRing = document.getElementById('timer-ring');
var timerStartStopBtn = document.getElementById('timer-start-stop');
var timerResetBtn = document.getElementById('timer-reset');
var timerMinInput = document.getElementById('timer-min');
var timerSecInput = document.getElementById('timer-sec');
var timerStatusEl = document.getElementById('timer-status');
var timerForm = document.getElementById('timer-form');

var timerTotalMs = 0;
var timerRemainingMs = 0;
var timerEndEpoch = 0;
var timerRunning = false;
var timerRafId = 0;

function formatTimer(ms) {
	var totalSeconds = Math.max(0, Math.ceil(ms / 1000));
	var minutes = Math.floor(totalSeconds / 60);
	var seconds = totalSeconds % 60;
	return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

function drawRing(progress) {
	if (!timerRing) return;
	var ctx = timerRing.getContext('2d');
	var size = timerRing.width;
	var center = size / 2;
	var radius = center - 8;
	ctx.clearRect(0, 0, size, size);
	ctx.lineWidth = 10;
	ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ring');
	ctx.beginPath();
	ctx.arc(center, center, radius, 0, Math.PI * 2);
	ctx.stroke();
	ctx.strokeStyle = '#22d3ee';
	ctx.beginPath();
	var start = -Math.PI / 2;
	ctx.arc(center, center, radius, start, start + Math.PI * 2 * progress);
	ctx.stroke();
}

function timerTick() {
	if (!timerRunning) return;
	var now = performance.now();
	var remaining = Math.max(0, timerEndEpoch - now);
	timerRemainingMs = remaining;
	if (timerTimeEl) timerTimeEl.textContent = formatTimer(remaining);
	var progress = timerTotalMs === 0 ? 0 : (timerTotalMs - remaining) / timerTotalMs;
	drawRing(progress);
	if (remaining <= 0) {
		timerRunning = false;
		if (timerStatusEl) timerStatusEl.textContent = 'Time is up!';
		try { new Notification('Timer complete'); } catch (e) {}
		if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
		return;
	}
	timerRafId = requestAnimationFrame(timerTick);
}

function getTimerInputMs() {
	var min = parseInt((timerMinInput && timerMinInput.value) || '0', 10) || 0;
	var sec = parseInt((timerSecInput && timerSecInput.value) || '0', 10) || 0;
	return (min * 60 + sec) * 1000;
}

if (timerStartStopBtn) timerStartStopBtn.addEventListener('click', function(){
	if (!timerRunning) {
		timerTotalMs = timerRemainingMs > 0 ? timerRemainingMs : getTimerInputMs();
		if (timerTotalMs <= 0) { if (timerStatusEl) timerStatusEl.textContent = 'Set a duration first'; return; }
		timerRunning = true;
		timerEndEpoch = performance.now() + timerTotalMs;
		if (timerStatusEl) timerStatusEl.textContent = 'Running…';
		timerRafId = requestAnimationFrame(timerTick);
		timerStartStopBtn.textContent = 'Pause';
	} else {
		timerRunning = false;
		cancelAnimationFrame(timerRafId);
		timerRemainingMs = Math.max(0, timerEndEpoch - performance.now());
		if (timerStatusEl) timerStatusEl.textContent = 'Paused';
		timerStartStopBtn.textContent = 'Resume';
	}
});

if (timerResetBtn) timerResetBtn.addEventListener('click', function(){
	timerRunning = false;
	cancelAnimationFrame(timerRafId);
	timerRemainingMs = 0;
	timerTotalMs = 0;
	if (timerTimeEl) timerTimeEl.textContent = '00:00';
	drawRing(0);
	if (timerStartStopBtn) timerStartStopBtn.textContent = 'Start';
	if (timerStatusEl) timerStatusEl.textContent = '';
});

if (timerForm) timerForm.addEventListener('click', function(e){
	var btn = e.target.closest('[data-preset]');
	if (!btn) return;
	var seconds = parseInt(btn.getAttribute('data-preset'), 10) || 0;
	if (timerMinInput) timerMinInput.value = String(Math.floor(seconds / 60));
	if (timerSecInput) timerSecInput.value = String(seconds % 60);
	drawRing(0);
	if (timerTimeEl) timerTimeEl.textContent = formatTimer(seconds * 1000);
});

// ================= Weather =================
var weatherLocationEl = document.getElementById('weather-location');
var weatherTempEl = document.getElementById('weather-temp');
var weatherDescEl = document.getElementById('weather-desc');
var weatherExtraEl = document.getElementById('weather-extra');
var weatherIconEl = document.getElementById('weather-icon');

function fetchWeather(lat, lon) {
	var url = new URL('https://api.open-meteo.com/v1/forecast');
	url.searchParams.set('latitude', String(lat));
	url.searchParams.set('longitude', String(lon));
	url.searchParams.set('current_weather', 'true');
	url.searchParams.set('hourly', 'relative_humidity_2m,apparent_temperature,precipitation_probability,uv_index');
	url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_hours');
	url.searchParams.set('timezone', 'auto');
	return fetch(url.toString()).then(function(res){ if (!res.ok) throw new Error('Weather fetch failed'); return res.json(); });
}

function iconFor(code) {
	var entries = [
		[[0], '☀️'], [[1, 2], '🌤️'], [[3], '☁️'], [[45, 48], '🌫️'], [[51, 53, 55], '🌦️'],
		[[61, 63, 65], '🌧️'], [[71, 73, 75], '❄️'], [[80, 81, 82], '🌧️'], [[95, 96, 99], '⛈️']
	];
	for (var i=0;i<entries.length;i++) { var keys=entries[i][0], em=entries[i][1]; if (keys.indexOf(code)>=0) return em; }
	return '⛅️';
}

function describeWeather(code, wind) {
	var desc = {0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Depositing rime fog',51:'Light drizzle',53:'Moderate drizzle',55:'Heavy drizzle',61:'Light rain',63:'Moderate rain',65:'Heavy rain',71:'Light snow',73:'Moderate snow',75:'Heavy snow',80:'Rain showers',81:'Rain showers',82:'Violent rain showers',95:'Thunderstorm',96:'Thunderstorm with hail',99:'Thunderstorm with hail'};
	var text = desc[code] || 'Weather';
	if (typeof wind === 'number') return text + ' • ' + Math.round(wind) + ' km/h wind';
	return text;
}

function loadWeatherWithGeo() {
	function fallback(){ return { coords: { latitude: 40.7128, longitude: -74.0060 }, label: 'New York, USA (fallback)' }; }
	var permPromise;
	try { if (navigator.permissions && typeof navigator.permissions.query === 'function') { permPromise = navigator.permissions.query({ name: 'geolocation' }); } } catch (e) { permPromise = null; }
	function onPerm(permission){
		var shouldAsk = !permission || permission.state !== 'denied';
		var geoPromise;
		if (shouldAsk && navigator.geolocation) {
			geoPromise = new Promise(function(resolve){
				navigator.geolocation.getCurrentPosition(function(pos){ resolve({ coords: pos.coords, label: 'Your location' }); }, function(){ resolve(fallback()); }, { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 });
			});
		} else { geoPromise = Promise.resolve(fallback()); }
		geoPromise.then(function(coords){
			return fetchWeather(coords.coords.latitude, coords.coords.longitude).then(function(data){
				var c = data.current_weather; var temp = Math.round(c.temperature);
				if (weatherTempEl) weatherTempEl.textContent = temp;
				if (weatherIconEl) weatherIconEl.textContent = iconFor(c.weathercode);
				if (weatherDescEl) weatherDescEl.textContent = describeWeather(c.weathercode, c.windspeed);
				if (weatherLocationEl) weatherLocationEl.textContent = coords.label;
				var max = Math.round(data.daily.temperature_2m_max[0]);
				var min = Math.round(data.daily.temperature_2m_min[0]);
				var uv = Math.round(data.daily.uv_index_max[0]);
				var pr = 0;
				try {
					var times = data.hourly && data.hourly.time;
					var probs = data.hourly && data.hourly.precipitation_probability;
					if (Array.isArray(times) && Array.isArray(probs)) {
						var d = new Date(); var pad = function(n){ return String(n).padStart(2, '0'); };
						var key = d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':00';
						var idx = times.indexOf(key); if (idx >= 0) pr = Math.round(probs[idx] || 0);
					}
				} catch (e) { pr = 0; }
				if (weatherExtraEl) weatherExtraEl.innerHTML = ''+
					'<div><div class="muted small">High</div><div>'+max+'°</div></div>'+
					'<div><div class="muted small">Low</div><div>'+min+'°</div></div>'+
					'<div><div class="muted small">UV</div><div>'+uv+'</div></div>'+
					'<div><div class="muted small">Feels</div><div>'+(data.hourly && Array.isArray(data.hourly.apparent_temperature) ? Math.round(data.hourly.apparent_temperature[0]) : temp)+'°</div></div>'+
					'<div><div class="muted small">Precip</div><div>'+pr+'%</div></div>';
			}).catch(function(){ if (weatherLocationEl) weatherLocationEl.textContent = 'Weather unavailable'; if (weatherDescEl) weatherDescEl.textContent = 'Check connection'; });
		});
	}
	if (permPromise && typeof permPromise.then === 'function') permPromise.then(onPerm).catch(function(){ onPerm(null); }); else onPerm(null);
}

// Trigger weather load when weather view becomes visible
if (views.weather) {
	var mo = new MutationObserver(function(){ if (!views.weather.hidden) loadWeatherWithGeo(); });
	mo.observe(views.weather, { attributes: true, attributeFilter: ['hidden'] });
}

// Simple vibrate utility (used elsewhere if needed)
function vibrate(pattern){ if (navigator.vibrate) navigator.vibrate(pattern); }

// Ask notification permission early (optional)
if ('Notification' in window && Notification.permission === 'default') { try { Notification.requestPermission().catch(function(){}); } catch (e) {} }

