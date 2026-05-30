// 冷日计划专用剧情节点
const secretNodes = {
    start: {
        desc: "「模拟宇宙 · 残响回廊」\n\n判官 Yakhoo123 的声音从数据洪流中传来：「你终于来了。真实宇宙已被 ET-01 焚毁，冷日计划撕裂了因果。我们需要你的帮助。」\n\n空气中弥漫着代码雨，三个片段在你眼前闪烁。",
        choices: [
            { text: "📜 追溯冷日计划的起源", next: "coldOrigin" },
            { text: "🕯️ 了解ET-01的入侵", next: "et01Invasion" },
            { text: "⚙️ 直接进入模拟核心", next: "serverRoom" }
        ]
    },
    coldOrigin: {
        desc: "「冷日计划 · 起源」\n\n无论是模拟还是真实宇宙，都执行过此计划。由 baiyin86893 负责，本意是连接现实与游戏，与志愿者 HEART1680 一起实验。\n\n突然，一段记忆碎片涌入你的意识……",
        choices: [
            { text: "深入记忆（遭遇战斗）", combat: true, enemy: { type:"normal", chapter:1, isElite:false }, next: "afterColdFight" },
            { text: "跳过，继续了解", next: "coldDetail" }
        ]
    },
    coldDetail: {
        desc: "实验最终导致宇宙不稳定，ET-01 趁虚降临。HEART1680 牺牲，baiyin86893 被模因污染，切除大脑后活了下来……\n\n你感到脊背发凉。",
        choices: [
            { text: "继续前行", next: "serverRoom" }
        ]
    },
    afterColdFight: {
        desc: "你击退了记忆中的模因污染，获得了一些余烬。",
        choices: [
            { text: "继续调查", next: "coldDetail", effect: ()=>{ player.ember += 15; addSecretLog("获得 15 余烬"); } }
        ]
    },
    et01Invasion: {
        desc: "「ET-01 入侵」\n\n冷日计划进行到一半时，ET-01 趁虚入侵。Camera-1 在渡河授意下追捕 ET-01，却被 ET-01 用 The Book 杀死，灵魂碎裂。\n\n空气中传来低沉的嗡鸣……",
        choices: [
            { text: "尝试修复 Camera-1 的碎片", next: "cameraEvent" }
        ]
    },
    cameraEvent: {
        desc: "你收集到 Camera-1 的残余数据，但一道黑影扑来！",
        choices: [
            { text: "⚔️ 迎战", combat: true, enemy: { type:"elite", chapter:1, isElite:true }, next: "afterCamera" }
        ]
    },
    afterCamera: {
        desc: "黑影消散，你获得了一些「渡河碎片」。",
        choices: [
            { text: "继续深入", next: "serverRoom", effect: ()=>{ player.relics.push("渡河碎片"); addSecretLog("获得遗物：渡河碎片"); } }
        ]
    },
    serverRoom: {
        desc: "「服务器事件 · 污染」\n\n你进入了模拟核心，Yakhoo123 和 BlackCat123768 正在对抗污染。Yakhoo 的污染指数显示 47% ，并且还在上升。\n\n酒馆卧底的信号若隐若现。",
        choices: [
            { text: "🤝 陪伴 Yakhoo，降低污染", next: "accompanyYakhoo" },
            { text: "🔍 调查卧底信号", next: "investigateTraitor", effect: ()=>{ addSecretLog("你发现了一封加密信件..."); } }
        ]
    },
    accompanyYakhoo: {
        desc: "你握紧 Yakhoo 的手，污染指数下降到了 31%。祂感激地看着你：「谢谢，观测者。」",
        choices: [
            { text: "继续前进", next: "parallelUniverse" }
        ]
    },
    investigateTraitor: {
        desc: "你破译了卧底的信件，但代价是 Yakhoo 的污染上升到了 68%。你必须做出选择。",
        choices: [
            { text: "立即回去帮助 Yakhoo", next: "accompanyYakhoo" },
            { text: "继续追踪卧底", next: "traitorPath", effect: ()=>{ addSecretLog("卧底身份暴露，但 Yakhoo 被隔离了..."); } }
        ]
    },
    traitorPath: {
        desc: "卧底被揪出，但 Yakhoo 的污染已达到 95% 并被隔离。你感到愧疚。",
        choices: [
            { text: "进入平行宇宙", next: "parallelUniverse" }
        ]
    },
    parallelUniverse: {
        desc: "「平行宇宙交错」\n\n由于渡河损坏，jjw 与另一平行宇宙交错，RIVER768（渡河碎片）出现。欢愉死魂灵 PlayMaker 正试图杀死 RIVER768。",
        choices: [
            { text: "🛡️ 保护 RIVER768", next: "protectRiver" },
            { text: "⚖️ 保持中立", next: "neutralRiver" }
        ]
    },
    protectRiver: {
        desc: "你成功击退了 PlayMaker，RIVER768 将部分渡河之力赠予你。",
        choices: [
            { text: "继续", next: "finalShowdown", effect: ()=>{ player.strength += 2; addSecretLog("力量永久 +2（仅限本轮回）"); } }
        ]
    },
    neutralRiver: {
        desc: "PlayMaker 重伤 RIVER768，但你从残骸中找到了关键的线索。",
        choices: [
            { text: "继续", next: "finalShowdown" }
        ]
    },
    finalShowdown: {
        desc: "「终末之诗 · 冷日真相」\n\n所有线索汇聚，ET-01 的本体出现在你面前。你必须做出最后的抉择。",
        choices: [
            { text: "⚔️ 决战 ET-01", combat: true, enemy: { type:"finalBoss", chapter:4, isElite:false }, next: "trueEnding" }
        ]
    },
    trueEnding: {
        desc: "「观测即是创造。」\n\nYakhoo123 的渡河力量映照你的姓名。冷日计划的真相终于揭晓：所有轮回都指向同一个答案——你，就是打破循环的关键。\n\n你获得了隐藏成就『冷日终结者』。",
        choices: [
            { text: "返回主菜单", next: "exit" }
        ]
    },
    exit: {
        desc: "冷日档案闭合，你回到了主菜单。",
        choices: [
            { text: "离开", next: null, action: ()=>{ window.location.href = "index.html"; } }
        ]
    }
};

