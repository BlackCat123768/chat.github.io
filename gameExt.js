// ========== 全局状态 ==========
let currentEnemies = [], selectedEnemyIndex = 0, mapLayers = [], currentNodePos = { layer:0, node:0 };
let inCombat = false, finalBossDefeated = false, pendingVictoryCallback = null;

// ========== 辅助函数 ==========
function shuffleArray(arr){ for(let i=arr.length-1;i>0;i--){ let j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } }
function drawCards(num){ let drawAmount = num !== undefined ? num : (player.drawCount || 5); for(let i=0;i<drawAmount;i++){ if(player.deck.length===0){ if(player.discard.length===0) break; player.deck=[...player.discard]; player.discard=[]; shuffleArray(player.deck); addBattleLog("洗牌！"); } player.hand.push(player.deck.pop()); } refreshBattleUI(); }
function showFloatNumber(x,y,text,isDamage){ let div=document.createElement("div"); div.className="float-number"; div.innerText=text; div.style.left=x+"px"; div.style.top=y+"px"; div.style.color=isDamage?"#ff8866":"#88ff88"; document.body.appendChild(div); setTimeout(()=>div.remove(),600); }

// ========== 战斗逻辑 ==========
function startCombat(enemies, isElite=false, isFinalBossTrigger=false){
    inCombat=true; currentEnemies=enemies; selectedEnemyIndex=0;
    player.deck=[]; for(let c of playerLibrary) player.deck.push({...c});
    player.hand=[]; player.discard=[]; player.block=0; player.energy=player.maxEnergy; player.strength=0; player.weak=0; player.strPotCount=0; player.burn=0;
    recalcPlayerStats();
    shuffleArray(player.deck); drawCards(player.drawCount);
    if(player.tempBless){ if(player.tempBless.type==="strength") player.strength+=player.tempBless.value; if(player.tempBless.type==="block") player.block+=player.tempBless.value; addBattleLog(`✨ 祝福生效: ${player.tempBless.desc}`); player.tempBless=null; }
    document.getElementById("battleUI").style.display="block"; document.getElementById("mapUI").style.display="none";
    refreshBattleUI(); addBattleLog(`⚔️ 战斗开始！ 敌人: ${enemies.map(e=>e.name).join(", ")}`);
    pendingVictoryCallback={ isElite, isFinalBossTrigger };
}
function playCard(index){
    let card=player.hand[index]; if(card.cost>player.energy) return; if(card.curse){ addBattleLog(`❌ ${card.name} 无法打出！`); return; }
    player.energy-=card.cost;
    if(card.type==="attack"){
        if(card.id==="cleave"){
            let totalDamage=card.baseDamage+(player.strength||0); if(player.weak) totalDamage=Math.floor(totalDamage*0.5);
            for(let e of currentEnemies){
                let damage=Math.max(1,totalDamage-e.block); let blocked=Math.min(e.block,totalDamage);
                if(blocked>0){ e.block-=blocked; showFloatNumber(200,300,`-${blocked}格挡`,false); }
                e.hp-=damage; showFloatNumber(200,300,`${damage}`,true); addBattleLog(`横扫击中 ${e.name}，造成 ${damage} 伤害。`);
                if(e.hp<=0) removeEnemy(e);
            }
            if(currentEnemies.length===0){ victory(pendingVictoryCallback?.isElite||false); return; }
        } else {
            let target=currentEnemies[selectedEnemyIndex]; if(!target){ addBattleLog("没有选中目标！"); player.energy+=card.cost; return; }
            let damage=card.baseDamage+(player.strength||0); if(card.id==="whirl") damage=card.baseDamage+(player.strength||0);
            if(player.weak) damage=Math.floor(damage*0.5); damage=Math.max(1,damage-target.block);
            let blocked=Math.min(target.block,card.baseDamage+(player.strength||0));
            if(blocked>0){ target.block-=blocked; showFloatNumber(200,300,`-${blocked}格挡`,false); }
            target.hp-=damage; showFloatNumber(200,300,`${damage}`,true); addBattleLog(`打出 ${card.name} -> ${target.name}，造成 ${damage} 伤害。`);
            if(target.hp<=0) removeEnemy(target);
            if(currentEnemies.length===0){ victory(pendingVictoryCallback?.isElite||false); return; }
        }
    } else if(card.type==="skill"){
        if(card.baseBlock){ player.block+=card.baseBlock; showFloatNumber(200,300,`+${card.baseBlock}格挡`,false); addBattleLog(`打出 ${card.name}，获得 ${card.baseBlock} 格挡。`); }
        if(card.effect) card.effect(player);
        if(card.id==="trance") drawCards(2);
    }
    player.hand.splice(index,1); player.discard.push(card); refreshBattleUI();
}
function removeEnemy(enemy){ let idx=currentEnemies.indexOf(enemy); if(idx!==-1) currentEnemies.splice(idx,1); if(selectedEnemyIndex>=currentEnemies.length) selectedEnemyIndex=0; addBattleLog(`${enemy.name} 被击败！`); refreshBattleUI(); }
function endTurn(){
    addBattleLog("结束回合。");
    if(player.burn && player.burn>0){ let burnDmg=player.burn; player.hp-=burnDmg; addBattleLog(`🔥 灼烧造成 ${burnDmg} 伤害！`); player.burn=Math.max(0,player.burn-1); if(player.hp<=0){ defeat(); return; } }
    while(player.hand.length) player.discard.push(player.hand.pop());
    enemyTurn();
}
function enemyTurn(){
    if(currentEnemies.length===0) return;
    for(let enemy of currentEnemies){
        let result=enemy.executeIntent();
        if(result && result.type==="attack"){
            let damage=Math.max(0,result.value-player.block);
            if(damage>0){ player.hp-=damage; addBattleLog(`💥 ${enemy.name} 攻击造成 ${damage} 伤害！`); showFloatNumber(300,200,`${damage}`,true); }
            else addBattleLog(`🛡️ ${enemy.name} 的攻击被完全格挡！`);
        }
        if(player.hp<=0){ defeat(); return; }
    }
    player.block=0; player.energy=player.maxEnergy;
    currentEnemies=currentEnemies.filter(e=>e.hp>0);
    if(currentEnemies.length===0){ victory(pendingVictoryCallback?.isElite||false); return; }
    for(let enemy of currentEnemies) enemy.chooseIntent();
    drawCards(player.drawCount); refreshBattleUI();
}
function victory(isElite=false){
    let goldGain=(isElite?40:20)+player.chapter*5, emberGain=(isElite?12:5)+player.chapter*2, expGain=(isElite?30:15);
    player.gold+=goldGain; player.ember+=emberGain; player.exp+=expGain;
    addBattleLog(`🏆 胜利！获得 ${goldGain} 金币，${emberGain} 余烬，${expGain} 经验。`);
    while(player.exp>=player.nextExp){
        player.exp-=player.nextExp; player.level++; player.remainingPoints+=3; player.nextExp=Math.floor(100+player.level*20);
        addBattleLog(`✨ 升级！当前等级 ${player.level}，获得 3 属性点！`);
        recalcPlayerStats(); player.hp = player.maxHp;
    }
    showVictoryReward(isElite);
    inCombat=false; currentEnemies=[];
    if(pendingVictoryCallback && pendingVictoryCallback.isFinalBossTrigger) chapterClear(true);
    else goToNextNode();
    pendingVictoryCallback=null;
}
function defeat(){
    let gainedEmber=player.ember, finalEmber=Math.floor(gainedEmber/2);
    let raw=localStorage.getItem("YakGlobal"), maxFloor=player.chapter;
    if(raw){ let glob=JSON.parse(raw); glob.perm.ember=(glob.perm.ember||0)+finalEmber; if(player.chapter>(glob.perm.maxFloor||0)) glob.perm.maxFloor=player.chapter; maxFloor=glob.perm.maxFloor; localStorage.setItem("YakGlobal",JSON.stringify(glob)); }
    localStorage.removeItem("YakRun");
    showSettleAnimation(false,finalEmber,{ gold:player.gold, chapter:player.chapter, maxFloor:maxFloor });
}
function showVictoryReward(isElite=false){
    let rewardOptions=[];
    let cardPool=[getStrengthPotion, getRejuvenate, getWhirlwind, getInsight, getCleave, getIronHide, getBattleTrance];
    let rewardCount=isElite?4:3;
    for(let i=0;i<rewardCount;i++){ let idx=Math.floor(Math.random()*cardPool.length); rewardOptions.push({ type:"card", name:cardPool[idx]().name, card:cardPool[idx]() }); }
    rewardOptions.push({ type:"bless", name:"力量祝福", desc:"下一场战斗初始力量+2", effect:{type:"strength",value:2} });
    rewardOptions.push({ type:"bless", name:"铁壁祝福", desc:"下一场战斗初始格挡+8", effect:{type:"block",value:8} });
    rewardOptions.push({ type:"skip", name:"跳过奖励", desc:"不获得任何奖励", effect:null });
    let shuffled=rewardOptions.sort(()=>0.5-Math.random()), selectedRewards=shuffled.slice(0,4);
    let overlay=document.createElement("div"); overlay.className="settle-overlay";
    overlay.innerHTML=`<div class="settle-card"><div class="settle-title">✨ 战利品选择 ✨</div><div class="reward-grid" id="rewardGrid"></div></div>`;
    document.body.appendChild(overlay); let grid=document.getElementById("rewardGrid");
    selectedRewards.forEach(rew=>{
        let btn=document.createElement("div"); btn.className="minecraft-btn";
        if(rew.type==="card"){ btn.innerText=`📜 获得卡牌: ${rew.name}`; btn.onclick=()=>{ playerLibrary.push(rew.card); addBattleLog(`获得新卡牌: ${rew.card.name}！已加入牌库。`); overlay.remove(); }; }
        else if(rew.type==="bless"){ btn.innerText=`✨ 祝福: ${rew.desc}`; btn.onclick=()=>{ player.tempBless={ type:rew.effect.type, value:rew.effect.value, desc:rew.desc }; addBattleLog(`获得祝福: ${rew.desc}`); overlay.remove(); }; }
        else{ btn.innerText=`🚪 跳过奖励`; btn.onclick=()=>{ addBattleLog("你放弃了这次奖励。"); overlay.remove(); }; }
        grid.appendChild(btn);
    });
}
function chapterClear(isFinal=false){
    if(isFinal){
        addBattleLog(`🎉 恭喜！你击败了神之识守护者！`);
        let finalEmber=player.ember, raw=localStorage.getItem("YakGlobal"), maxFloor=3;
        if(raw){ let glob=JSON.parse(raw); glob.perm.ember=(glob.perm.ember||0)+finalEmber; if(3>(glob.perm.maxFloor||0)) glob.perm.maxFloor=3; maxFloor=glob.perm.maxFloor; localStorage.setItem("YakGlobal",JSON.stringify(glob)); }
        localStorage.removeItem("YakRun");
        showSettleAnimation(true,finalEmber,{ gold:player.gold, chapter:3, maxFloor:maxFloor });
        return;
    }
    addBattleLog(`🎉 击败小Boss！进入第${player.chapter+1}章`);
    let raw=localStorage.getItem("YakGlobal");
    if(raw){ let glob=JSON.parse(raw); glob.perm.ember=(glob.perm.ember||0)+player.ember; if(player.chapter>(glob.perm.maxFloor||0)) glob.perm.maxFloor=player.chapter; localStorage.setItem("YakGlobal",JSON.stringify(glob)); }
    player.chapter++; player.hp=Math.min(player.maxHp,player.hp+20);
    generateMapLayers(); currentNodePos={ layer:0, node:0 }; saveRun(); renderMap();
}
function showSettleAnimation(isVictory,totalEmberGained,extraData){
    let old=document.querySelector(".settle-overlay"); if(old) old.remove();
    let overlay=document.createElement("div"); overlay.className="settle-overlay";
    let title=isVictory?"✨ 通关结算 ✨":"💀 轮回终结 💀";
    overlay.innerHTML=`<div class="settle-card"><div class="settle-title">${title}</div><div class="settle-ember">✨ 获得余烬: ${totalEmberGained} ✨</div><div class="settle-stats"><div>🏆 最高章节: ${extraData.maxFloor}</div><div>💰 剩余金币: ${extraData.gold}</div><div>🗼 当前章节: ${extraData.chapter}</div></div><div class="minecraft-btn" id="settleConfirmBtn">继续征程</div></div>`;
    document.body.appendChild(overlay); document.getElementById("settleConfirmBtn").onclick=()=>{ overlay.remove(); window.location.href="index.html"; };
}

