<div align="center">
  <img src="../frontend/public/logos/logo_blue.svg" alt="openteams" width="100">
</div>

<div align="center">
  <img src="../frontend/public/openteams-brand-logo.png" alt="openteams" width="200" style="margin-top: 10px; margin-bottom: 10px;">

  <h5>規劃、構建、交付——不再只靠一個 AI，而是與你的 AI 團隊並肩完成</h5>

  <p>
    openteams 是一款開源、本地優先的 AI 桌面應用，幫助獨立開發者透過一支可控的 AI 團隊，更快地規劃、構建和交付軟體。
  </p>

  <p>
    <a href="https://www.npmjs.com/package/openteams-web"><img alt="npm" src="https://img.shields.io/npm/v/openteams-web?style=flat-square" /></a>
    <a href="https://github.com/openteams-lab/openteams/actions/workflows/pre-release.yml"><img alt="Build" src="https://github.com/openteams-lab/openteams/actions/workflows/pre-release.yml/badge.svg" /></a>
    <a href="../LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" /></a>
    <a href="https://discord.gg/MbgNFJeWDc"><img alt="Discord" src="https://img.shields.io/badge/Discord-Join%20Chat-5865F2?style=flat-square&logo=discord&logoColor=white" /></a>
    <a href="images/openteams-wechat-community.png"><img alt="WeChat" src="https://img.shields.io/badge/WeChat-Join%20Group-07C160?style=flat-square&logo=wechat&logoColor=white" /></a>
    <a href="images/openteams-feishu-community.png"><img alt="Feishu/Lark" src="https://img.shields.io/badge/Feishu%2FLark-Join%20Group-3370FF?style=flat-square" /></a>
    <a href="https://doc.openteams-lab.com/getting-started"><img alt="Platforms" src="https://img.shields.io/badge/Platforms-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Web-2EA44F?style=flat-square" /></a>
  </p>

  <p>
    <a href="#快速開始">快速開始</a> |
    <a href="https://doc.openteams-lab.com">文檔</a> 
  </p>

  <p align="center">
    <a href="../README.md">English</a> |
    <a href="./README_zh-Hans.md">簡體中文</a> |
    <a href="./README_zh-Hant.md">繁體中文</a> |
    <a href="./README_ja.md">日本語</a> |
    <a href="./README_ko.md">한국어</a> |
    <a href="./README_fr.md">Français</a> |
    <a href="./README_es.md">Español</a>
  </p>
</div>

---
<div align="center">
  <video src="https://github.com/user-attachments/assets/f918d5c7-68ff-4a8b-b2b4-f4f0ab31c17d" controls width="100%">
    <a href="https://github.com/user-attachments/assets/f918d5c7-68ff-4a8b-b2b4-f4f0ab31c17d">觀看產品影片</a>
  </video>
</div>

## 等一下——openteams 到底是什麼？

你可能已經在用 Claude Code、Codex、Gemini CLI 或其他編程 Agent。它們都能規劃、寫程式碼、審查和測試。但只要一項工作涉及多個 Agent，**你就會變成它們之間的「訊息總線」**：在終端之間搬運上下文、處理重疊的改動、確認到底完成了什麼，再決定下一步交給誰。

openteams 補上的是這些 Agent 周圍的協作層：**一個共享的工作空間、一套看得見的複雜任務執行流程，以及始終掌握在開發者手裡的項目控制權。**

| openteams **是** | openteams **不是** |
| --- | --- |
| 一個連接你現有編程 Agent 的本地優先工作區 | 一個新模型，或 Claude Code、Codex、Gemini CLI 的替代品 |
| 一個讓 Agent 對話、交接任務並共享上下文的會話 | 一堆仍然需要你手動協調的獨立聊天視窗 |
| 一套可以逐步查看、審查、中斷和重試的工作流 | 一個提交後只能等結果的黑盒大提示詞 |
| 由開發者掌控的事項、隔離 worktree 和構建統計 | 由 Agent 決定的路線圖，或只有消耗數字的 Token 計數器 |

