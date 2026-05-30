// ========== 全局变量 ==========
let globalPerm = { atkUp:0, defUp:0, hpUp:0 };
function loadPerm(){
    let raw = localStorage.getItem("YakGlobal");
    if(raw){
        try{
            let g = JSON.parse(raw);
            globalPerm.atkUp = g.perm.atkUp || 0;
            globalPerm.defUp = g.perm.defUp || 0;
            globalPerm.hpUp = g.perm.hpUp || 0;
        }catch(e){}
    }
}
function savePermToGlobal(){
    let raw = localStorage.getItem("YakGlobal");
    let glob = raw ? JSON.parse(raw) : { perm: { ember:0, maxFloor:0, atkUp:0, defUp:0, hpUp:0 }, secretUnlocked:false, endings:[] };
    glob.perm.atkUp = globalPerm.atkUp;
    glob.perm.defUp = globalPerm.defUp;
    glob.perm.hpUp = globalPerm.hpUp;
    localStorage.setItem("YakGlobal", JSON.stringify(glob));
}

// ========== 卡牌（动态依赖属性） ==========
let player = {
    hp: 50, maxHp: 50, block: 0, gold: 25, chapter: 1, ember: 0,
    deck: [], hand: [], discard: [], energy: 3, maxEnergy: 3,
    strength: 0, weak: 0, strPotCount: 0, burn: 0,
    tempBless: null,
    level: 1, exp: 0, nextExp: 100,
    attrStr: 0, attrCon: 0, attrDex: 0,
    remainingPoints: 0,
    drawCount: 5
};

function getStrike(){
    let bonus = (player.attrStr || 0);
    return { id:"strike", name:"⚔️ 打击", type:"attack", cost:1, baseDamage:6 + globalPerm.atkUp + bonus, desc:`造成 ${6+globalPerm.atkUp+bonus} 伤害` };
}
function getDefend(){
    let bonus = (player.attrCon || 0);
    return { id:"defend", name:"🛡️ 防御", type:"skill", cost:1, baseBlock:5 + globalPerm.defUp + bonus, desc:`获得 ${5+globalPerm.defUp+bonus} 格挡` };
}
function getStrengthPotion(){
    return { id:"str_pot", name:"💪 力量药剂", type:"skill", cost:1, effect:(p)=>{ if(p.strPotCount>=2){ addBattleLog("力量药剂已无法继续生效！"); return; } p.strength+=2; p.strPotCount++; }, desc:"获得2点力量 (每场限2次)" };
}
function getRejuvenate(){
    return { id:"rejuv", name:"🌿 回春", type:"skill", cost:1, effect:(p)=>p.hp = Math.min(p.maxHp, p.hp+5), desc:"回复5生命" };
}
function getWhirlwind(){
    return { id:"whirl", name:"🌀 旋风斩", type:"attack", cost:2, baseDamage:8, desc:"造成8+力量伤害" };
}
function getInsight(){
    return { id:"insight", name:"🔮 洞察", type:"skill", cost:0, effect:(p)=>p.energy++, desc:"获得1能量" };
}
function getCleave(){
    return { id:"cleave", name:"⚔️ 横扫", type:"attack", cost:2, baseDamage:6, desc:"对所有敌人造成6+力量伤害" };
}
function getIronHide(){
    return { id:"iron", name:"🛡️ 铁壁", type:"skill", cost:2, baseBlock:20, desc:"获得20格挡" };
}
function getBattleTrance(){
    return { id:"trance", name:"🌀 战意", type:"skill", cost:1, effect:(p)=>{ drawCards(2); }, desc:"抽2张牌" };
}
function getWound(){
    return { id:"wound", name:"🩸 伤口", type:"curse", cost:0, curse:true, desc:"无法打出" };
}
let playerLibrary = [
    getStrike(), getStrike(), getStrike(), getStrike(),
    getDefend(), getDefend(), getDefend(), getDefend()
];

