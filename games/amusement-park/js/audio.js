class AudioSystem {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = false;
        this.bgmPlaying = false;
        this.bgmGain = null;
        this.bgmNodes = [];
        window.addEventListener('click', () => {
            if (!this.enabled) {
                this.ctx.resume();
                this.enabled = true;
                this.startBGM();
            }
        }, { once: true });
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

    // 背景音乐 - 使用 Web Audio API 合成欢乐游乐园风格循环音乐
    startBGM() {
        if (this.bgmPlaying) return;
        this.bgmPlaying = true;
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(0.06, this.ctx.currentTime);
        this.bgmGain.connect(this.ctx.destination);
        this._scheduleBGMLoop();
        this._updateMusicBtn();
    }
    stopBGM() {
        this.bgmPlaying = false;
        this.bgmNodes.forEach(n => { try { n.stop(); } catch(e) {} });
        this.bgmNodes = [];
        if (this.bgmGain) { this.bgmGain.disconnect(); this.bgmGain = null; }
        this._updateMusicBtn();
    }
    toggleBGM() {
        if (this.bgmPlaying) this.stopBGM();
        else { if (this.enabled) this.startBGM(); }
    }
    _updateMusicBtn() {
        const btn = document.getElementById('btn-music');
        if (btn) btn.textContent = this.bgmPlaying ? '🎵 音乐 ON' : '🔇 音乐 OFF';
    }
    _scheduleBGMLoop() {
        if (!this.bgmPlaying || !this.bgmGain) return;
        const now = this.ctx.currentTime;
        // 欢乐的游乐园旋律 - C大调，4/4拍，BPM ~140
        const bpm = 140;
        const beatDur = 60 / bpm;
        // 主旋律音符序列 (频率, 持续拍数)
        const melody = [
            [523, 1], [587, 1], [659, 1], [698, 1],  // C5 D5 E5 F5
            [784, 2], [659, 2],                        // G5(2) E5(2)
            [784, 1], [880, 1], [784, 1], [698, 1],  // G5 A5 G5 F5
            [659, 2], [523, 2],                        // E5(2) C5(2)
            [698, 1], [659, 1], [587, 1], [523, 1],  // F5 E5 D5 C5
            [587, 2], [784, 2],                        // D5(2) G5(2)
            [659, 1], [698, 1], [784, 1], [880, 1],  // E5 F5 G5 A5
            [784, 4],                                  // G5(4)
        ];
        // 伴奏和弦 (每 4 拍换一个和弦)
        const chords = [
            [261, 329, 392], // C major
            [261, 329, 392], // C major
            [349, 440, 523], // F major
            [329, 392, 494], // Em (approx)
            [349, 440, 523], // F major
            [392, 494, 587], // G major
            [349, 440, 523], // F major
            [392, 494, 587], // G major
        ];

        let time = now + 0.05;
        let beatOffset = 0;

        // 播放主旋律
        melody.forEach(([freq, beats]) => {
            const dur = beats * beatDur * 0.9;
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time + beatOffset * beatDur);
            g.gain.setValueAtTime(0.12, time + beatOffset * beatDur);
            g.gain.exponentialRampToValueAtTime(0.01, time + beatOffset * beatDur + dur);
            osc.connect(g); g.connect(this.bgmGain);
            osc.start(time + beatOffset * beatDur);
            osc.stop(time + beatOffset * beatDur + dur);
            this.bgmNodes.push(osc);
            beatOffset += beats;
        });

        // 播放伴奏和弦 (每4拍一个)
        const totalBeats = beatOffset;
        chords.forEach((chord, i) => {
            const chordStart = time + i * 4 * beatDur;
            if (i * 4 >= totalBeats) return;
            chord.forEach(freq => {
                const osc = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, chordStart);
                g.gain.setValueAtTime(0.04, chordStart);
                g.gain.exponentialRampToValueAtTime(0.005, chordStart + 4 * beatDur * 0.95);
                osc.connect(g); g.connect(this.bgmGain);
                osc.start(chordStart);
                osc.stop(chordStart + 4 * beatDur);
                this.bgmNodes.push(osc);
            });
        });

        // 简单打击节奏 (每拍一个轻微的高频 tick)
        for (let b = 0; b < totalBeats; b++) {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(b % 4 === 0 ? 1200 : 800, time + b * beatDur);
            g.gain.setValueAtTime(b % 4 === 0 ? 0.03 : 0.015, time + b * beatDur);
            g.gain.exponentialRampToValueAtTime(0.001, time + b * beatDur + 0.05);
            osc.connect(g); g.connect(this.bgmGain);
            osc.start(time + b * beatDur);
            osc.stop(time + b * beatDur + 0.05);
            this.bgmNodes.push(osc);
        }

        // 在循环结束时安排下一次循环
        const loopDuration = totalBeats * beatDur;
        this._bgmTimeout = setTimeout(() => {
            this.bgmNodes = [];
            if (this.bgmPlaying) this._scheduleBGMLoop();
        }, loopDuration * 1000);
    }
}
window.gameAudio = new AudioSystem();