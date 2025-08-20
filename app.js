function initApp() {
	updateByOrientation();
	startClock();
    try { aurora.start(); } catch(e){}
}