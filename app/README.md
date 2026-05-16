# 运营看板（Ops Dashboard）

Nuxt 4 + Tailwind v4 + JSON 驱动的内部运营仪表盘。目前用 `public/mock/*.json` 跑数据，未来一行配置切到后端接口。

---

## 一、环境要求

| 工具 | 版本 | 说明 |
|---|---|---|
| Node.js | **20 / 22 LTS 优先**；24 也能跑（坑见第六节） | 跑 Nuxt dev / build |
| pnpm | 9.x（项目锁到 `pnpm@9.12.0`） | 推荐用 **corepack** 起，免装全局 |
| Git | 任意现代版本 | 拉代码用 |

不需要：装 Java / Docker / 后端服务（数据走 JSON 文件）。

---

## 二、第一次本地启动（5 分钟）

```bash
# 1. 拉代码
git clone https://github.com/githubstudycloud/gi032.git
cd gi032/app

# 2. 启用 corepack 管理的 pnpm（Node 16+ 自带）
corepack pnpm --version    # 第一次会自动下 pnpm@9.12.0

# 3. 装依赖（首次 5–10 分钟，看网速，~600 包）
corepack pnpm install

# 4. 起开发服务器
corepack pnpm dev
```

终端打印：

```
  ➜ Local:    http://0.0.0.0:3000/
  ➜ Network:  http://<你的局域网 IP>:3000/
```

浏览器打开 **http://localhost:3000/**。

> **没装 corepack？** 退路：`npm i -g pnpm@9.12.0` 然后用 `pnpm` 直接代替 `corepack pnpm`。

---

## 三、让同事看到（局域网访问）

dev 服务器默认绑 `0.0.0.0`，**同 WiFi / 同办公网的同事**可以直接用：

```
http://<你的局域网 IP>:3000/
```

### 怎么查自己的局域网 IP

**Windows（PowerShell）：**

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' -or $_.IPAddress -like '172.*' } |
  Select-Object IPAddress, InterfaceAlias
```

**Windows（cmd）：** `ipconfig` → 看 "IPv4 地址"
**macOS / Linux：** `ifconfig | grep 'inet '` 或 `ip addr | grep inet`

### 如果同事连不上，先排查

1. **防火墙**：Windows Defender 第一次跑 `pnpm dev` 会弹"是否允许 Node.js 通过防火墙"，要勾"专用网络"（Private）。已经拒了的话：
   ```powershell
   # 管理员 PowerShell 一次性放通 3000 端口（仅专用网络）
   New-NetFirewallRule -DisplayName "Nuxt Dev 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
   ```
2. **网络隔离**：公司 WiFi 经常开"客户端隔离"（同 SSID 互相 ping 不通）。换有线 / 手机热点 / 测试网。
3. **走代理**：同事浏览器代理设置可能把内网 IP 也代理出去 —— 把 `192.168.*` 加入代理白名单。

### 不想暴露给同事

改 [nuxt.config.ts](nuxt.config.ts) 里 `devServer.host` 回 `'127.0.0.1'`，重启即可。

### 跨办公区（领导从家访问）

LAN 不够，需要内网穿透。推荐两种：

- **ngrok**（个人快用）：`ngrok http 3000` —— 拿到一个 `https://xxx.ngrok-free.app` 公网链接
- **cloudflared**（免账号 quick tunnel）：`cloudflared tunnel --url http://localhost:3000`

两者都给短期临时链接。生产部署不在本仓库范围。

---

## 四、常用脚本

```bash
corepack pnpm dev           # 起开发服 (HMR)
corepack pnpm build         # 产线构建（输出到 .output/）
corepack pnpm preview       # 预览 build 产物
corepack pnpm typecheck     # 跑 vue-tsc 类型检查
corepack pnpm generate      # 静态生成（如果哪天要静态托管）
```

---

## 五、项目结构速览

```
app/
├── nuxt.config.ts                  # 入口配置（dev host/port、数据源模式、模块）
├── package.json                    # 锁 pnpm@9.12.0、依赖版本
├── public/mock/
│   ├── nav.json                    # 顶部 + 左侧菜单树（动态加菜单改这里）
│   └── branding.json               # 顶部 LOGO / 标题 / 版本号
├── app/
│   ├── app.vue                     # 根组件 + 标题模板
│   ├── layouts/default.vue         # 顶部 + 条件侧栏
│   ├── pages/
│   │   ├── index.vue               # 首页（无侧栏，介绍页）
│   │   └── [...slug].vue           # catch-all 占位页（标题 / 筛选 / 表格）
│   ├── components/
│   │   ├── layout/                 # AppTopBar / AppSidebar / AppSidebarItem
│   │   └── common/                 # PageHeader / FilterBar / DataTablePlaceholder
│   ├── composables/
│   │   ├── use-nav.ts              # 单一菜单 composable，派生 activeTop/showSidebar
│   │   ├── use-branding.ts         # 品牌信息
│   │   └── use-data-source.ts      # **核心：JSON ↔ API 切换 + transform 适配**
│   ├── types/                      # NavItem / DataSource 类型
│   ├── utils/nav-flat.ts           # 树扁平化（路径 → 面包屑）
│   └── assets/css/main.css         # Tailwind v4 @theme 调色 + 字体
├── PROMPT-LOG.md                   # 历次提问 / 决策记录（时间倒序）
└── CLAUDE.md                       # 项目硬规则（Claude Code 启动会自动加载）
```

