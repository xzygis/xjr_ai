// 游戏状态
const gameState = {
    money: 10000000, 
    customerCount: 0,
};

const NUM_CASHIERS = 3;
const queues = Array(NUM_CASHIERS).fill(0).map(() => []);

let activeCustomers = [];
let refundQueue = []; // 退货队伍

// 玩家状态 (眼睛)
let playerX = 1500;
let playerY = 1500;
let mouseX = 1500;
let mouseY = 1500;
let currentScale = 1.0;

function speakAloud(text) {
    if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'zh-CN';
        // 可以稍微调整一下语速和音调，让声音不那么死板
        msg.rate = 1.2;
        window.speechSynthesis.speak(msg);
    }
}
function formatMoney(amount) {
    return amount.toLocaleString();
}

function initShop() {
    const checkoutArea = document.getElementById('checkout-area');
    checkoutArea.innerHTML = '';
    
    // 生成3个收银台
    for (let i = 0; i < NUM_CASHIERS; i++) {
        const reg = document.createElement('div');
        reg.className = 'register';
        reg.id = `register-${i}`;
        reg.innerHTML = `
            <div class="clerk">
                <div class="face-parts">
                    <div class="hair"></div>
                    <div class="eyes">
                        <div class="eye"></div>
                        <div class="eye"></div>
                    </div>
                    <div class="nose"></div>
                    <div class="mouth"></div>
                </div>
            </div>
            <div style="position:absolute; top:-60px; left:5px; background:rgba(0,0,0,0.5); color:white; font-size:10px; padding:2px;">1元员工</div>
        `;
        checkoutArea.appendChild(reg);
    }

    // 初始化商品分布到左上角和左下角
    const topLeft = document.getElementById('shelves-top-left');
    const bottomLeft = document.getElementById('shelves-bottom-left');
    
    topLeft.innerHTML = '';
    bottomLeft.innerHTML = '';
    
    shopItems.forEach((item, index) => {
        const slot = document.createElement('div');
        slot.className = 'item-slot';
        slot.innerHTML = `
            <img src="${item.img}" alt="${item.name}">
            <span>${item.name} ¥${item.price}</span>
        `;
        // 前4个放左上，后3个放左下
        if (index < 4) {
            topLeft.appendChild(slot);
        } else {
            bottomLeft.appendChild(slot);
        }
    });
}

function updateUI() {
    document.getElementById('money-display').textContent = formatMoney(gameState.money);
    document.getElementById('customer-count').textContent = formatMoney(gameState.customerCount);
}

// 旅游团按钮
document.getElementById('tour-bus-btn').addEventListener('click', () => {
    const count = Math.floor(Math.random() * (1000 - 444 + 1)) + 444; 
    
    const notice = document.createElement('div');
    notice.textContent = `🚌 旅游团到达！${count} 人进入商场！`;
    notice.style.position = 'absolute';
    notice.style.top = '20%';
    notice.style.left = '50%';
    notice.style.transform = 'translateX(-50%)';
    notice.style.background = 'rgba(0,0,0,0.8)';
    notice.style.color = 'white';
    notice.style.padding = '15px 30px';
    notice.style.borderRadius = '10px';
    notice.style.fontSize = '24px';
    notice.style.zIndex = '2000';
    document.body.appendChild(notice);
    
    setTimeout(() => notice.remove(), 3000);

    let spawned = 0;
    const interval = setInterval(() => {
        spawnCustomer();
        spawned++;
        if (spawned >= count) {
            clearInterval(interval);
        }
    }, 50); // 快速生成
});

// 监听鼠标移动控制玩家
window.addEventListener('mousemove', (e) => {
    const shop = document.getElementById('shop');
    const rect = shop.getBoundingClientRect();
    
    mouseX = (e.clientX - rect.left) / currentScale;
    mouseY = (e.clientY - rect.top) / currentScale;
});

