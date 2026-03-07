# xjr-ai

一个基于原生 HTML Canvas 的赛车游戏项目，当前包含 1 个可运行游戏：`自由远景赛车`。

## 项目结构

```text
xjr-ai/
├─ games/
│  └─ racing/
│     └─ index.html
├─ .trae/
│  └─ rules/
│     └─ project_rules.md
└─ skills-lock.json
```

## 当前游戏

- 游戏名称：自由远景赛车
- 入口文件：`games/racing/index.html`
- 玩法要点：车辆选择、追捕机制、天气变化、城市道路场景

## 本地运行

在项目根目录执行：

```bash
python3 -m http.server 8000
```

然后在浏览器打开：

```text
http://localhost:8000/games/racing/index.html
```

## 开发规范

项目规则文件位于：

- `.trae/rules/project_rules.md`

核心约束：

- 每个新游戏放在 `games/<game_name>/`
- 每个游戏入口统一为 `games/<game_name>/index.html`
- 正式业务代码不放在 `.trae/`（规则文件目录除外）
- 后续 skill 仅按项目规则进行管理

## 新增游戏约定

后续开发新游戏时，请按以下方式组织：

1. 在 `games/` 下创建新目录（例如 `games/space-shooter/`）
2. 在新目录内创建 `index.html` 作为入口
3. 通过 `http://localhost:8000/games/<game_name>/index.html` 验证可访问
