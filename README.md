# 小游戏中心 (xjr-ai)

一个基于原生 HTML/JS/CSS 的多游戏集合平台。目前包含多款可运行的休闲小游戏，并提供了一个统一的游戏大厅进行导航。

## 项目结构

```text
xjr-ai/
├─ index.html                 # 游戏大厅（首页）
├─ games/                     # 游戏目录
│  ├─ parkour-game/           # 无尽跑酷游戏
│  ├─ battle-royale-shooter/  # 枪战吃鸡战场
│  ├─ 3d-shooter/             # 3D 射击游戏
│  └─ racing/                 # 赛车狂飙
├─ .trae/
│  └─ rules/
│     └─ project_rules.md     # 项目开发规范
└─ skills-lock.json
```

## 包含游戏

1. **无尽跑酷 (parkour-game)**
   - 玩法：按空格跳跃，长按可飞行（最多30秒），躲避障碍物。
2. **枪战吃鸡战场 (battle-royale-shooter)**
   - 玩法：上帝视角射击，收集金币购买装备（弹簧、飞行装置等），努力生存。
3. **赛车狂飙 (racing)**
   - 玩法：车辆选择、追捕机制、天气变化、城市道路场景。
4. **3D 射击游戏 (3d-shooter)**
   - 玩法：第一人称3D射击。

## 本地运行

在项目根目录执行以下命令启动本地服务器：

```bash
python3 -m http.server 8000
```

然后在浏览器打开游戏大厅：

```text
http://localhost:8000/
```

## 开发规范

项目规则文件位于：`.trae/rules/project_rules.md`

核心约束：

1. 每个新游戏必须放在 `games/<game_name>/` 目录
2. 每个游戏入口文件统一为 `games/<game_name>/index.html`
3. 每次创建新游戏后，**必须**同步更新项目根目录的 `index.html`，将新游戏添加到“小游戏中心”的列表中
4. 正式业务代码不放在 `.trae/`（规则文件目录除外）