// 每帧更新玩家位置
setInterval(() => {
    const player = document.getElementById('player');
    if (player) {
        playerX += (mouseX - playerX) * 0.1;
        playerY += (mouseY - playerY) * 0.1;
        player.style.left = `${playerX}px`;
        player.style.top = `${playerY}px`;
        
        // 检测玩家是否靠近退货区 (left: 1600px, top: 100px)
        const ui = document.getElementById('player-checkout-ui');
        const dist = Math.hypot(playerX - 1675, playerY - 140);
        
        if (dist < 150 && refundQueue.length > 0) {
            const customer = refundQueue[0];
            if (ui.dataset.activeId !== customer.id) {
                ui.style.display = 'block';
                ui.style.left = '1550px';
                ui.style.top = '0px';
                
                if (customer.isCrazy) {
                    document.getElementById('checkout-text').textContent = `它发疯了！打不打？`;
                    document.getElementById('refund-buttons').style.display = 'none';
                    document.getElementById('fight-buttons').style.display = 'block';
                } else {
                    document.getElementById('checkout-text').textContent = `要求退货退钱，退不退？`;
                    document.getElementById('refund-buttons').style.display = 'block';
                    document.getElementById('fight-buttons').style.display = 'none';
                }
                
                ui.dataset.activeId = customer.id;
            }
        } else {
            ui.style.display = 'none';
            ui.dataset.activeId = '';
        }
    }
}, 16); 

// 退货按钮逻辑
document.getElementById('btn-accept').addEventListener('click', () => {
    const customer = refundQueue[0];
    if (customer) {
        // 同意退货 (减钱)
        const totalPrice = customer.getTotalPrice();
        gameState.money -= totalPrice;
        updateUI();
        
        customer.speak("算你识相！");
        finishRefund(customer);
    }
});

document.getElementById('btn-reject').addEventListener('click', () => {
    const customer = refundQueue[0];
    if (customer) {
        // 不退货，触发发疯
        customer.isCrazy = true;
        customer.element.classList.add('crazy-face');
        customer.speak("给我退钱啊啊啊！！！");
        
        // 刷新UI面板
        document.getElementById('player-checkout-ui').dataset.activeId = '';
    }
});

// 打人按钮逻辑
document.getElementById('btn-hit').addEventListener('click', () => {
    const customer = refundQueue[0];
    if (customer) {
        // 打飞
        customer.speak("啊！！！");
        customer.element.classList.add('flying-away');
        
        const ui = document.getElementById('player-checkout-ui');
        ui.style.display = 'none';
        ui.dataset.activeId = '';
        
        refundQueue.shift();
        updateRefundQueuePositions();
        
        setTimeout(() => {
            customer.element.remove();
            activeCustomers = activeCustomers.filter(c => c !== customer);
        }, 1000);
    }
});

document.getElementById('btn-nohit').addEventListener('click', () => {
    const customer = refundQueue[0];
    if (customer) {
        // 不打，自己气死离开
        customer.speak("气死我了！");
        finishRefund(customer);
    }
});

function finishRefund(customer) {
    const ui = document.getElementById('player-checkout-ui');
    ui.style.display = 'none';
    ui.dataset.activeId = '';
    
    refundQueue.shift();
    updateRefundQueuePositions();
    
    customer.element.style.top = '3200px'; 
    customer.element.style.left = `${1400 + Math.random() * 200}px`;
    setTimeout(() => {
        customer.element.remove();
        activeCustomers = activeCustomers.filter(c => c !== customer);
    }, 1000);
}

function updateRefundQueuePositions() {
    refundQueue.forEach((customer, index) => {
        // 退货区排队
        customer.element.style.top = `${200 + index * 40}px`;
        customer.element.style.left = `1650px`;
        customer.element.style.zIndex = 200 + index * 40;
    });
}

// P键状态
let pPressed = false;
let pInterval = null;

// 监听滚轮/键盘缩放 (没有鼠标滚轮的话可以用键盘代替，保留之前的设定)
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'r') {
        currentScale += 0.1;
        document.getElementById('shop').style.transform = `scale(${currentScale})`;
    } else if (e.key.toLowerCase() === 't') {
        currentScale = Math.max(0.1, currentScale - 0.1);
        document.getElementById('shop').style.transform = `scale(${currentScale})`;
    }
    
    // 长按 P 键疯狂打人 (如果在退货区并且有人发疯)
    if (e.key.toLowerCase() === 'p' && !pPressed) {
        pPressed = true;
        processPlayerFastHit();
        pInterval = setInterval(processPlayerFastHit, 100); 
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() === 'p') {
        pPressed = false;
        clearInterval(pInterval);
    }
});

