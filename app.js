// Orientation detection with robust fallbacks
function getOrientationType() {
	var orientationObj = (typeof screen !== 'undefined') ? (screen.orientation || screen.msOrientation || screen.mozOrientation) : null;
	if (orientationObj && orientationObj.type) return orientationObj.type;

	if (typeof window !== 'undefined' && typeof window.orientation === 'number') {
		var a = window.orientation;
		if (a === 0) return 'portrait-primary';
		if (a === 180) return 'portrait-secondary';
		if (a === 90) return 'landscape-primary';
		if (a === -90) return 'landscape-secondary';
	}

	var isPortrait = false;
	try { isPortrait = !!(window.matchMedia && window.matchMedia('(orientation: portrait)').matches); } catch (e) {}
	return isPortrait ? 'portrait-primary' : 'landscape-primary';
}