// ========== 地图相关 ==========
function generateMapLayers(){
    let layers=[], normalFloors=5+Math.floor(Math.random()*2);
    for(let i=0;i<normalFloors;i++){
        let nodes=[];
        for(let j=0;j<3;j++){
            let type="combat", isElite=(Math.random()<0.25);
            if(isElite) type="elite";
            else{ let r=Math.random(); if(r<0.5) type="combat"; else if(r<0.7) type="event"; else if(r<0.85) type="rest"; else type="shop"; }
            nodes.push({ type, name: getNodeName(type), isElite:(type==="elite") });
        }
        layers.push(nodes);
    }
    let bossNodes=[]; for(let j=0;j<3;j++) bossNodes.push({ type:"boss", name:"👑 小Boss", isElite:false });
    layers.push(bossNodes);
    mapLayers=layers;
}
function getNodeName(type){ if(type==="combat") return "⚔️ 战斗"; if(type==="elite") return "⚠️ 精英怪"; if(type==="event") return "❓ 事件"; if(type==="rest") return "🔥 营火"; if(type==="shop") return "🛒 商人"; if(type==="boss") return "👑 小Boss"; return "未知"; }
function renderMap(){
    document.getElementById("battleUI").style.display="none"; document.getElementById("mapUI").style.display="block";
    let storyDiv=document.getElementById("storyTxt");
    if(player.chapter<=3) storyDiv.innerHTML=`📍 世界之塔 第 ${player.chapter} 章 · 当前层 ${currentNodePos.layer+1}/${mapLayers.length}`;
    else storyDiv.innerHTML=`🌟 最终决战 · 神之识守护者 🌟`;
    let container=document.getElementById("mapContainer"); container.innerHTML=`<div class="map-nodes" id="mapNodes"></div>`;
    let nodesDiv=document.getElementById("mapNodes");
    for(let i=0;i<mapLayers.length;i++){
        let rowDiv=document.createElement("div"); rowDiv.className="floor-row";
        for(let j=0;j<mapLayers[i].length;j++){
            let node=mapLayers[i][j], btn=document.createElement("div"); btn.className="map-node";
            if(i===currentNodePos.layer && j===currentNodePos.node){ btn.style.background="#4c8c9c"; btn.style.border="3px solid #ffd966"; }
            let eliteIcon=node.isElite?"⚠️":(node.type==='combat'?'⚔️':node.type==='rest'?'🔥':node.type==='shop'?'🛒':'❓');
            btn.innerHTML=`<div>${node.name}</div><div style="font-size:0.45rem">${eliteIcon}</div>`;
            if(i===currentNodePos.layer){ btn.onclick=()=>{ if(i===currentNodePos.layer){ currentNodePos={ layer:i, node:j }; enterNode(mapLayers[i][j]); } }; }
            rowDiv.appendChild(btn);
        }
        nodesDiv.appendChild(rowDiv);
    }
    refreshUI();
}
function enterNode(node){
    if(node.type==="combat"){ let enemies=createEnemies("normal",player.chapter,false); startCombat(enemies,false,false); }
    else if(node.type==="elite"){ let enemies=createEnemies("normal",player.chapter,true); startCombat(enemies,true,false); }
    else if(node.type==="event") eventTrigger();
    else if(node.type==="rest"){ let heal=18; player.hp=Math.min(player.maxHp,player.hp+heal); addBattleLog(`🔥 营火休息，恢复 ${heal} 生命。`); goToNextNode(); }
    else if(node.type==="shop") renderShop();
    else if(node.type==="boss"){
        if(player.chapter===3 && !finalBossDefeated){ let bosses=createEnemies("boss",player.chapter,false); startCombat(bosses,false,true); }
        else{ let bosses=createEnemies("boss",player.chapter,false); startCombat(bosses,false,false); }
    }
}
function goToNextNode(){
    currentNodePos.layer++;
    if(currentNodePos.layer>=mapLayers.length){
        if(player.chapter===3 && !finalBossDefeated){ finalBossDefeated=true; mapLayers=[[{ type:"boss", name:"✨ 神之识守护者 ✨", isElite:false }]]; currentNodePos={ layer:0, node:0 }; renderMap(); }
        else if(player.chapter<3) chapterClear(false);
        else chapterClear(true);
    } else { currentNodePos.node=0; saveRun(); renderMap(); }
}
function eventTrigger(){
    let events=[
        { desc:"你发现一座古老的祭坛，周围飘散着梦境之力。", choices:[
            { text:"献上10金币祈求祝福", effect:()=>{ if(player.gold>=10){ player.gold-=10; player.tempBless={ type:"strength", value:2, desc:"力量祝福" }; addBattleLog("获得力量祝福！"); } else addBattleLog("金币不足"); }, glitch:0 },
            { text:"触摸祭坛", effect:()=>{ player.hp=Math.min(player.maxHp,player.hp+10); addBattleLog("恢复10生命。"); }, glitch:0.2 }
        ]},
        { desc:"一个幽灵般的向导出现：「勇者，前方有危险。你要绕路还是直行？」", choices:[
            { text:"绕路 (失去5金币但避免战斗)", effect:()=>{ player.gold=Math.max(0,player.gold-5); goToNextNode(); }, glitch:0 },
            { text:"直行", effect:()=>{ addBattleLog("你继续前进。"); goToNextNode(); }, glitch:0 }
        ]}
    ];
    let ev=events[Math.floor(Math.random()*events.length)];
    document.getElementById("storyTxt").innerHTML=ev.desc;
    let container=document.getElementById("mapContainer"); container.innerHTML=`<div style="padding:15px; text-align:center" id="eventActions"></div>`;
    let actionsDiv=document.getElementById("eventActions");
    ev.choices.forEach(ch=>{
        let btn=document.createElement("div"); btn.className="minecraft-btn"; btn.innerText=ch.text;
        btn.onclick=()=>{ ch.effect(); if(Math.random()<ch.glitch) addLog(">>> 内存读取错误: 无法解析 'Cold_Sun' <<<",true); saveRun(); renderMap(); };
        actionsDiv.appendChild(btn);
    });
}
function renderShop(){
    document.getElementById("storyTxt").innerHTML="流浪商人: 梦想大陆的旅者，需要什么？";
    let container=document.getElementById("mapContainer");
    container.innerHTML=`<div style="padding:15px; text-align:center">
        <div class="minecraft-btn" id="buyAtk">⚔️ 攻击+2 (50金)</div>
        <div class="minecraft-btn" id="buyDef">🛡️ 防御+2 (40金)</div>
        <div class="minecraft-btn" id="buyHp">❤️ 生命+10 (60金)</div>
        <div class="minecraft-btn" id="buyCard">📜 随机技能卡 (80金)</div>
        <div class="minecraft-btn" id="removeCard">🗑️ 删除一张牌 (80金)</div>
        <div class="minecraft-btn" id="exitShop">🚪 离开</div>
    </div>`;
    document.getElementById("buyAtk").onclick=()=>{ if(player.gold>=50){ player.gold-=50; globalPerm.atkUp++; savePermToGlobal(); addBattleLog("攻击卡伤害永久+1"); } else addBattleLog("金币不足"); renderShop(); };
    document.getElementById("buyDef").onclick=()=>{ if(player.gold>=40){ player.gold-=40; globalPerm.defUp++; savePermToGlobal(); addBattleLog("防御卡格挡永久+1"); } else addBattleLog("金币不足"); renderShop(); };
    document.getElementById("buyHp").onclick=()=>{ if(player.gold>=60){ player.gold-=60; player.maxHp+=10; player.hp+=10; addBattleLog("最大生命+10"); } else addBattleLog("金币不足"); renderShop(); };
    document.getElementById("buyCard").onclick=()=>{ if(player.gold>=80){ player.gold-=80; let cards=[getStrengthPotion, getRejuvenate, getWhirlwind, getInsight, getCleave, getIronHide, getBattleTrance]; let newCard=cards[Math.floor(Math.random()*cards.length)](); playerLibrary.push(newCard); addBattleLog(`获得新卡牌: ${newCard.name}！已加入牌库。`); } else addBattleLog("金币不足"); renderShop(); };
    document.getElementById("removeCard").onclick=()=>{ if(player.gold>=80){ player.gold-=80; if(playerLibrary.length<=4){ addBattleLog("牌库卡牌太少，无法删除！"); renderShop(); return; } showRemoveCardMenu(); } else addBattleLog("金币不足，需要80金币！"); };
    document.getElementById("exitShop").onclick=()=>{ goToNextNode(); };
    refreshUI();
}
function showRemoveCardMenu(){
    let overlay=document.createElement("div"); overlay.className="settle-overlay";
    overlay.innerHTML=`<div class="settle-card"><div class="settle-title">选择要删除的卡牌</div><div class="reward-grid" id="removeGrid"></div></div>`;
    document.body.appendChild(overlay); let grid=document.getElementById("removeGrid");
    playerLibrary.forEach((card,idx)=>{
        let btn=document.createElement("div"); btn.className="minecraft-btn"; btn.innerText=`${card.name} - ${card.desc}`;
        btn.onclick=()=>{ playerLibrary.splice(idx,1); addBattleLog(`从牌库中删除了 ${card.name}。`); overlay.remove(); renderShop(); };
        grid.appendChild(btn);
    });
    let cancelBtn=document.createElement("div"); cancelBtn.className="minecraft-btn"; cancelBtn.innerText="取消";
    cancelBtn.onclick=()=>{ overlay.remove(); renderShop(); };
    grid.appendChild(cancelBtn);
}