function processPlayerFastHit() {
    const ui = document.getElementById('player-checkout-ui');
    if (ui.style.display === 'block' && refundQueue.length > 0) {
        const customer = refundQueue[0];
        if (customer.isCrazy) {
            document.getElementById('btn-hit').click();
        }
    }
}

// 顾客逻辑
function spawnCustomer() {
    const customer = new Customer();
    activeCustomers.push(customer);
    
    const shop = document.getElementById('shop');
    shop.appendChild(customer.element);

    // 从入口出现
    customer.element.style.left = `${1400 + Math.random() * 200}px`;
    customer.element.style.top = '3000px';

    // 决定是否购买 (80%概率购买，20%闲逛)
    customer.willBuy = Math.random() < 0.8;

    setTimeout(() => {
        // 走向左边货架区 (随机左上或左下)
        const isTopLeft = Math.random() > 0.5;
        customer.element.style.top = isTopLeft ? `${100 + Math.random() * 200}px` : `${2600 + Math.random() * 200}px`;
        customer.element.style.left = `${50 + Math.random() * 200}px`;
        
        setTimeout(() => {
            if (customer.willBuy) {
                // 不再说话
                setTimeout(() => {
                    joinQueue(customer);
                }, 1000);
            } else {
                // 不买东西直接走 (不说话)
                setTimeout(() => {
                    // 闲逛后离开
                    customer.element.style.top = '3200px';
                    customer.element.style.left = `${1400 + Math.random() * 200}px`;
                    setTimeout(() => {
                        customer.element.remove();
                        activeCustomers = activeCustomers.filter(c => c !== customer);
                    }, 1000);
                }, 1000);
            }
        }, 1500);
    }, 50);
}

function joinQueue(customer) {
    let minLen = Infinity;
    let targetQueue = 0;
    
    for (let i = 0; i < NUM_CASHIERS; i++) {
        if (queues[i].length < minLen) {
            minLen = queues[i].length;
            targetQueue = i;
        }
    }
    
    queues[targetQueue].push(customer);
    customer.queueIndex = targetQueue;
    updateQueuePositions(targetQueue);

    if (queues[targetQueue].length === 1) {
        if (targetQueue !== 0) {
            processCheckout(customer, targetQueue);
        }
    }
}

function getQueuePosition(queueIndex, personIndex) {
    const centerLeft = 850 + queueIndex * 250; 
    const startTop = 180; 
    const spacingY = 40; 
    
    // 两行队，每行三人？这里理解为2列。
    const col = personIndex % 2;
    const row = Math.floor(personIndex / 2);

    let targetLeft = centerLeft + (col === 0 ? -25 : 25);
    let targetTop = startTop + row * spacingY;

    return { left: `${targetLeft}px`, top: `${targetTop}px` };
}

function updateQueuePositions(queueIndex) {
    const queue = queues[queueIndex];
    queue.forEach((customer, index) => {
        const pos = getQueuePosition(queueIndex, index);
        customer.element.style.top = pos.top;
        customer.element.style.left = pos.left;
        customer.element.style.zIndex = parseInt(pos.top); 
    });
}

function processCheckout(customer, queueIndex) {
    // 结账需要时间 (1秒)
    setTimeout(() => {
        const queue = queues[queueIndex];
        if (queue[0] !== customer) return; 

        const totalPrice = customer.getTotalPrice();
        gameState.money += totalPrice;
        gameState.customerCount++;
        updateUI();
        
        queue.shift();
        updateQueuePositions(queueIndex);

        if (queue.length > 0) {
            const nextCustomer = queue[0];
            processCheckout(nextCustomer, queueIndex);
        }

        // 决定是否退货 (4%概率退货，96%概率直接走)
        const willRefund = Math.random() < 0.04;

        if (willRefund) {
            // 不说话，直接走向退货区排队
            customer.element.style.top = '100px'; 
            customer.element.style.left = '1600px';
            
            setTimeout(() => {
                refundQueue.push(customer);
                updateRefundQueuePositions();
            }, 500); // 走到退货区
        } else {
            // 正常离开 (不说话)
            customer.element.style.top = '3200px'; 
            customer.element.style.left = `${1400 + Math.random() * 200}px`;
            setTimeout(() => {
                customer.element.remove();
                activeCustomers = activeCustomers.filter(c => c !== customer);
            }, 1000);
        }
    }, 1000);
}

initShop();
updateUI();