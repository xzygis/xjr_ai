// 游戏状态
const state = {
    population: 100,
    maxPopulation: 100,
    food: 1000,
    water: 1000,
    morale: 100,
    day: 1,
    tick: 0,
    workers: {
        canteen: 0,
        shower: 0,
        dorm: 0
    }
};

// 房间配置
const ROOMS = {
    canteen: { max: 40, prod: 1.5, name: '餐厅' }, // 产出食物
    shower: { max: 40, prod: 1.5, name: '浴室' },  // 产出净水
    dorm: { max: 60, prod: 0.1, name: '宿舍' }     // 恢复士气
};

// 消耗配置
const CONSUMPTION = {
    food: 0.5, // 每人每Tick消耗
    water: 0.5 // 每人每Tick消耗
};

// DOM 元素
const els = {
    pop: document.getElementById('res-population'),
    food: document.getElementById('res-food'),
    water: document.getElementById('res-water'),
    morale: document.getElementById('res-morale'),
    day: document.getElementById('game-day'),
    log: document.getElementById('event-log'),
    modal: document.getElementById('game-over-modal'),
    reason: document.getElementById('game-over-reason'),
    rooms: {
        canteen: document.querySelector('#room-canteen .worker-count'),
        shower: document.querySelector('#room-shower .worker-count'),
        dorm: document.querySelector('#room-dorm .worker-count')
    },
    progress: {
        canteen: document.getElementById('progress-canteen'),
        shower: document.getElementById('progress-shower'),
        dorm: document.getElementById('progress-dorm')
    }
};

let gameLoop;

// 初始化
function init() {
    // 初始分配一些工人
    state.workers.canteen = 20;
    state.workers.shower = 20;
    state.workers.dorm = 20;
    
    updateUI();
    logEvent("避难所大门已关闭。我们必须在这里生存下去。");
    
    // 启动游戏循环
    gameLoop = setInterval(tick, 1000); // 1秒 = 1 Tick
}

// 分配工人
function assignWorker(roomType) {
    const totalWorkers = state.workers.canteen + state.workers.shower + state.workers.dorm;
    if (totalWorkers >= state.population) {
        logEvent("没有空闲的幸存者可以分配了！", "warn");
        return;
    }
    
    if (state.workers[roomType] >= ROOMS[roomType].max) {
        logEvent(`${ROOMS[roomType].name} 已满员！`, "warn");
        return;
    }
    
    state.workers[roomType]++;
    updateUI();
}

// 撤回工人
function removeWorker(roomType) {
    if (state.workers[roomType] > 0) {
        state.workers[roomType]--;
        updateUI();
    }
}

// 游戏循环
function tick() {
    if (state.population <= 0) {
        gameOver("所有的幸存者都已死亡。避难所变成了坟墓。");
        return;
    }
    
    if (state.morale <= 0) {
        gameOver("士气崩溃，幸存者们发生了暴乱，避难所已被摧毁。");
        return;
    }

    state.tick++;
    
    // 天数计算 (每24 Tick 为一天)
    if (state.tick % 24 === 0) {
        state.day++;
        logEvent(`第 ${state.day} 天开始了。`);
    }

    // 1. 资源消耗
    const foodNeeded = state.population * CONSUMPTION.food;
    const waterNeeded = state.population * CONSUMPTION.water;
    
    state.food -= foodNeeded;
    state.water -= waterNeeded;
    
    let starving = false;
    let thirsty = false;
    
    if (state.food < 0) {
        state.food = 0;
        starving = true;
    }
    if (state.water < 0) {
        state.water = 0;
        thirsty = true;
    }

    // 2. 资源生产
    state.food += state.workers.canteen * ROOMS.canteen.prod;
    state.water += state.workers.shower * ROOMS.shower.prod;
    
    // 限制最大资源量（例如各 2000）
    if (state.food > 2000) state.food = 2000;
    if (state.water > 2000) state.water = 2000;

    // 3. 士气与人口变化
    let moraleChange = -0.5; // 基础士气下降（地下生活压抑）
    
    // 宿舍恢复士气
    moraleChange += state.workers.dorm * ROOMS.dorm.prod;
    
    if (starving) {
        moraleChange -= 2;
        // 饿死人
        if (Math.random() < 0.3) {
            killSurvivor("饿死");
        }
    }
    
    if (thirsty) {
        moraleChange -= 2;
        // 渴死人
        if (Math.random() < 0.3) {
            killSurvivor("渴死");
        }
    }
    
    // 资源充足时的士气奖励
    if (!starving && !thirsty && state.food > 500 && state.water > 500) {
        moraleChange += 1;
    }

    state.morale += moraleChange;
    if (state.morale > 100) state.morale = 100;

    // 4. 随机事件 (2% 概率)
    if (Math.random() < 0.02) {
        triggerRandomEvent();
    }

    // 更新进度条动画
    animateProgress();

    // 更新UI
    updateUI();
}