// ========== 使用 gameData.js 中的 player 对象 ==========
function initSecretPlayer() {
    player.hp = 45;
    player.maxHp = 45;
    player.gold = 20;
    player.ember = 0;
    player.strength = 0;
    player.block = 0;
    player.relics = [];
    player.storyFlags = {};
}
let currentNodeId = "start";

function getSecretNode(id){ return secretNodes[id]; }

function addSecretLog(msg, isGlitch=false){
    let logDiv = document.getElementById("logArea");
    if(!logDiv) return;
    let entry = document.createElement("div");
    entry.className = "log-entry";
    if(isGlitch) entry.classList.add("glitch");
    entry.innerText = msg;
    logDiv.appendChild(entry);
    entry.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
window.addBattleLog = addSecretLog;

function refreshSecretUI(){
    document.getElementById("hpVal").innerText = player.hp;
    document.getElementById("maxHpVal").innerText = player.maxHp;
    document.getElementById("blockVal").innerText = player.block;
    document.getElementById("strengthVal").innerText = player.strength;
    document.getElementById("goldVal").innerText = player.gold;
    document.getElementById("emberVal").innerText = player.ember;
}

function saveSecret(){
    let save = { 
        hp: player.hp, maxHp: player.maxHp, gold: player.gold, ember: player.ember,
        strength: player.strength, relics: player.relics, storyFlags: player.storyFlags,
        currentNodeId 
    };
    localStorage.setItem("ColdSunSave", JSON.stringify(save));
}
function loadSecret(){
    let raw = localStorage.getItem("ColdSunSave");
    if(raw){
        try{
            let d = JSON.parse(raw);
            player.hp = d.hp;
            player.maxHp = d.maxHp;
            player.gold = d.gold;
            player.ember = d.ember;
            player.strength = d.strength;
            player.relics = d.relics || [];
            player.storyFlags = d.storyFlags || {};
            currentNodeId = d.currentNodeId;
        }catch(e){}
    } else {
        initSecretPlayer();
    }
    refreshSecretUI();
}

function renderSecret(){
    let node = getSecretNode(currentNodeId);
    if(!node) node = getSecretNode("start");
    document.getElementById("storyText").innerHTML = node.desc;
    let choicesDiv = document.getElementById("choicesContainer");
    choicesDiv.innerHTML = "";
    for(let choice of node.choices){
        let btn = document.createElement("div");
        btn.className = "choice-btn";
        btn.innerText = choice.text;
        btn.onclick = () => {
            if(choice.effect) choice.effect();
            if(choice.combat){
                // 保存完整玩家状态（确保所有字段都被传递）
                localStorage.setItem("ColdSunCombat", JSON.stringify({
                    player: {
                        hp: player.hp,
                        maxHp: player.maxHp,
                        gold: player.gold,
                        ember: player.ember,
                        strength: player.strength,
                        relics: player.relics || [],
                        weak: player.weak || 0,
                        strPotCount: player.strPotCount || 0
                    },
                    enemy: choice.enemy,
                    returnNode: choice.next,
                    returnTo: "secret"
                }));
                window.location.href = "battle.html";
            } else {
                if(choice.next) currentNodeId = choice.next;
                if(choice.next === "exit") {
                    localStorage.removeItem("ColdSunSave");
                    window.location.href = "index.html";
                    return;
                }
                renderSecret();
                saveSecret();
            }
        };
        choicesDiv.appendChild(btn);
    }
    refreshSecretUI();
}

window.onload = () => {
    loadSecret();
    renderSecret();
    let overlay = document.getElementById("loadingOverlay");
    if(overlay) overlay.style.display = "none";
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.get("from") === "battle"){
        let result = localStorage.getItem("ColdSunCombatResult");
        if(result){
            let res = JSON.parse(result);
            player.hp = res.player.hp;
            player.maxHp = res.player.maxHp;
            player.gold = res.player.gold;
            player.ember = res.player.ember;
            player.strength = res.player.strength;
            player.relics = res.player.relics;
            player.weak = res.player.weak || 0;
            player.strPotCount = res.player.strPotCount || 0;
            currentNodeId = res.returnNode;
            saveSecret();
            localStorage.removeItem("ColdSunCombatResult");
            renderSecret();
            addSecretLog("战斗结束，继续冷日之旅。");
        }
    }
};