// ========== UI 刷新 ==========
function refreshBattleUI(){
    if(!inCombat) return;
    document.getElementById("hpVal").innerText=player.hp;
    document.getElementById("maxHpVal").innerText=player.maxHp;
    document.getElementById("blockVal").innerText=player.block;
    document.getElementById("strengthVal").innerText=player.strength;
    document.getElementById("goldVal").innerText=player.gold;
    document.getElementById("chapterVal").innerText=player.chapter;
    document.getElementById("emberVal").innerText=player.ember;
    document.getElementById("energyVal").innerText=player.energy;
    document.getElementById("levelVal").innerText=player.level;
    document.getElementById("pointsVal").innerText=player.remainingPoints;
    let container=document.getElementById("enemiesContainer"); container.innerHTML="";
    currentEnemies.forEach((e,idx)=>{
        let div=document.createElement("div"); div.className="enemy-card";
        if(idx===selectedEnemyIndex) div.classList.add("selected");
        div.onclick=()=>{ selectedEnemyIndex=idx; refreshBattleUI(); };
        let intentText=e.currentIntent?e.currentIntent.type:"?", intentVal=(e.currentIntent&&e.currentIntent.type==="attack")?` ${e.intentValue}`:"";
        div.innerHTML=`<div>${e.name}</div><div>❤️ ${e.hp}/${e.maxHp}</div><div class="health-bar-sm"><div class="health-fill-sm" style="width:${(e.hp/e.maxHp)*100}%"></div></div><div>🛡️ 格挡 ${e.block}</div><div>⚔️ 意图: ${intentText}${intentVal}</div><div>💪 力量+${e.strength}</div>`;
        container.appendChild(div);
    });
    let handDiv=document.getElementById("handCards"); handDiv.innerHTML="";
    for(let i=0;i<player.hand.length;i++){
        let card=player.hand[i], cardDiv=document.createElement("div"); cardDiv.className="card";
        if(card.curse) cardDiv.classList.add("curse");
        if(card.cost>player.energy) cardDiv.classList.add("disabled");
        cardDiv.innerHTML=`<div>${card.name}</div><div>⚡${card.cost}</div><div style="font-size:0.45rem">${card.desc}</div>`;
        cardDiv.onclick=()=>playCard(i); handDiv.appendChild(cardDiv);
    }
}
function refreshUI(){
    document.getElementById("hpVal").innerText=player.hp;
    document.getElementById("maxHpVal").innerText=player.maxHp;
    document.getElementById("blockVal").innerText=player.block;
    document.getElementById("strengthVal").innerText=player.strength;
    document.getElementById("goldVal").innerText=player.gold;
    document.getElementById("chapterVal").innerText=player.chapter;
    document.getElementById("emberVal").innerText=player.ember;
    document.getElementById("levelVal").innerText=player.level;
    document.getElementById("pointsVal").innerText=player.remainingPoints;
}
function addLog(msg, isGlitch=false){
    let logDiv=document.getElementById("logArea");
    let entry=document.createElement("div"); entry.className="log-entry";
    if(isGlitch) entry.classList.add("glitch-log");
    entry.innerText=msg; logDiv.appendChild(entry); entry.scrollIntoView({ behavior:"smooth", block:"nearest" });
    while(logDiv.children.length>40) logDiv.removeChild(logDiv.firstChild);
    if(!isGlitch && Math.random()<0.1){
        let glitchMsgs=[">>> 内存读取错误 [0x7F3A] 无法定位符号: 'Cold_Sun' <<<",">>> 数据污染: 残留片段 '冷日计划' 已隔离 <<<",">>> 段错误: 未注册关键词 'ET-01' 介入 <<<"];
        let rand=glitchMsgs[Math.floor(Math.random()*glitchMsgs.length)];
        let gEntry=document.createElement("div"); gEntry.className="log-entry glitch-log"; gEntry.innerText=rand; logDiv.appendChild(gEntry);
    }
}
function addBattleLog(msg){ addLog(msg); }
function saveRun(){
    let runData={ hp:player.hp, maxHp:player.maxHp, gold:player.gold, chapter:player.chapter, ember:player.ember, playerLibrary:playerLibrary, mapLayers, currentNodePos, finalBossDefeated,
        level:player.level, exp:player.exp, nextExp:player.nextExp, attrStr:player.attrStr, attrCon:player.attrCon, attrDex:player.attrDex, remainingPoints:player.remainingPoints };
    localStorage.setItem("YakRun", JSON.stringify(runData));
}
function loadRun(){
    let raw=localStorage.getItem("YakRun");
    if(raw){
        let d=JSON.parse(raw);
        player.hp=d.hp; player.maxHp=d.maxHp; player.gold=d.gold; player.chapter=d.chapter; player.ember=d.ember;
        if(d.playerLibrary) playerLibrary=d.playerLibrary;
        mapLayers=d.mapLayers||[]; currentNodePos=d.currentNodePos||{ layer:0, node:0 }; finalBossDefeated=d.finalBossDefeated||false;
        player.level=d.level||1; player.exp=d.exp||0; player.nextExp=d.nextExp||100;
        player.attrStr=d.attrStr||0; player.attrCon=d.attrCon||0; player.attrDex=d.attrDex||0; player.remainingPoints=d.remainingPoints||0;
    }
    if(mapLayers.length===0) generateMapLayers();
    recalcPlayerStats();
    refreshUI();
}