// ========== 敌人AI ==========
class Enemy {
    constructor(name, baseHp, baseAttack, patterns, chapter, type, isElite=false){
        this.name = name;
        let hpBonus = (isElite ? 20 : 0) + chapter*8;
        this.maxHp = baseHp + hpBonus;
        this.hp = this.maxHp;
        this.attack = baseAttack + chapter*2 + (isElite ? 4 : 0);
        this.block = 0;
        this.patterns = patterns;
        this.currentIntent = null;
        this.intentValue = 0;
        this.strength = 0;
        this.type = type;
        this.isElite = isElite;
        this.turnCount = 0;
    }
    chooseIntent(){
        let available = [...this.patterns];
        if(this.hp < this.maxHp * 0.35 && available.some(p=>p.type==="buff" && p.buffType==="heal")){
            this.currentIntent = available.find(p=>p.type==="buff" && p.buffType==="heal");
            this.intentValue = this.currentIntent.value || 12;
            return;
        }
        if(this.strength >= 3 && available.some(p=>p.type==="attack")) this.currentIntent = available.find(p=>p.type==="attack");
        else if(this.block < 5 && this.hp > this.maxHp*0.5 && available.some(p=>p.type==="defend")) this.currentIntent = available.find(p=>p.type==="defend");
        else if(Math.random() < 0.3 && available.some(p=>p.type==="special")) this.currentIntent = available.find(p=>p.type==="special");
        else this.currentIntent = available[Math.floor(Math.random() * available.length)];
        if(this.currentIntent.type === "attack") this.intentValue = (this.currentIntent.damage || this.attack) + this.strength;
        else if(this.currentIntent.type === "defend") this.intentValue = this.currentIntent.block || 5;
        else if(this.currentIntent.type === "buff") this.intentValue = this.currentIntent.value || 0;
        else if(this.currentIntent.type === "debuff") this.intentValue = this.currentIntent.value || 0;
        else if(this.currentIntent.type === "special") this.intentValue = this.currentIntent.value || 0;
        this.turnCount++;
    }
    executeIntent(){
        let intent = this.currentIntent;
        if(!intent) return null;
        switch(intent.type){
            case "attack": return { type:"attack", value:this.intentValue };
            case "defend": this.block += this.intentValue; addBattleLog(`${this.name} 获得 ${this.intentValue} 格挡。`); return null;
            case "buff":
                if(intent.buffType === "strength"){ this.strength += this.intentValue; addBattleLog(`${this.name} 力量 +${this.intentValue}！`); }
                else if(intent.buffType === "heal"){ let heal = Math.min(this.maxHp - this.hp, this.intentValue); this.hp += heal; addBattleLog(`${this.name} 恢复了 ${heal} 生命。`); }
                return null;
            case "debuff":
                if(intent.debuffType === "weak"){ player.weak = (player.weak || 0) + this.intentValue; addBattleLog(`你被虚弱了！`); }
                else if(intent.debuffType === "curse"){ let curse = getWound(); player.discard.push(curse); addBattleLog(`${this.name} 向你塞入了一张【伤口】！`); }
                else if(intent.debuffType === "burn"){ player.burn = (player.burn || 0) + (this.intentValue || 3); addBattleLog(`你被灼烧了！`); }
                return null;
            case "special":
                if(intent.specialEffect) intent.specialEffect();
                addBattleLog(`${this.name} 使用了特殊技能：${intent.name || "未知"}！`);
                return null;
            default: return null;
        }
    }
}
const enemyPatterns = {
    zombie: [{ type:"attack" },{ type:"attack" },{ type:"defend", block:8 },{ type:"buff", buffType:"strength", value:2 },{ type:"debuff", debuffType:"curse", value:1 }],
    skeleton: [{ type:"attack" },{ type:"debuff", debuffType:"weak", value:1 },{ type:"defend", block:6 },{ type:"attack" },{ type:"special", name:"骨刺", specialEffect:()=>{ let dmg=6; player.hp -= dmg; addBattleLog(`受到 ${dmg} 骨刺伤害！`); }, value:6 }],
    mage: [{ type:"attack" },{ type:"debuff", debuffType:"curse", value:1 },{ type:"buff", buffType:"heal", value:10 },{ type:"attack" },{ type:"debuff", debuffType:"burn", value:3 }],
    elite: [{ type:"attack" },{ type:"buff", buffType:"strength", value:2 },{ type:"defend", block:10 },{ type:"attack" },{ type:"debuff", debuffType:"weak", value:1 },{ type:"special", name:"暗影爆发", specialEffect:()=>{ let dmg=12; player.hp -= dmg; addBattleLog(`暗影爆发造成 ${dmg} 伤害！`); }, value:12 }],
    boss1: [{ type:"attack" },{ type:"defend", block:12 },{ type:"buff", buffType:"strength", value:3 },{ type:"attack" },{ type:"debuff", debuffType:"weak", value:1 },{ type:"special", name:"大地震颤", specialEffect:()=>{ player.block = 0; addBattleLog("你的格挡被清零！"); }, value:0 }],
    boss2: [{ type:"attack" },{ type:"debuff", debuffType:"curse", value:1 },{ type:"buff", buffType:"strength", value:2 },{ type:"attack" },{ type:"defend", block:10 },{ type:"special", name:"烈焰风暴", specialEffect:()=>{ let dmg=10; player.hp -= dmg; addBattleLog(`烈焰风暴造成 ${dmg} 伤害！`); player.burn = (player.burn||0)+2; }, value:10 }],
    boss3: [{ type:"attack" },{ type:"buff", buffType:"heal", value:15 },{ type:"attack" },{ type:"debuff", debuffType:"weak", value:1 },{ type:"buff", buffType:"strength", value:2 },{ type:"special", name:"虚空湮灭", specialEffect:()=>{ let dmg=15; player.hp -= dmg; addBattleLog(`虚空湮灭造成 ${dmg} 伤害！`); }, value:15 }],
    finalBoss: [{ type:"attack" },{ type:"buff", buffType:"strength", value:3 },{ type:"attack" },{ type:"defend", block:15 },{ type:"debuff", debuffType:"weak", value:1 },{ type:"attack" },{ type:"buff", buffType:"heal", value:20 },{ type:"special", name:"神之识·审判", specialEffect:()=>{ let dmg=20; player.hp -= dmg; addBattleLog(`神之识·审判造成 ${dmg} 伤害！`); }, value:20 }]
};
function createEnemies(type, chapter, isElite=false){
    let enemies = [];
    if(type === "boss"){
        if(chapter===1) enemies.push(new Enemy("石像守卫", 55, 12, enemyPatterns.boss1, chapter, "boss"));
        else if(chapter===2) enemies.push(new Enemy("暗影魔像", 75, 16, enemyPatterns.boss2, chapter, "boss"));
        else if(chapter===3) enemies.push(new Enemy("世界守护者", 100, 22, enemyPatterns.boss3, chapter, "boss"));
        else enemies.push(new Enemy("塔之守卫", 120, 25, enemyPatterns.boss3, chapter, "boss"));
    } else if(type === "finalBoss"){
        enemies.push(new Enemy("✨ 神之识守护者 ✨", 150, 28, enemyPatterns.finalBoss, 4, "finalBoss"));
    } else {
        let count = isElite ? 1 : (1 + Math.floor(Math.random() * 2));
        for(let i=0;i<count;i++){
            let r = Math.random();
            if(isElite) enemies.push(new Enemy("精英·暗影骑士", 45, 14, enemyPatterns.elite, chapter, "elite", true));
            else if(r<0.4) enemies.push(new Enemy("沼泽史莱姆", 28, 7, enemyPatterns.zombie, chapter, "normal"));
            else if(r<0.7) enemies.push(new Enemy("骷髅弓手", 24, 8, enemyPatterns.skeleton, chapter, "normal"));
            else enemies.push(new Enemy("暗影法师", 22, 6, enemyPatterns.mage, chapter, "normal"));
        }
    }
    return enemies;
}
function recalcPlayerStats() {
    player.maxHp = 45 + globalPerm.hpUp*5 + (player.attrCon || 0) * 2;
    if(player.hp > player.maxHp) player.hp = player.maxHp;
    player.drawCount = 5 + Math.min(3, Math.floor((player.attrDex || 0) / 2));
}