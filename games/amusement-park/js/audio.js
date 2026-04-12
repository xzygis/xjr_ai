class AudioSystem {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = false;
        window.addEventListener('click', () => { if (!this.enabled) { this.ctx.resume(); this.enabled = true; } }, { once: true });
    }
    playTone(freq, type, duration, vol=0.1) {
        if (!this.enabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }
    playBuild() { this.playTone(440, 'square', 0.1, 0.1); setTimeout(() => this.playTone(660, 'square', 0.2, 0.1), 100); }
    playError() { this.playTone(150, 'sawtooth', 0.3, 0.2); }
    playCash() { this.playTone(880, 'sine', 0.1, 0.1); setTimeout(() => this.playTone(1760, 'sine', 0.2, 0.1), 100); }
    playBreakdown() { this.playTone(200, 'sawtooth', 0.5, 0.3); setTimeout(() => this.playTone(150, 'sawtooth', 0.5, 0.3), 200); }
}
window.gameAudio = new AudioSystem();