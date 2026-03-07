---
alwaysApply: true
---

# 项目规范

## 目录规范

- 每个新游戏必须放在 `games/<game_name>/` 目录
- 每个游戏入口文件统一为 `games/<game_name>/index.html`
- 每个游戏的资源文件放在该游戏目录内，例如 `games/<game_name>/assets/`
- 禁止把正式业务代码放在 `.trae/` 目录（规则文件目录除外）

## 开发流程规范

- 开发新游戏时先创建新目录，不覆盖已有游戏目录
- 共享逻辑优先抽到 `games/shared/`，避免跨游戏复制粘贴
- 新增或修改游戏后，必须保证可通过 `http://localhost:8000/games/<game_name>/index.html` 访问

## 命名规范

- 目录名使用小写英文与短横线，例如 `racing`, `space-shooter`
- 文件名使用小写英文，避免中文、空格和特殊字符

## 维护规范

- 删除与当前保留游戏无关的页面文件，保持仓库清晰
- 任何后续新游戏都按照本规范执行

## Skill 安装规范

- 后续仅在 `.trae/` 目录体系内安装或管理项目所需 skill
- 不在 `.agents/skills`、`.codebuddy`、`.continue` 等目录新增或复制 skill
