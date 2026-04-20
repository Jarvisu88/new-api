# Frontend Homepage Resume Steps - 2026-04-20

## 这份文档是干什么的

这是一份给“明天继续做首页前端设计”用的操作手册。

目标不是介绍背景，而是让你明天打开电脑后，直接按步骤操作，就能无缝接上今天的工作。

## 当前开发基线

- 仓库路径：`F:\newapi code\new-api`
- 当前首页开发分支：`v0.12.14-graft-v1-dev`
- 当前首页设计基线 tag：`web-homepage-v5`
- 当前交接文档：
  - `docs/frontend-homepage-handoff-2026-04-20.md`

## 明天开工的标准流程

### 第 1 步：进入仓库

在 PowerShell 执行：

```powershell
cd "F:\newapi code\new-api"
```

确认你已经在正确目录：

```powershell
Get-Location
```

预期应该看到：

```text
Path
----
F:\newapi code\new-api
```

### 第 2 步：先看当前本地状态

执行：

```powershell
git status --short
```

如果输出里看到下面这些，不用紧张，这是已知的非首页文件：

- `AGENTS.md`
- `web/vite.config.js`
- `docs/development-worktree-map.md`

这些不是首页设计的核心文件，继续开发首页时不要混进首页提交里。

### 第 3 步：切到首页开发分支

执行：

```powershell
git checkout v0.12.14-graft-v1-dev
```

再确认一次：

```powershell
git branch --show-current
```

预期输出：

```text
v0.12.14-graft-v1-dev
```

### 第 4 步：拉取远端最新代码

执行：

```powershell
git pull fork v0.12.14-graft-v1-dev
```

解释：

- `fork` 是当前可用远端
- 这一步会把今天已经推上去的首页改动和交接文档拉下来

### 第 5 步：确认当前版本点

执行：

```powershell
git log --oneline -5
```

正常情况下，顶部应该能看到这些首页相关提交：

```text
10be5d4b docs(frontend): add homepage handoff note
d401d1f0 fix(web): refine hero interactions and menu motion
9f688e69 feat(web): add hero proximity interactions
26b54644 feat(web): add animated sentence flip headline
09f5e4e7 fix(web): remove hero mask and restore quick menu
```

如果你想确认当前首页设计基线 tag：

```powershell
git show --no-patch --decorate web-homepage-v5
```

## 明天先看哪个文档

先打开这两份：

1. `docs/frontend-homepage-handoff-2026-04-20.md`
2. `docs/frontend-homepage-resume-steps-2026-04-20.md`

建议顺序：

1. 先看 `handoff`，理解今天做到了哪
2. 再看 `resume steps`，直接按步骤启动开发

## 首页相关核心文件

明天继续优化时，优先只看这几个文件：

- `web/src/pages/Home/index.jsx`
- `web/src/index.css`
- `web/src/components/common/SentenceFlip.jsx`
- `web/src/components/common/ProximityBackground.jsx`
- `web/src/components/common/ProximityProviderIcons.jsx`

如果只是继续做首页视觉和交互，原则上不要先去动别的文件。

## 如何启动前端

### 第 1 步：进入前端目录

```powershell
cd "F:\newapi code\new-api\web"
```

### 第 2 步：安装依赖

如果你不确定依赖是否完整，执行：

```powershell
bun install
```

如果只是今天这条线继续，通常已经装过了，也可以跳过。

### 第 3 步：启动开发服务

```powershell
bun run dev
```

正常会出现本地开发地址。

如果你是看预览构建版，也可以：

```powershell
bun run build
bun run preview
```

今天用过的预览地址是：

- `http://127.0.0.1:4174/`

## 明天继续优化首页时，建议的工作顺序

### 方向 1：继续打磨 Hero 区

优先内容：

- 品牌条更精致
- 背景 glowing dots 更接近参考站
- 标题和按钮上下节奏更紧

### 方向 2：继续打磨右下角圆形快捷菜单

优先内容：

- 圆形菜单展开半径
- 文案位置和动效层次
- hover 反馈是否够高级

### 方向 3：继续做响应式收口

重点检查：

- 1440px 桌面
- 笔记本低高度
- 390px 手机

## 如果你想回看前几个首页版本

查看已有首页版本标签：

```powershell
git tag -l "web-homepage-v*"
```

当前版本链：

- `web-homepage-v1`
- `web-homepage-v2`
- `web-homepage-v3`
- `web-homepage-v4`
- `web-homepage-v5`

### 临时查看某个版本

例如看第五版：

```powershell
git checkout web-homepage-v5
```

看完以后一定切回开发分支：

```powershell
git checkout v0.12.14-graft-v1-dev
```

## 如果切分支时报错，怎么办

### 场景 1：提示有本地修改，不能切换

先看是哪些文件：

```powershell
git status --short
```

如果只是已知非首页文件：

- `AGENTS.md`
- `web/vite.config.js`
- `docs/development-worktree-map.md`

先不要乱清空。

先判断：

1. 这些改动是不是你自己要保留的
2. 它们是不是和首页开发完全无关

### 安全做法

不要直接用：

```powershell
git reset --hard
```

不要直接删。

先看清楚再处理。

如果只是临时切换需要隔离本地状态，优先用：

```powershell
git stash push -u -m "temp-before-homepage-resume"
```

做完后恢复：

```powershell
git stash list
git stash pop
```

只有在你确定这些本地内容是你自己临时改的，才这么做。

## 明天继续设计时的提交建议

继续沿用今天的做法：

- 每次改一小块就提交一次
- 首页重大节点继续打 tag

建议命名：

- `web-homepage-v6`
- `web-homepage-v7`
- `web-homepage-v8`

示例流程：

```powershell
git add -- web/src/pages/Home/index.jsx web/src/index.css web/src/components/common/ProximityBackground.jsx web/src/components/common/ProximityProviderIcons.jsx
git commit -m "feat(web): refine homepage hero composition"
git push fork HEAD
```

如果这一版值得单独留档：

```powershell
git tag -a web-homepage-v6 -m "Homepage redesign v6"
git push fork web-homepage-v6
```

## 明天开始前，建议做一次快速核对

在仓库根目录执行：

```powershell
git branch --show-current
git status --short
git log --oneline -3
```

你应该确认三件事：

1. 当前分支是不是 `v0.12.14-graft-v1-dev`
2. 有没有意外混入首页无关文件
3. 最近提交是不是今天这条首页线

## 当前首页最终已知有效状态

截至今天收工，下面这些应该都已经成立：

- 首页主标题是动态 Sentence Flip
- 说明段落已经去掉显示
- Hero 背景是 glowing dots 风格
- 品牌条有接近交互
- 品牌 tooltip 不叠字
- 右下角圆形快捷菜单保留
- 右下角触发按钮旋转后文字横向

## 明天最短开工路线

如果你明天只想最快进入工作状态，直接执行这组命令：

```powershell
cd "F:\newapi code\new-api"
git checkout v0.12.14-graft-v1-dev
git pull fork v0.12.14-graft-v1-dev
cd web
bun run dev
```

然后打开：

- `http://127.0.0.1:4174/`

再配合看：

- `docs/frontend-homepage-handoff-2026-04-20.md`
- `docs/frontend-homepage-resume-steps-2026-04-20.md`

就能直接接着今天的工作继续做。
