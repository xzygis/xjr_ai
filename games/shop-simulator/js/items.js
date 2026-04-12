const shopItems = [
    { id: 1, name: '水', price: 1000, icon: '水', desc: '一瓶解渴的水' },
    { id: 2, name: '纸巾', price: 1000, icon: '纸', desc: '一包柔软的纸巾' },
    { id: 3, name: '灯', price: 1000, icon: '灯', desc: '一盏明亮的灯' },
    { id: 4, name: '书包', price: 1000, icon: '包', desc: '一个结实的书包' },
    { id: 5, name: '雨伞', price: 1000, icon: '伞', desc: '一把防风的雨伞' },
    { id: 6, name: '行李箱', price: 1000, icon: '箱', desc: '一个大容量行李箱' },
    { id: 7, name: '毛巾', price: 1000, icon: '毛', desc: '一条吸水的毛巾' }
];

function getRandomItems(count) {
    let result = [];
    let tempItems = [...shopItems];
    for (let i = 0; i < count; i++) {
        if (tempItems.length === 0) break;
        let index = Math.floor(Math.random() * tempItems.length);
        result.push({ item: tempItems[index] });
        tempItems.splice(index, 1); 
    }
    return result;
}