---

## 六、最常用的两个改法

### 1. 加 / 改菜单

只动 [public/mock/nav.json](public/mock/nav.json)。结构是一棵树，根节点是 5 个一级菜单（首页 / AI辅助测试运营 / 用户反馈 / 后台运维 / 系统设置），每个一级下面 2-3 层。

字段说明：

```jsonc
{
  "key":      "ai-test-overview-summary",    // 唯一 ID
  "label":    "总览",                         // 展示文案
  "path":     "/ai-test/overview/summary",   // 路由（叶子必填）
  "single":   true,                           // （仅一级）标记为单页，不出侧栏（"首页"用）
  "icon":     "robot",                        // 预留，目前没接图标库
  "badge":    3,                              // 角标
  "disabled": false,                          // 禁用
  "children": [ ... ]                         // 子菜单
}
```

存盘后 dev 自动 HMR，浏览器**手动刷一下**即可（JSON 不会触发 Vite 热更）。

### 2. 切到后端接口

打开 [nuxt.config.ts](nuxt.config.ts) `runtimeConfig.public`：

```ts
runtimeConfig: {
  public: {
    dataSourceMode: 'api',                  // 'json' → 'api'
    apiBase: 'https://your-backend.com',    // 后端域名
    mockBase: '/mock',                      // JSON 模式才用
  },
}
```

接口路径在每个 composable 里：
- `useBranding`     → `GET /api/branding`
- `useNav`          → `GET /api/nav`

**字段对不上？** 在对应 composable 的 `transform` 里映射，业务页面一行不动。例如后端给的是 `{ code, data: { systemName, ... } }`：

```ts
// app/composables/use-branding.ts
transform: (raw: any) => ({
  title:    raw.data.systemName,
  subtitle: raw.data.description,
  // ...
})
```

---

## 七、已踩过的坑（Windows + Node 24 专项）

| 现象 | 修法 | 写死在哪 |
|---|---|---|
| `localhost:3000` 连不上但服务在跑 | `nuxt dev` 默认只绑 IPv6 `::1`，Win + Node 24 默认 IPv6-first；改 `devServer.host = '0.0.0.0'` | nuxt.config.ts |
| SSR worker `JS heap out of memory` | Nitro dev worker 内存上限在 Node 24 上触发；让数据只在客户端拉 (`useAsyncData({ server: false })`) | use-data-source.ts |
| 组件不解析 (`Failed to resolve AppTopBar`) | Nuxt 4 默认对子目录加路径前缀；改 `components: [{ path, pathPrefix: false }]` | nuxt.config.ts |
| Hydration mismatch | 数据 client-only 取的话 SSR/client 节点对不齐；用 `<ClientOnly>` 包数据驱动的段 + skeleton fallback | layout / index / catch-all |
| `obj.hasOwnProperty is not a function` | `@pinia/nuxt@0.6.1` 偷拉 Pinia 2，跟 Pinia 3 冲突；移出 modules | nuxt.config.ts |

**根治方案**：把 Node 切到 22 LTS（`nvm use 22` / `nvs add lts`）。上面所有坑应该都不复现，SSR 取数据也能恢复。

---

## 八、跑前自检

```bash
corepack pnpm typecheck    # vue-tsc 类型检查
corepack pnpm build        # 跑通 build = 跑通发布
```

UI 改了的话还要再过一遍：
- 首页 `/`
- AI辅助测试运营 `/ai-test`
- 任一三级页 `/ai-test/overview/summary`

控制台不该有红色 error。

---

## 九、相关文档

- [CLAUDE.md](CLAUDE.md) — 项目硬规则（Vue + Nuxt + 样式 + 字体禁忌等）
- [PROMPT-LOG.md](PROMPT-LOG.md) — 历次提问、决策、踩坑记录（时间倒序）
- [SETUP-LOG.md](SETUP-LOG.md) — Claude Code 协作环境的初始化记录
