# Boxy - 你的专属应用收藏与管理工具

Boxy 是一款轻量级的个人应用管理导航工具，旨在帮助你高效地收藏、整理和查找各类软件及应用程序。通过直观的界面和便捷的拖拽操作，你可以轻松管理你收藏的宝藏软件，并支持 WebDAV 同步，确保数据安全与便捷。

## ✨ 主要功能

*   **应用与分类管理**：创建、编辑、删除应用和分类，构建清晰的管理结构。
*   **拖拽排序**：通过拖拽即可调整分类和应用的位置，实现个性化布局。
*   **快速搜索**：实时搜索功能，帮助你迅速找到目标应用。
*   **数据导入/导出**：支持 JSON 格式的数据备份与恢复。
*   **WebDAV 同步**：无缝对接 WebDAV 服务，将你的应用数据同步到云端，多设备访问无忧。
*   **智能图标获取**：支持自定义图标URL或上传图片 (自动转 Base64)、代理 API 获取、Google Favicon 降级等多级策略。
*   **数据分享**：一键生成 Gist 分享链接，支持预览模式和智能合并导入。
*   **仓库管理**：站长可在线将当前数据回写到 GitHub 仓库，更新初始推荐列表。

## 🛠️ 技术栈

*   **前端**：React, Vite, TailwindCSS
*   **UI 组件**：Lucide Icons
*   **拖拽库**：Dnd-kit
*   **后端 (Serverless Functions)**：Vercel Serverless Functions (Node.js) / Cloudflare Pages Functions (Edge Runtime)

## 🚀 快速开始 (本地开发)

请确保你的本地环境已安装 Node.js (v18+) 和 npm。

1.  **克隆仓库**:
    ```bash
    git clone https://github.com/Airlur/boxy.git
    cd boxy
    ```
2.  **安装依赖**:
    ```bash
    npm install
    ```
3.  **启动开发服务器**:
    ```bash
    npm run dev
    ```
4.  **访问服务**
    打开浏览器访问 http://localhost:3137 。

**注意**：在本地 `npm run dev` 环境下，Favicon 的代理 API (`/api/favicon`) 不会被自动模拟。前端会尝试请求该代理 API，失败后会自动降级为直接请求 Google Favicon API。如果你本地开启了代理，则会正常显示图标；如果未开启代理且无法访问 Google，则会显示应用名称的首字母。

## ☁️ WebDAV 同步指南

Boxy 支持通过 WebDAV 协议将你的数据同步到云端，实现多设备间的数据共享与备份。

### 配置说明
1.  **服务器地址**：输入完整的 WebDAV 地址，例如 `https://dav.jianguoyun.com/dav/` 或 `https://zeze.teracloud.jp/dav/`。
2.  **账号密码**：
    *   使用 **应用密码 (App Password)** 而非账号登录密码。
3.  **自动同步**:
    *   开启后，Boxy 会在启动时尝试拉取云端最新数据。
    *   当你修改数据（添加、排序、删除）并停止操作 2 秒后，Boxy 会自动将变更推送到云端。
    *   注意：开启自动同步会自动勾选“记住密码”。

## 📢 分享与管理

### 数据分享 (Gist 快照)
你可以一键生成当前数据的 **分享链接** (基于 GitHub Gist)，发送给朋友或在社区分享。
*   **预览模式**：访问分享链接的用户将进入只读预览模式，并支持一键合并导入到他们的本地库。
*   **无需鉴权**：分享功能默认使用匿名 Gist，需要站长配置 Token，普通用户无需任何配置。

### 站长功能：更新仓库初始数据
如果你是网站部署者，你可以在设置中通过 **“仓库管理”** 功能，将当前网页上的最新数据回写到 GitHub 仓库的 `initialData.json`。这样，新访问的用户将直接看到你推荐的最新列表。

**启用此功能需在 Vercel/Cloudflare 后台配置环境变量：**
*   `GITHUB_TOKEN`：具有 `repo` 和 `gist` 权限的 Token，例如 `ghp_xxxxx`。
*   `GITHUB_REPO`：你的仓库地址，不需要GitHub的域名，例如 `Airlur/boxy`。
*   `ADMIN_PASSWORD`：自定义的管理员密码，例如 `123456` 。

`GITHUB_TOKEN` 的创建步骤：
 + 打开 https://github.com/settings/tokens ，点击Generate new token，选择 Generate new token(classic)
 + Note 输入 Boxy Admin Token
 + Expiration (过期时间)：建议选 1 年或选 "No expiration" (永不过期)。如果过期了你的“更新仓库”功能无法使用，需要重新配置。
 + Select scopes (权限范围):
   + repo：(Full control of private repositories) —— 必须勾选。
   + gist：(Create gists) —— 必须勾选。
   + 其他都不需要。

## ⚙️ 部署

Boxy 支持部署到 Vercel 或 Cloudflare Pages 。

### Vercel
你可以在Vercel上一键部署自己的 Boxy 实例：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/Airlur/boxy)

或者按照以下步骤手动部署：
1.  Fork 项目，使用 GitHub 账户登录 [Vercel](https://vercel.com/) 。
2.  点击右上角的 `Add New` 按钮，下拉框选择第一个 `Project` 。
3.  选择Boxy，点击 `Import`。`Framework Preset` 选择 `Vite`，点击`Deploy`。


### Cloudflare Pages
你可以在Cloudflare Pages上一键部署自己的 Boxy 实例：

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://dash.cloudflare.com/?to=/:account/pages/new/provider/github)

或者按照以下步骤手动部署：
1.  Fork 项目，然后登录打开 [Cloudflare Dashbord](https://dash.cloudflare.com/)。
2.  找到左侧菜单中的 `计算和 AI` ，选择 `Workers 和 Pages`，点击右上角的 `创建应用程序` 。
3.  点击卡片下方 `Looking to deploy Pages?` 右边的 `Get started` 按钮。
4.  连接 GitHub账号，选择 Boxy 仓库，点击下方 `开始设置`。
5.  配置项目设置：
      - **项目名称**： `boxy`
      - **生产分支**： `main`
      - **框架预设**： `React(Vite)`
      - **构建命令**： `npm run build`
      - **构建输出目录**： `dist`
6.  点击 `保存并部署`，等待部署完成。

## 📦 项目结构概览

*   `public/`：静态资源文件。
*   `api/`：(Vercel) Serverless Functions。
    *   `webdav.js`, `favicon.js`
    *   `gist.js` (分享功能), `update-repo.js` (仓库回写)
*   `functions/api/`：(Cloudflare Pages) Edge Functions。
    *   同上，对应 Cloudflare 运行环境。
*   `src/`：前端 React 应用程序源代码。
    *   `src/App.jsx`：主应用入口，包含核心状态管理。
    *   `src/components/`：
        *   `SortableItem.jsx`：拖拽包装组件。
        *   `LinksInput.jsx`：动态链接输入框组件。
        *   `modals/`：各类模态框组件 (`SettingsModal.jsx`, `ShareModal.jsx`, `SoftwareModal.jsx` 等)。
    *   `src/data/initialData.json`：初始化数据源。
    *   `src/index.css`：TailwindCSS 样式。
*   `vite.config.js`：Vite 配置 (包含本地 API Mock)。
*   `tailwind.config.js`：TailwindCSS 配置。

## 🤝 贡献

欢迎提出任何改进建议或提交 Pull Request。

## 📄 许可证

本项目采用 MIT 许可证。