// ========== 加载动画 ==========
(function(){
    const loadingTexts=["「传说中，世界之塔连接着梦想与现实的边界...」","「古老的预言：当七颗星辰汇聚，塔顶的神之识将苏醒。」","「勇者啊，你的每一次抉择都在改写命运的丝线。」","「塔内回响着远古的低语：冷日计划...ET-01...」"];
    const randomIndex=Math.floor(Math.random()*loadingTexts.length);
    const loadingDiv=document.getElementById("loadingText");
    if(loadingDiv) loadingDiv.innerHTML=loadingTexts[randomIndex]+"<br><span style='font-size:0.6rem; color:#aaa'>正在构建塔层...</span>";
    const MIN_LOAD_TIME=1500, startTime=Date.now();
    window.hideLoadingScreen=function(){
        let now=Date.now(), remaining=MIN_LOAD_TIME-(now-startTime);
        if(remaining>0) setTimeout(()=>{ let ov=document.getElementById("loadingOverlay"); if(ov){ ov.style.opacity="0"; setTimeout(()=>{ ov.style.display="none"; },500); } }, remaining);
        else{ let ov=document.getElementById("loadingOverlay"); if(ov){ ov.style.opacity="0"; setTimeout(()=>{ ov.style.display="none"; },500); } }
    };
})();

// ========== 初始化 ==========
try {
    loadPerm();
    recalcPlayerStats();
    let existing=localStorage.getItem("YakRun");
    if(existing){ loadRun(); renderMap(); }
    else{ generateMapLayers(); currentNodePos={ layer:0, node:0 }; renderMap(); saveRun(); }
} catch(e){ console.error(e); document.getElementById("storyTxt").innerHTML="错误：无法加载游戏，请返回主菜单重试。"; }
finally{ if(window.hideLoadingScreen) window.hideLoadingScreen(); }
document.addEventListener("click",function(e){ if(e.target.id==="endTurnBtn") endTurn(); if(e.target.id==="surrenderBtn") defeat(); });
document.getElementById("openLevelUpBtn")?.addEventListener("click",()=>{ window.location.href="levelup.html"; });