class GameEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.tileSize = 40; this.cols = 40; this.rows = 30;
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.grid = []; this.rides = []; this.scenery = [];
        this.currentMode = null; this.buildItem = null;
        this.hoverTile = { c: -1, r: -1 }; this.selectedRide = null;
        this.initGrid(); this.setupEvents();
    }
    initGrid() {
        for (let c = 0; c < this.cols; c++) {
            this.grid[c] = [];
            for (let r = 0; r < this.rows; r++) this.grid[c][r] = { type: 'empty', id: null, rideObj: null };
        }
        let entranceC = Math.floor(this.cols / 2);
        for(let r = this.rows - 1; r > this.rows - 4; r--) this.grid[entranceC][r].type = 'path';
    }
    buildInitialScene() {
        // Place a roller coaster near the center-bottom to be visible immediately
        let rideId = 'small_coaster';
        let rideData = GAME_DATA.rides[rideId];
        let c = Math.floor(this.cols / 2) - 2; 
        let r = this.rows - 12;
        
        const newRide = { id: rideId, data: rideData, c: c, r: r, state: 'running', occupants: 0, profit: 0, upkeep: rideData.maintenance, timer: 0, activeCycle: false, queue: [] };
        this.rides.push(newRide);
        for (let x = c; x < c + rideData.size.w; x++) {
            for (let y = r; y < r + rideData.size.h; y++) {
                this.grid[x][y].type = 'ride'; 
                this.grid[x][y].rideObj = newRide;
            }
        }
        
        // Connect to entrance
        let entranceC = Math.floor(this.cols / 2);
        for (let i = r + rideData.size.h; i <= this.rows - 1; i++) {
            this.grid[entranceC][i].type = 'path';
            this.grid[entranceC - 1][i].type = 'path'; // make it 2-wide
        }
        
        // Add some trees
        this.grid[entranceC + 2][this.rows - 3].type = 'scenery';
        this.scenery.push({ c: entranceC + 2, r: this.rows - 3, type: 'tree' });
        this.grid[entranceC - 3][this.rows - 3].type = 'scenery';
        this.scenery.push({ c: entranceC - 3, r: this.rows - 3, type: 'tree' });
    }
    centerCamera() {
        const bottomY = this.rows * this.tileSize;
        if (bottomY > this.canvas.height) {
            this.camera.y = - (bottomY - this.canvas.height + 50); // scroll down slightly to see entrance
        } else {
            this.camera.y = 0;
        }
        // center horizontally
        this.camera.x = - (this.cols * this.tileSize / 2) + (this.canvas.width / 2);
    }
    resize() {
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
        this.centerCamera();
        this.render();
    }
    setupEvents() {
        window.addEventListener('resize', () => this.resize());
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const worldX = (mouseX / this.camera.zoom) - this.camera.x;
            const worldY = (mouseY / this.camera.zoom) - this.camera.y;
            this.hoverTile.c = Math.floor(worldX / this.tileSize);
            this.hoverTile.r = Math.floor(worldY / this.tileSize);
        });
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.hoverTile.c >= 0 && this.hoverTile.c < this.cols && this.hoverTile.r >= 0 && this.hoverTile.r < this.rows) {
                this.handleClick(this.hoverTile.c, this.hoverTile.r);
            }
        });
        let isDragging = false; let lastMouse = {x: 0, y: 0};
        this.canvas.addEventListener('mousedown', (e) => {
            if(e.button === 1 || e.button === 2 || this.currentMode === null) {
                isDragging = true; lastMouse = {x: e.clientX, y: e.clientY};
            }
        });
        window.addEventListener('mouseup', () => isDragging = false);
        window.addEventListener('mousemove', (e) => {
            if(isDragging) {
                this.camera.x += (e.clientX - lastMouse.x) / this.camera.zoom;
                this.camera.y += (e.clientY - lastMouse.y) / this.camera.zoom;
                lastMouse = {x: e.clientX, y: e.clientY};
            }
        });
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }
    setMode(mode, item) { this.currentMode = mode; this.buildItem = item; }
    handleClick(c, r) {
        if (this.currentMode === 'build') {
            if (this.buildItem === 'path') this.buildPath(c, r);
            else if (this.buildItem === 'tree') this.buildScenery(c, r);
            else this.buildRide(c, r, this.buildItem);
        } else if (this.currentMode === 'delete') {
            this.deleteAt(c, r);
        } else {
            const cell = this.grid[c][r];
            if (cell.type === 'ride' && cell.rideObj) {
                this.selectedRide = cell.rideObj;
                if(window.gameMain) window.gameMain.showRideModal(this.selectedRide);
            }
        }
    }
    canBuild(c, r, w, h) {
        if (c < 0 || r < 0 || c + w > this.cols || r + h > this.rows) return false;
        for (let x = c; x < c + w; x++) for (let y = r; y < r + h; y++) if (this.grid[x][y].type !== 'empty') return false;
        return true;
    }
    buildPath(c, r) {
        if (this.grid[c][r].type === 'empty' && window.gameEconomy.canAfford(10)) {
            window.gameEconomy.spend(10); this.grid[c][r].type = 'path';
            if (window.gameAudio) window.gameAudio.playBuild();
            window.gameMain.showToast("道路已建造");
        }
    }
    buildScenery(c, r) {
        if (this.grid[c][r].type === 'empty' && window.gameEconomy.canAfford(50)) {
            window.gameEconomy.spend(50); this.grid[c][r].type = 'scenery'; this.scenery.push({ c, r, type: 'tree' });
            if (window.gameAudio) window.gameAudio.playBuild();
            window.gameMain.showToast("树木已种植");
        }
    }
    buildRide(c, r, rideId) {
        const rideData = GAME_DATA.rides[rideId];
        if (!rideData) return;
        if (!this.canBuild(c, r, rideData.size.w, rideData.size.h)) return window.gameMain.showToast("空间不足！", true);
        if (!window.gameEconomy.canAfford(rideData.price)) return window.gameMain.showToast("资金不足！", true);
        window.gameEconomy.spend(rideData.price);
        if (window.gameAudio) window.gameAudio.playBuild();
        const newRide = { id: rideId, data: rideData, c: c, r: r, state: 'running', occupants: 0, profit: 0, upkeep: rideData.maintenance, timer: 0, activeCycle: false, queue: [] };
        this.rides.push(newRide);
        for (let x = c; x < c + rideData.size.w; x++) for (let y = r; y < r + rideData.size.h; y++) {
            this.grid[x][y].type = 'ride'; this.grid[x][y].rideObj = newRide;
        }
        window.gameMain.showToast(`${rideData.name} 建设完成！`);
    }
    deleteAt(c, r) {
        const cell = this.grid[c][r];
        if (cell.type === 'path') cell.type = 'empty';
        else if (cell.type === 'scenery') { cell.type = 'empty'; this.scenery = this.scenery.filter(s => !(s.c === c && s.r === r)); }
        else if (cell.type === 'ride') {
            const ride = cell.rideObj; if (!ride) return;
            this.rides = this.rides.filter(r => r !== ride);
            for (let x = ride.c; x < ride.c + ride.data.size.w; x++) for (let y = ride.r; y < ride.r + ride.data.size.h; y++) {
                this.grid[x][y].type = 'empty'; this.grid[x][y].rideObj = null;
            }
            window.gameMain.showToast("已拆除设施");
        }
    }
    update(dt) {
        this.rides.forEach(ride => {
            if (ride.state === 'broken') return;
            if (ride.activeCycle) {
                ride.timer -= dt;
                if (ride.timer <= 0) {
                    ride.activeCycle = false;
                    let income = ride.occupants * window.gameEconomy.ticketPrice;
                    ride.profit += income; window.gameEconomy.earn(income);
                    if (window.gameAudio && income > 0) window.gameAudio.playCash();
                    ride.occupants = 0;
                    if (Math.random() < 0.05) {
                        ride.state = 'broken';
                        if (window.gameAudio) window.gameAudio.playBreakdown();
                        window.gameMain.showToast(`${ride.data.name} 出现故障！`, true);
                    }
                }
            } else if (ride.queue.length > 0) {
                let toBoard = Math.min(ride.queue.length, ride.data.capacity);
                ride.occupants = toBoard; ride.queue.splice(0, toBoard);
                ride.activeCycle = true; ride.timer = ride.data.duration;
            }
        });
    }
    render() {
        this.ctx.fillStyle = '#27ae60'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save(); this.ctx.scale(this.camera.zoom, this.camera.zoom); this.ctx.translate(this.camera.x, this.camera.y);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; this.ctx.lineWidth = 1;
        for (let c = 0; c <= this.cols; c++) { this.ctx.beginPath(); this.ctx.moveTo(c * this.tileSize, 0); this.ctx.lineTo(c * this.tileSize, this.rows * this.tileSize); this.ctx.stroke(); }
        for (let r = 0; r <= this.rows; r++) { this.ctx.beginPath(); this.ctx.moveTo(0, r * this.tileSize); this.ctx.lineTo(this.cols * this.tileSize, r * this.tileSize); this.ctx.stroke(); }
        for (let c = 0; c < this.cols; c++) for (let r = 0; r < this.rows; r++) {
            const cell = this.grid[c][r];
            if (cell.type === 'path') { this.ctx.fillStyle = '#bdc3c7'; this.ctx.fillRect(c * this.tileSize, r * this.tileSize, this.tileSize, this.tileSize); }
            else if (cell.type === 'scenery') { this.ctx.font = `${this.tileSize * 0.8}px Arial`; this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle'; this.ctx.fillText('🌳', c * this.tileSize + this.tileSize/2, r * this.tileSize + this.tileSize/2); }
        }
        this.rides.forEach(ride => {
            const w = ride.data.size.w * this.tileSize; const h = ride.data.size.h * this.tileSize;
            const px = ride.c * this.tileSize; const py = ride.r * this.tileSize;
            this.ctx.fillStyle = 'rgba(0,0,0,0.3)'; this.ctx.fillRect(px + 4, py + 4, w, h);
            this.ctx.fillStyle = ride.data.color; this.ctx.fillRect(px, py, w, h);
            this.ctx.strokeStyle = '#2c3e50'; this.ctx.lineWidth = 2; this.ctx.strokeRect(px, py, w, h);
            this.ctx.font = `${Math.min(w, h) * 0.5}px Arial`; this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
            let yOffset = (ride.activeCycle && ride.state !== 'broken') ? Math.sin(Date.now() / 100) * 5 : 0;
            this.ctx.fillText(ride.data.icon, px + w/2, py + h/2 + yOffset);
            if (ride.state === 'broken') { this.ctx.fillStyle = 'red'; this.ctx.font = '20px Arial'; this.ctx.fillText('🔧', px + w/2, py + h/2); }
            if (ride.queue.length > 0) {
                this.ctx.fillStyle = '#f1c40f';
                // Adjust queue rendering for higher capacity visibility
                for(let i=0; i<Math.min(ride.queue.length, 8); i++) { this.ctx.beginPath(); this.ctx.arc(px + 10 + i*10, py + h + 10, 4, 0, Math.PI*2); this.ctx.fill(); }
            }
        });
        if (window.gameVisitors) window.gameVisitors.render(this.ctx, this.tileSize);
        if (this.hoverTile.c >= 0 && this.hoverTile.c < this.cols && this.hoverTile.r >= 0 && this.hoverTile.r < this.rows) {
            this.ctx.lineWidth = 2;
            if (this.currentMode === 'build') {
                let w = 1, h = 1;
                if (this.buildItem && GAME_DATA.rides[this.buildItem]) { w = GAME_DATA.rides[this.buildItem].size.w; h = GAME_DATA.rides[this.buildItem].size.h; }
                if (this.canBuild(this.hoverTile.c, this.hoverTile.r, w, h)) { this.ctx.strokeStyle = 'rgba(46, 204, 113, 0.8)'; this.ctx.fillStyle = 'rgba(46, 204, 113, 0.3)'; }
                else { this.ctx.strokeStyle = 'rgba(231, 76, 60, 0.8)'; this.ctx.fillStyle = 'rgba(231, 76, 60, 0.3)'; }
                this.ctx.fillRect(this.hoverTile.c * this.tileSize, this.hoverTile.r * this.tileSize, w * this.tileSize, h * this.tileSize);
                this.ctx.strokeRect(this.hoverTile.c * this.tileSize, this.hoverTile.r * this.tileSize, w * this.tileSize, h * this.tileSize);
            } else if (this.currentMode === 'delete') {
                this.ctx.strokeStyle = 'rgba(231, 76, 60, 0.8)'; this.ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
                this.ctx.fillRect(this.hoverTile.c * this.tileSize, this.hoverTile.r * this.tileSize, this.tileSize, this.tileSize);
            }
        }
        this.ctx.fillStyle = '#34495e'; let entranceC = Math.floor(this.cols / 2);
        this.ctx.fillRect((entranceC-1) * this.tileSize, this.rows * this.tileSize, 3 * this.tileSize, 20);
        this.ctx.fillStyle = 'white'; this.ctx.font = '14px Arial';
        this.ctx.fillText('游乐园入口', entranceC * this.tileSize + this.tileSize/2, this.rows * this.tileSize + 10);
        this.ctx.restore();
    }
}