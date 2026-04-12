# 小游戏中心 (Mini Games Center)

本项目包含一系列使用 HTML5、CSS3 和 Vanilla JavaScript 制作的轻量级小游戏。

## 游戏列表

### 1. 商店模拟器 (Shop Simulator)
一个模拟经营类小游戏。
- **玩法**：玩家扮演商店老板，经营一家拥有100种各类生活用品的杂货店。游戏具有完整的经济系统，顾客会不断进入商店挑选商品并在收银台排队结账。
- **特色**：
  - 100种不同的真实商品（食品、数码、文具、家具等）。
  - 随机生成的中文名字顾客，真实的浏览和排队路线。
  - **升级系统**：可以花费资金购买扩展货架、雇佣自动化收银员，或进行营销来增加客流量。
  - **状态保存**：资金和升级进度会自动保存在浏览器的 LocalStorage 中。
- **技术栈**：原生 HTML/CSS/JS、LocalStorage、CSS 动画和绝对定位。
- **访问路径**：`games/shop-simulator/index.html`

## 开发与运行

1. 克隆本项目。
2. 在项目根目录启动一个本地 HTTP 服务器，例如使用 Python：
   ```bash
   python3 -m http.server 8000
   ```
3. 在浏览器中打开 `http://localhost:8000` 即可看到游戏中心入口。

## 开发规范
请参考 `.trae/rules/project_rules.md` 了解本项目的目录规范和开发流程。