class GameMain {
    constructor() {
        this.lastTime = 0;
        window.gameEconomy = new EconomySystem();
        window.gameVisitors = new VisitorsSystem();
        window.gameEngine = new GameEngine('game-canvas');
        window.gameEngine.buildInitialScene(); // Build the default scene with roller coaster
        this.dayTimer = 10000; 
        this.initUI();
        requestAnimationFrame(t => this.loop(t));
        this.showToast("欢迎来到欢乐游乐园！点击右下角菜单开始建设。");
    }
    initUI() {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                const target = e.target.getAttribute('data-tab');
                e.target.classList.add('active');
                document.getElementById(`tab-${target}`).classList.add('active');
                window.gameEngine.setMode(null, null);
                document.querySelectorAll('.build-item').forEach(i => i.classList.remove('selected'));
            });
        });
        const ridesList = document.getElementById('rides-list');
        for (const [id, ride] of Object.entries(GAME_DATA.rides)) {
            const li = document.createElement('li');
            li.className = 'build-item'; li.setAttribute('data-type', 'ride'); li.setAttribute('data-id', id);
            li.innerHTML = `<span class="item-icon">${ride.icon}</span><div class="item-info"><h3>${ride.name}</h3><p>$${ride.price} | 占地 ${ride.size.w}x${ride.size.h}</p></div>`;
            ridesList.appendChild(li);
        }
        const buildItems = document.querySelectorAll('.build-item');
        buildItems.forEach(item => {
            item.addEventListener('click', (e) => {
                buildItems.forEach(i => i.classList.remove('selected')); item.classList.add('selected');
                const type = item.getAttribute('data-type'); const id = item.getAttribute('data-id');
                if (type === 'delete') window.gameEngine.setMode('delete', null);
                else if (type === 'path' || type === 'scenery') window.gameEngine.setMode('build', id);
                else if (type === 'ride') window.gameEngine.setMode('build', id);
            });
        });
        document.getElementById('btn-ticket-down').addEventListener('click', () => {
            let p = window.gameEconomy.ticketPrice; if (p > 0) window.gameEconomy.setTicketPrice(p - 1);
        });
        document.getElementById('btn-ticket-up').addEventListener('click', () => {
            window.gameEconomy.setTicketPrice(window.gameEconomy.ticketPrice + 1);
        });
        document.getElementById('btn-marketing').addEventListener('click', () => {
            if (window.gameEconomy.canAfford(500)) {
                window.gameEconomy.spend(500); window.gameEconomy.marketingBoost += 1;
                if (window.gameAudio) window.gameAudio.playCash();
                this.showToast("已投放广告！游客数量将增加。");
            } else this.showToast("资金不足！", true);
        });
        document.querySelector('.close-btn').addEventListener('click', () => {
            document.getElementById('ride-modal').classList.add('hidden'); window.gameEngine.selectedRide = null;
        });
        document.getElementById('btn-repair').addEventListener('click', () => {
            const ride = window.gameEngine.selectedRide;
            if (ride && ride.state === 'broken') {
                if (window.gameEconomy.canAfford(100)) {
                    window.gameEconomy.spend(100); ride.state = 'running';
                    if (window.gameAudio) window.gameAudio.playBuild();
                    this.showToast(`${ride.data.name} 维修完成！`); this.showRideModal(ride);
                } else this.showToast("资金不足！", true);
            }
        });
        document.getElementById('btn-demolish').addEventListener('click', () => {
            const ride = window.gameEngine.selectedRide;
            if (ride) {
                window.gameEngine.deleteAt(ride.c, ride.r);
                document.getElementById('ride-modal').classList.add('hidden'); window.gameEngine.selectedRide = null;
            }
        });
        window.gameEngine.resize();
    }
    showRideModal(ride) {
        const modal = document.getElementById('ride-modal'); modal.classList.remove('hidden');
        document.getElementById('modal-ride-name').textContent = ride.data.name;
        document.getElementById('modal-ride-desc').textContent = ride.data.desc;
        document.getElementById('modal-ride-status').textContent = ride.state === 'running' ? '运行中 🟢' : '已损坏 🔴';
        document.getElementById('modal-ride-status').style.color = ride.state === 'running' ? 'green' : 'red';
        document.getElementById('modal-ride-occupancy').textContent = `${ride.occupants}/${ride.data.capacity}`;
        document.getElementById('modal-ride-profit').textContent = `$${ride.profit}`;
        document.getElementById('modal-ride-upkeep').textContent = `$${ride.upkeep}/天`;
        const repairBtn = document.getElementById('btn-repair');
        repairBtn.style.display = ride.state === 'broken' ? 'block' : 'none';
    }
    showToast(message, isError = false) {
        if (window.gameAudio && isError) window.gameAudio.playError();
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div'); toast.className = 'toast'; toast.textContent = message;
        if (isError) toast.style.backgroundColor = 'rgba(231, 76, 60, 0.9)';
        container.appendChild(toast);
        setTimeout(() => { if(toast.parentElement) toast.parentElement.removeChild(toast); }, 3000);
    }
    loop(timestamp) {
        const dt = timestamp - this.lastTime; this.lastTime = timestamp;
        const delta = Math.min(dt, 50);
        this.dayTimer -= delta;
        if (this.dayTimer <= 0) { this.dayTimer = 10000; window.gameEconomy.dailyUpdate(); }
        window.gameVisitors.update(delta); window.gameEngine.update(delta); window.gameEngine.render();
        if (window.gameEngine.selectedRide && !document.getElementById('ride-modal').classList.contains('hidden')) {
            document.getElementById('modal-ride-occupancy').textContent = `${window.gameEngine.selectedRide.occupants}/${window.gameEngine.selectedRide.data.capacity}`;
            document.getElementById('modal-ride-profit').textContent = `$${window.gameEngine.selectedRide.profit}`;
            const repairBtn = document.getElementById('btn-repair');
            if (window.gameEngine.selectedRide.state === 'broken') {
                repairBtn.style.display = 'block';
                document.getElementById('modal-ride-status').textContent = '已损坏 🔴'; document.getElementById('modal-ride-status').style.color = 'red';
            } else {
                repairBtn.style.display = 'none';
                document.getElementById('modal-ride-status').textContent = '运行中 🟢'; document.getElementById('modal-ride-status').style.color = 'green';
            }
        }
        requestAnimationFrame(t => this.loop(t));
    }
}
window.onload = () => { window.gameMain = new GameMain(); };