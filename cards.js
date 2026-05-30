// cards.js - 全局卡牌库定义
const Cards = {
    // 所有卡牌模板
    data: {
        "⚔️ 打击": { name:"⚔️ 打击", type:"attack", cost:1, baseDamage:6, desc:"造成6伤害" },
        "🛡️ 防御": { name:"🛡️ 防御", type:"skill", cost:1, baseBlock:5, desc:"获得5格挡" },
        "💪 力量药剂": { name:"💪 力量药剂", type:"skill", cost:1, effect:true, desc:"获得2力量" },
        "🌿 回春": { name:"🌿 回春", type:"skill", cost:1, effect:true, desc:"回复5生命" },
        "🌀 旋风斩": { name:"🌀 旋风斩", type:"attack", cost:2, baseDamage:8, desc:"造成8+力量伤害" },
        "🔮 洞察": { name:"🔮 洞察", type:"skill", cost:0, effect:true, desc:"获得1能量" }
    },
    
    // 根据名称获取卡牌副本
    get(name) {
        const template = this.data[name];
        if (!template) return { name: name || "⚔️ 打击", type:"attack", cost:1, baseDamage:6, desc:"默认打击" };
        // 返回深拷贝，避免引用
        return JSON.parse(JSON.stringify(template));
    },
    
    // 获取所有卡牌名称列表
    getAllNames() {
        return Object.keys(this.data);
    },
    
    // 获取初始牌组（8张：4打击+4防御）
    getInitialDeck() {
        return [
            this.get("⚔️ 打击"), this.get("⚔️ 打击"), this.get("⚔️ 打击"), this.get("⚔️ 打击"),
            this.get("🛡️ 防御"), this.get("🛡️ 防御"), this.get("🛡️ 防御"), this.get("🛡️ 防御")
        ];
    }
};

// 暴露到全局
if (typeof window !== 'undefined') {
    window.Cards = Cards;
}