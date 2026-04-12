class VisitorsSystem {
    constructor() { this.peeps = []; this.satisfaction = 80; this.spawnTimer = 0; this.maxPeeps = 400; }
    update(dt) {
        this.spawnTimer -= dt;
        let engine = window.gameEngine; let economy = window.gameEconomy;
        let rate = economy.marketingBoost > 0 ? 5 : 15;
        if (this.spawnTimer <= 0 && this.peeps.length < this.maxPeeps) { 
            this.spawnTimer = rate; 
            this.spawnPeep(); 
            if (this.peeps.length < this.maxPeeps / 2) this.spawnPeep();
            if (this.peeps.length < this.maxPeeps / 4) { this.spawnPeep(); this.spawnPeep(); }
        }
        for (let i = this.peeps.length - 1; i >= 0; i--) {
            let p = this.peeps[i];
            if (p.state === 'walking') { p.moveTimer -= dt; if (p.moveTimer <= 0) { this.movePeep(p); p.moveTimer = p.speed; } }
            else if (p.state === 'leaving') {
                p.moveTimer -= dt;
                if (p.moveTimer <= 0) { this.movePeep(p); p.moveTimer = p.speed; }
                if (p.r >= engine.rows - 1) { this.peeps.splice(i, 1); this.updateUI(); }
            }
        }
    }
    spawnPeep() {
        let engine = window.gameEngine; let c = Math.floor(engine.cols / 2); let r = engine.rows - 1;
        let peep = {
            id: Math.random().toString(36).substr(2, 9), c: c, r: r, state: 'walking',
            money: 500 + Math.random() * 1000, happiness: 50, nauseaLevel: 0, energy: 1000,
            speed: 10 + Math.random() * 10, moveTimer: 0, targetRide: null, color: this.getRandomColor(),
            offsetX: (Math.random() - 0.5) * (engine.tileSize * 0.6), offsetY: (Math.random() - 0.5) * (engine.tileSize * 0.6)
        };
        this.peeps.push(peep); window.gameEconomy.earn(window.gameEconomy.ticketPrice); this.updateUI();
    }
    getRandomColor() {
        const colors = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#e67e22', '#2ecc71', '#1abc9c', '#ffffff'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    movePeep(p) {
        let engine = window.gameEngine;
        if (p.energy <= 0 || p.money < window.gameEconomy.ticketPrice || p.nauseaLevel > 80) p.state = 'leaving';
        let dirs = [ {dc: 0, dr: -1}, {dc: 1, dr: 0}, {dc: 0, dr: 1}, {dc: -1, dr: 0} ];
        dirs.sort(() => Math.random() - 0.5);
        if (p.state !== 'leaving') {
            for (let d of dirs) {
                let nc = p.c + d.dc; let nr = p.r + d.dr;
                if (nc >= 0 && nc < engine.cols && nr >= 0 && nr < engine.rows) {
                    let cell = engine.grid[nc][nr];
                    if (cell.type === 'ride' && cell.rideObj && cell.rideObj.state !== 'broken') {
                        let ride = cell.rideObj;
                        if (Math.random() < 0.2 && p.money >= window.gameEconomy.ticketPrice) {
                            if (ride.queue.length < ride.data.capacity * 3) {
                                ride.queue.push(p); p.state = 'queueing'; p.c = nc; p.r = nr; p.targetRide = ride; return;
                            }
                        }
                    }
                }
            }
        }
        for (let d of dirs) {
            let nc = p.c + d.dc; let nr = p.r + d.dr;
            if (p.state === 'leaving' && d.dr === -1) continue;
            if (nc >= 0 && nc < engine.cols && nr >= 0 && nr < engine.rows) {
                let cell = engine.grid[nc][nr];
                if (cell.type === 'path') { p.c = nc; p.r = nr; break; }
            }
        }
        p.energy -= 0.1;
    }
    updateUI() {
        const vDisplay = document.getElementById('visitors-display'); if (vDisplay) vDisplay.textContent = this.peeps.length;
        const rDisplay = document.getElementById('rating-display');
        let totalH = 0; this.peeps.forEach(p => totalH += p.happiness);
        if (this.peeps.length > 0) this.satisfaction = Math.floor(totalH / this.peeps.length); else this.satisfaction = 80;
        let stars = (this.satisfaction / 20).toFixed(1); if (rDisplay) rDisplay.textContent = stars;
    }
    render(ctx, tileSize) {
        this.peeps.forEach(p => {
            if (p.state === 'walking' || p.state === 'leaving') {
                ctx.fillStyle = p.color; ctx.beginPath();
                ctx.arc(p.c * tileSize + tileSize/2 + p.offsetX, p.r * tileSize + tileSize/2 + p.offsetY, tileSize * 0.15, 0, Math.PI*2);
                ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
            }
        });
    }
}