function killSurvivor(reason) {
    if (state.population > 0) {
        state.population--;
        logEvent(`一名幸存者因 ${reason} 离世了...`, "danger");
        
        // 随机从一个房间减少工人
        const activeRooms = Object.keys(state.workers).filter(r => state.workers[r] > 0);
        if (activeRooms.length > 0) {
            const randomRoom = activeRooms[Math.floor(Math.random() * activeRooms.length)];
            state.workers[randomRoom]--;
        }
    }
}

function triggerRandomEvent() {
    const events = [
        { text: "收音机里传来了地面的微弱信号，大家感到了一丝希望！(士气 +10)", effect: () => state.morale = Math.min(100, state.morale + 10) },
        { text: "水管发生了轻微泄漏，损失了一些净水！(净水 -100)", effect: () => state.water = Math.max(0, state.water - 100) },
        { text: "老鼠溜进了仓库，吃掉了一些食物！(食物 -100)", effect: () => state.food = Math.max(0, state.food - 100) },
        { text: "发电机发出异响，让大家感到不安。(士气 -5)", effect: () => state.morale -= 5 }
    ];
    
    const ev = events[Math.floor(Math.random() * events.length)];
    ev.effect();
    logEvent(`[突发事件] ${ev.text}`, "warn");
}

// 记录日志
function logEvent(msg, type = "info") {
    els.log.innerText = msg;
    if (type === "warn") els.log.style.color = "#ffaa00";
    else if (type === "danger") els.log.style.color = "#ff4444";
    else els.log.style.color = "#aaa";
}

// 动画效果
function animateProgress() {
    // 简单的 0 -> 100% 循环动画，代表正在工作
    const cycle = (state.tick % 5) * 20; // 5秒一轮
    
    els.progress.canteen.style.width = state.workers.canteen > 0 ? `${cycle + 20}%` : '0%';
    els.progress.shower.style.width = state.workers.shower > 0 ? `${cycle + 20}%` : '0%';
    els.progress.dorm.style.width = state.workers.dorm > 0 ? `${cycle + 20}%` : '0%';
}

// 更新UI
function updateUI() {
    els.pop.innerText = state.population;
    els.food.innerText = Math.floor(state.food);
    els.water.innerText = Math.floor(state.water);
    els.morale.innerText = Math.floor(state.morale) + '%';
    els.day.innerText = state.day;
    
    // 颜色警告
    els.food.style.color = state.food < 200 ? '#ff4444' : 'inherit';
    els.water.style.color = state.water < 200 ? '#ff4444' : 'inherit';
    els.morale.style.color = state.morale < 30 ? '#ff4444' : 'inherit';

    // 房间工人数量
    els.rooms.canteen.innerText = state.workers.canteen;
    els.rooms.shower.innerText = state.workers.shower;
    els.rooms.dorm.innerText = state.workers.dorm;
    
    // 更新电梯位置 (随机上下移动增加生动感)
    if (state.tick % 3 === 0) {
        const car = document.querySelector('.elevator-car');
        const randomTop = Math.floor(Math.random() * 400) + 20;
        car.style.top = randomTop + 'px';
    }
}

// 游戏结束
function gameOver(reasonText) {
    clearInterval(gameLoop);
    els.reason.innerText = reasonText;
    els.modal.classList.remove('hidden');
}

// 启动
window.onload = init;