**具體來說，安裝後你會得到：** 用於輕量協作的直接聊天、用於計劃執行的 Plan 模式、開箱即用的團隊工作流程範本、把工作關聯到會話且由開發者掌控的事項、用於隔離並行任務的可選 Git worktree，以及把交付結果與 Token 用量和成本放在一起展示的構建統計。

```text
你的編程 Agent               openteams

Claude Code ─┐              ┌─ 共享上下文
Codex ───────┼─────────────►├─ 可視化工作流 ── 審查 ── 合併
Gemini CLI ──┘              ├─ 隔離 worktree
                            └─ 事項 + 構建統計
```

## 爲什麼選擇 openteams

現在讓 Agent 寫出程式碼並不難，難的是把這些工作管好：上下文能不能接上、執行到哪一步、並行任務會不會互相覆蓋、接下來該做什麼，以及這次開發到底花了多少。

openteams 把 Agent 和相關對話放在同一個會話裡。任務複雜時，工作流模式會把步驟和依賴展示出來，你可以單獨審查或重試其中一步，不必全部重來。如果多個會話同時工作，還可以為每個會話使用獨立的 Git worktree，讓未完成的改動彼此隔離，最後再決定合併還是捨棄。

項目方向始終由開發者決定。事項記錄你選定的工作，並關聯 Agent 實際執行這些工作的會話；Agent 負責幹活，但不會替你改計劃。工作完成後，構建統計會把交付結果和本次使用的 Token、成本放在一起展示。

openteams 想做的不是再多接幾個 Agent，而是讓你隨時知道：現在在做什麼，改動在哪裡，下一步是什麼，以及這些結果花了多少。

## 快速開始
### 安裝
#### npx

```bash
npx openteams-web
```

#### 桌面應用

請從 GitHub Releases 下載適合你平臺的最新版本。

