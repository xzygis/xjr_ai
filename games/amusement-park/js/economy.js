class EconomySystem {
    constructor() {
        this.money = 15000; this.ticketPrice = 10; this.day = 1; this.totalIncome = 0; this.totalExpense = 0; this.marketingBoost = 0;
    }
    canAfford(amount) { return this.money >= amount; }
    spend(amount) { this.money -= amount; this.totalExpense += amount; this.updateUI(); }
    earn(amount) { this.money += amount; this.totalIncome += amount; this.updateUI(); }
    dailyUpdate() {
        this.day++;
        let maintenanceCost = 0;
        if (window.gameEngine && window.gameEngine.rides) { window.gameEngine.rides.forEach(r => { maintenanceCost += r.upkeep; }); }
        if (maintenanceCost > 0) { this.spend(maintenanceCost); window.gameMain.showToast(`第 ${this.day} 天开始。扣除维护费: $${maintenanceCost}`); }
        else window.gameMain.showToast(`第 ${this.day} 天开始。`);
        if (this.marketingBoost > 0) { this.marketingBoost--; if(this.marketingBoost === 0) window.gameMain.showToast("营销活动结束"); }
        this.updateUI();
    }
    setTicketPrice(price) { this.ticketPrice = price; this.updateUI(); }
    updateUI() {
        const moneyDisplay = document.getElementById('money-display'); if (moneyDisplay) moneyDisplay.textContent = this.money;
        const dayDisplay = document.getElementById('day-display'); if (dayDisplay) dayDisplay.textContent = `Day ${this.day}`;
        const incomeDisplay = document.getElementById('total-income'); if (incomeDisplay) incomeDisplay.textContent = `$${this.totalIncome}`;
        const expenseDisplay = document.getElementById('total-expense'); if (expenseDisplay) expenseDisplay.textContent = `$${this.totalExpense}`;
        const ticketDisplay = document.getElementById('ticket-price-display'); if (ticketDisplay) ticketDisplay.textContent = `$${this.ticketPrice}`;
    }
}