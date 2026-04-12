const avatars = ['🧑', '👩', '👨', '👧', '👦', '👵', '👴', '👱‍♂️', '👱‍♀️', '🧔'];

class Customer {
    constructor() {
        this.id = Math.random().toString(36).substr(2, 9);
        this.avatar = avatars[Math.floor(Math.random() * avatars.length)];
        
        // 随机想买1-4个物品
        const itemCount = Math.floor(Math.random() * 4) + 1;
        this.wantedItems = getRandomItems(itemCount);
        
        this.element = this.createElement();
        this.state = 'entering'; // entering, browsing, queuing, leaving
    }

    createElement() {
        const el = document.createElement('div');
        el.className = 'character';
        // 随机发色和肤色
        const skinColors = ['#ffe0bd', '#f1c27d', '#e0ac69', '#8d5524', '#c68642'];
        const hairColors = ['#4a2511', '#000000', '#f1c40f', '#e74c3c', '#7f8c8d'];
        const skin = skinColors[Math.floor(Math.random() * skinColors.length)];
        const hair = hairColors[Math.floor(Math.random() * hairColors.length)];
        
        el.style.background = skin;
        
        el.innerHTML = `
            <div class="face-parts">
                <div class="hair" style="background: ${hair};"></div>
                <div class="eyes">
                    <div class="eye"></div>
                    <div class="eye"></div>
                </div>
                <div class="nose"></div>
                <div class="mouth"></div>
            </div>
            <div class="speech-bubble"></div>
        `;
        return el;
    }

    speak(text, duration = 3000) {
        if (!this.element) return;
        
        let bubble = this.element.querySelector('.speech-bubble');
        if (!bubble) {
            bubble = document.createElement('div');
            bubble.className = 'speech-bubble';
            this.element.appendChild(bubble);
        }
        
        bubble.textContent = text;
        this.element.classList.add('speaking');
        
        // 调用TTS朗读
        if ('speechSynthesis' in window) {
            const msg = new SpeechSynthesisUtterance(text);
            msg.lang = 'zh-CN';
            msg.rate = 1.2;
            window.speechSynthesis.speak(msg);
        }
        
        if (this.bubbleTimeout) {
            clearTimeout(this.bubbleTimeout);
        }
        
        this.bubbleTimeout = setTimeout(() => {
            this.element.classList.remove('speaking');
        }, duration);
    }

    getTotalPrice() {
        return this.wantedItems.reduce((sum, item) => sum + item.price, 0);
    }

    getWantedItemNames() {
        return this.wantedItems.map(item => item.name).join('、');
    }
}