[![Download for Windows](https://img.shields.io/badge/Download-Windows-0078D6?style=for-the-badge&logo=windows)](https://github.com/openteams-lab/openteams/releases/latest)
[![Download for Linux](https://img.shields.io/badge/Download-Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black)](https://github.com/openteams-lab/openteams/releases/latest)

### 配置提供商

**openteams** 內置 openteams CLI 智能體。你可以在應用中通過 `menu->setting->provider config->add provider` 配置模型提供商。參考文檔：

⚙️ [提供商配置](https://doc.openteams-lab.com/advanced-usage/custom-provider)

你也可以連接以下openteams支持的編程智能體：

| Agent | 安裝示例 |
| --- | --- |
| Claude Code | `npm i -g @anthropic-ai/claude-code` |
| Gemini CLI | `npm i -g @google/gemini-cli` |
| Codex | `npm i -g @openai/codex` |
| Qwen Code | `npm i -g @qwen-code/qwen-code` |
| OpenCode | `npm i -g opencode-ai` |

📚 [更多智能體安裝指南](https://doc.openteams-lab.com/getting-started)

### 30 秒上手
**前置條件：配置一個 API 服務提供商，或安裝任意一個openteams支持的 Code Agent。**

*第 1 步。* 創建一個羣聊會話。添加一個或多個成員，併爲每個成員分配模型和角色。

*第 2 步。* 在自由聊天模式中，用 `@` 提及任意成員來發送消息或分配任務。

*第 3 步。* 切換到工作流模式。與主agent討論需求、細化方案，並生成執行計劃。

*第 4 步。* 啓動執行，並在每個任務節點完成時審查結果。

## 工作模式

**openteams** 提供兩種協作模式，因爲不是所有任務都需要同樣的結構化程度。可以類比 **Claude Code 的 Plan 與 Build 模式**，但這裏是面向多 Agent 團隊的：想讓 Agent 自由探索討論時用自由聊天模式，需要可靠、可預期的執行時用工作流模式。

### 自由聊天模式

在自由聊天模式中，你用 `@` 給任意 Agent 發送任務，Agent 之間也可以自由傳遞消息。協作規則由你定義的團隊協議約束——誰負責什麼、如何交接、遵循哪些標準。

**自由聊天模式**適合小修復、快速審查，以及不值得啓動完整工作流的探索性討論。

![](images/free_chat.png)

### 工作流模式

工作流模式專爲複雜任務設計——當任務需要拆分爲多個子任務，且你需要全程觀察進度、在每一步保持可控執行時，它就是最佳選擇。

主 Agent 負責驅動規劃階段：澄清需求、設計方案、制定執行計劃，並將任務分配給合適的 Agent。最終生成一張可視化的工作流圖，包含步驟、依賴關係、審查節點、重試機制和驗收點。

![](images/openteams-workflow.png)

工作流模式不會讓 Agent 鬆散地串聯運行，而是把工作轉化爲有狀態的執行圖。

**注意：工作流模式會消耗更多 token。請確保你的 token 餘額充足。**

## 重要更新
- **2026.05.20 (v0.4.4)**
  - 工作流模式 beta 版
- **2026.05.07 (v0.3.22)**
  - 支持一鍵將羣聊會話中的成員保存爲預設團隊
- **2026.04.14 (v0.3.15)**
  - 工作區文件變更查看器
- **2026.04.06 (v0.3.12)**
  - 啓用深色 UI 模式
  - 修復 openteams-cli 併發問題
- **2026.04.02 (v0.3.10)**
  - 實現應用內版本更新
  - 文檔網站已上線

## 路線圖

openteams 正在積極開發中。接下來我們會朝這些方向推進：

- [ ] **專家型的AI員工** — 推出更多擁有專業領域知識，能解決專業問題的AI員工。
- [ ] **高產出的AI團隊** — 由高效的專家AI員工組成，可針對特定業務定製化生產工作流程，端到端將需求轉換爲產出結果。
- [ ] **集成更多智能體** — 集成更多常用Agent，如Kilo code, hermes-agent, openclaw等。

***願景：把 token 消耗轉化爲真正的生產力。***

有功能建議，或想參與塑造產品方向？歡迎[發起討論](https://github.com/openteams-lab/openteams/discussions)。

## 社區

- [GitHub Issues](https://github.com/openteams-lab/openteams/issues)：bug 報告和功能請求
- [GitHub Discussions](https://github.com/openteams-lab/openteams/discussions)：產品想法和問題
- [Discord](https://discord.gg/openteams)：社區聊天
- [Linux.do](https://linux.do)：友情連結，感謝提供社群交流支援
- 社區群：

<p>
  <a href="images/openteams-wechat-community.png"><img alt="openteams 微信交流群二維碼" src="images/openteams-wechat-community.png" width="260"></a>
  <a href="images/openteams-feishu-community.png"><img alt="openteams 飛書交流群二維碼" src="images/openteams-feishu-community.png" width="260"></a>
</p>

## 核心功能

| 功能 | 含義 |
| --- | --- |
| AI 員工與 AI 團隊 | 把 token 直接轉化爲生產力。每個 AI 員工或團隊都擁有特定領域的專業知識，能將通用模型提升爲領域專家——不只是生成文本，而是真正產出可交付的工作成果。 |
| 多智能體工作區 | 把多個 AI 智能體帶入同一個共享會話，不再在多個窗口之間來回切換。 |
| 共享上下文 | 智能體基於同一份對話和項目上下文工作。 |
| 自由聊天模式 | 使用 `@` 進行直接、輕量的智能體協作。 |
| 工作流模式 | 將複雜任務轉換爲結構化步驟、依賴、審查、重試和驗收。 |
| 可見執行 | 看到每個智能體正在做什麼，以及工作卡在哪裏。 |
| 審查與重試 | 審查某一步的結果，精確重試失敗的任務，無需重啓整個項目。 |
| 事項管理 | 記錄並排序由開發者掌控的工作項，從 GitHub 同步事項，並建立或關聯執行會話。 |
| 隔離工作區 | 在獨立的 Git worktree 中執行不同會話的任務，再分別審查、合併或捨棄結果，避免互相干擾。 |
| 構建統計 | 對照 Bug 修復和功能交付情況，查看不同會話與模型的 Token 用量和成本明細。 |
| 產物與軌跡 | 將日誌、diff、轉錄和生成的產物附加到工作上。 |
| 本地工作區執行 | 智能體在你配置的工作區中工作，運行記錄保存在 `.openteams/` 下。 |

## 適合誰

openteams 適合：

- 正在使用多個編程智能體、但已經厭倦來回切換和協調的開發者
- 需要讓智能體執行過程可審查、可重現的技術負責人

它不只是一個收納更多 Agent 的容器，而是把 Agent 變成真正能協作交付的工作團隊。

## 技術棧

| 層 | 技術 |
| --- | --- |
| 前端 | React, TypeScript, Vite, Tailwind CSS |
| 後端 | Rust |
| 桌面端 | Tauri |
| 數據庫 | SQLx 管理的關係型 schema |
| 工作流 UI | React Flow |

## 本地開發

### 前置條件

- **Rust** >= 1.75
- **Node.js** >= 18
- **pnpm** >= 8

### macOS、Linux 和 Windows

```bash
# Clone the repository
git clone https://github.com/openteams-lab/openteams.git
cd openteams
pnpm i
npm run dev
# build
pnpm --filter frontend build
pnpm desktop:build
```

### 本地構建 `openteams-cli`

如果你需要編譯本地 `openteams-cli` 二進制文件，而不是使用內置或已發佈的構建，請使用以下命令。
構建產物會放在 binaries 目錄中。

```bash
# From the repository root
bun run ./scripts/build-openteams-cli.ts
```

## 貢獻

歡迎貢獻。你可以這樣開始：

1. **尋找 issue** — 查看 [Good First Issues](https://github.com/openteams-lab/openteams/labels/good%20first%20issue) 尋找適合新手的任務，或瀏覽開放 issue。
2. **開發前先討論** — 在提交大型 PR 前，請先開啓 issue 或 discussion，以便對齊方向。
3. **遵循代碼風格** — 提交前請運行：

```bash
pnpm run format
pnpm run check
pnpm run lint
```

4. **提交 PR** — 說明你改了什麼以及爲什麼改。如有相關 issue，請一併鏈接。

完整指南請見 [CONTRIBUTING.md](../CONTRIBUTING.md)。

## 許可證

openteams 基於 Apache License 2.0 發布。簡單來說，你可以：

- 免費用於個人、教育、內部或商業項目；
- 複製、修改原始碼，並在此基礎上繼續開發；
- 以原始碼或編譯後軟體的形式分發原版或修改版；
- 整合到閉源產品中並收費，無需因此公開產品的其餘程式碼。

如果你再分發 openteams 或其修改版，需要附帶許可證副本，保留相關版權和署名聲明，並清楚標明修改過的檔案。

另外還有三點：

- **品牌：** 你可以使用程式碼，但不能冒充 openteams 官方，也不能把 openteams 的名稱或商標當成自己的品牌。
- **專利：** 程式碼貢獻者承諾，不會拿與這些程式碼有關的專利來限制你使用 openteams。作為交換，如果你以「openteams 侵犯我的專利」為由提起訴訟，你將失去這項專利保護。失效的只是專利許可，不是普通的程式碼使用權；不打專利官司的普通使用者基本不受影響。
- **風險：** 軟體免費按現狀提供。是否符合你的需求、使用中會不會出現問題，都需要你自行判斷並承擔風險；項目方不提供保固或賠償。

完整法律條款請見 [LICENSE](../LICENSE)。
