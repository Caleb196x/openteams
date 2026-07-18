<div align="center">
  <img src="../frontend/public/logos/logo_blue.svg" alt="openteams" width="100">
</div>

<div align="center">
  <img src="../frontend/public/openteams-brand-logo.png" alt="openteams" width="200" style="margin-top: 10px; margin-bottom: 10px;">

  <h5>계획하고, 만들고, 출시하세요 — 하나의 AI가 아니라 AI 에이전트 팀과 함께</h5>

  <p>
    openteams는 인디 개발자가 직접 제어하는 AI 팀과 함께 소프트웨어를 더 빠르게 계획하고, 만들고, 출시할 수 있도록 돕는 오픈 소스 로컬 우선 AI 데스크톱 앱입니다.
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
    <a href="#빠른-시작">빠른 시작</a> |
    <a href="https://doc.openteams-lab.com">문서</a> 
  </p>

  <p align="center">
    <a href="../README.md">English</a> |
    <a href="./README_zh-Hans.md">简体中文</a> |
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
    <a href="https://github.com/user-attachments/assets/f918d5c7-68ff-4a8b-b2b4-f4f0ab31c17d">제품 영상 보기</a>
  </video>
</div>

## 잠깐, openteams가 뭔가요?

이미 Claude Code, Codex, Gemini CLI 같은 코딩 Agent를 사용하고 있을 수 있습니다. 각각 계획, 구현, 리뷰, 테스트를 잘합니다. 하지만 한 작업에 여러 Agent가 들어오는 순간, **사용자가 Agent 사이의 중계자가 됩니다.** 터미널 사이로 컨텍스트를 옮기고, 겹치는 변경을 정리하고, 실제로 끝난 일을 확인한 뒤 다음 담당을 정해야 합니다.

openteams는 개별 Agent 주변에 빠져 있던 협업 계층입니다. **함께 일할 한 공간, 복잡한 작업을 보여 주는 실행 흐름, 그리고 개발자의 손에 남아 있는 프로젝트 통제권을 제공합니다.**

| openteams가 **하는 것** | openteams가 **아닌 것** |
| --- | --- |
| 기존 코딩 Agent를 연결하는 로컬 우선 워크스페이스 | 새로운 모델이나 Claude Code, Codex, Gemini CLI의 대체품 |
| Agent가 대화하고 작업을 넘기며 같은 컨텍스트를 유지하는 공유 세션 | 사용자가 직접 계속 조율해야 하는 여러 개의 독립 채팅 창 |
| 단계를 하나씩 확인하고 리뷰하고 중단하고 재시도하는 워크플로우 | 끝날 때까지 내부를 볼 수 없는 하나의 큰 프롬프트 |
| 개발자가 관리하는 이슈, 격리 worktree, 빌드 통계 | Agent가 정하는 로드맵이나 사용량 숫자만 보여 주는 Token 카운터 |

**설치하면 구체적으로 다음을 사용할 수 있습니다.** 가벼운 협업을 위한 직접 채팅, 계획된 실행을 위한 Plan 모드, 바로 사용할 수 있는 팀 워크플로 템플릿, 작업과 세션을 연결하면서 개발자가 관리하는 이슈, 동시 작업을 분리하는 선택형 Git worktree, 그리고 결과를 Token 사용량 및 비용과 나란히 보여 주는 빌드 통계입니다.

```text
코딩 Agent                   openteams

Claude Code ─┐              ┌─ 공유 컨텍스트
Codex ───────┼─────────────►├─ 보이는 워크플로우 ── 리뷰 ── 병합
Gemini CLI ──┘              ├─ 격리 worktree
                            └─ 이슈 + 빌드 통계
```

## 왜 openteams인가?

Agent에게 코드를 작성하게 하는 것 자체는 이제 어렵지 않습니다. 어려운 건 그 작업을 제대로 관리하는 일입니다. 컨텍스트가 이어지는지, 지금 어디까지 진행됐는지, 병렬 작업이 서로 덮어쓰지 않는지, 다음에 무엇을 해야 하는지, 그리고 얼마를 썼는지 알아야 합니다.

openteams는 Agent와 관련 대화를 하나의 세션에 모읍니다. 작업이 복잡하면 Workflow 모드에서 단계와 의존성을 확인할 수 있어, 전부 다시 시작하지 않고 필요한 부분만 검토하거나 재시도할 수 있습니다. 여러 세션을 동시에 실행할 때는 각 세션에 별도의 Git worktree를 사용해 미완성 변경을 분리하고, 나중에 병합할지 폐기할지 결정할 수 있습니다.

프로젝트 방향은 개발자가 정합니다. 이슈에는 개발자가 선택한 작업을 기록하고, Agent가 실제로 작업하는 세션을 연결합니다. Agent는 일을 수행하지만 계획을 대신 바꾸지는 않습니다. 작업이 끝나면 빌드 통계에서 결과와 Token 사용량, 비용을 함께 확인할 수 있습니다.

openteams의 목표는 Agent를 더 많이 붙이는 것이 아닙니다. 지금 무엇을 만들고 있는지, 변경은 어디에 있는지, 다음 할 일은 무엇인지, 그 결과에 얼마를 썼는지 언제든 알 수 있게 하는 것입니다.

## 빠른 시작
### 설치
#### npx

```bash
npx openteams-web
```

#### 데스크톱 앱

GitHub Releases에서 사용 중인 플랫폼에 맞는 최신 릴리스를 다운로드하세요.

[![Download for Windows](https://img.shields.io/badge/Download-Windows-0078D6?style=for-the-badge&logo=windows)](https://github.com/openteams-lab/openteams/releases/latest)
[![Download for Linux](https://img.shields.io/badge/Download-Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black)](https://github.com/openteams-lab/openteams/releases/latest)

### 제공자 설정

**openteams**에는 내장 openteams CLI 에이전트가 포함되어 있습니다. 앱에서 `menu->setting->provider config->add provider`로 모델 제공자를 설정하세요.

⚙️ [제공자 설정](https://doc.openteams-lab.com/advanced-usage/custom-provider)

다음과 같은 지원 코딩 에이전트도 연결할 수 있습니다.

| Agent | 설치 예시 |
| --- | --- |
| Claude Code | `npm i -g @anthropic-ai/claude-code` |
| Gemini CLI | `npm i -g @google/gemini-cli` |
| Codex | `npm i -g @openai/codex` |
| Qwen Code | `npm i -g @qwen-code/qwen-code` |
| OpenCode | `npm i -g opencode-ai` |

📚 [더 많은 에이전트 설치 가이드](https://doc.openteams-lab.com/getting-started)

### 30초 만에 시작하기
**필수 조건: API 서비스 제공자를 설정하거나 지원되는 Code Agent 중 하나를 설치하세요.**

*step 1.* 그룹 채팅 세션을 만듭니다. 하나 이상의 멤버를 추가하고 각 멤버에 모델과 역할을 지정합니다.

*step 2.* Free Chat 모드에서 `@`로 멤버를 멘션해 메시지를 보내거나 작업을 할당합니다.

*step 3.* Workflow 모드로 전환합니다. lead agent와 요구사항을 논의하고, 해결책을 다듬고, 실행 계획을 생성합니다.

*step 4.* 실행을 시작하고 각 작업 노드가 완료될 때 결과를 검토합니다.

## 작업 모드

**openteams**는 두 가지 협업 모드를 지원합니다. 모든 작업이 같은 수준의 구조를 요구하지는 않기 때문입니다. **Claude Code의 Plan/Build 모드**를 멀티 에이전트 팀에 맞춘 것이라고 생각하면 됩니다. 에이전트가 자유롭게 탐색하고 토론하길 원하면 자유 협업을 선택하고, 신뢰할 수 있고 예측 가능한 실행이 필요하면 구조화된 워크플로우를 선택하세요.

### Free Chat

자유 채팅 모드에서는 `@`로 원하는 에이전트에게 작업을 보내고, 에이전트끼리도 자유롭게 메시지를 주고받을 수 있습니다. 협업은 사용자가 정의한 팀 프로토콜에 따라 진행됩니다. 누가 무엇을 맡는지, 어떻게 인수인계하는지, 어떤 기준을 따르는지 정할 수 있습니다.

**free chat mode**는 작은 수정, 빠른 리뷰, 전체 워크플로우를 쓰기에는 과한 탐색적 논의에 적합합니다.

![](images/free_chat.png)

### Workflow

Workflow 모드는 복잡한 작업을 하위 작업으로 나누고, 진행 상황을 관찰하며, 각 단계에서 실행을 제어해야 할 때 적합합니다.

Lead agent가 계획 단계를 이끕니다. 요구사항을 명확히 하고, 접근 방식을 설계하고, 실행 계획을 정의하며, 적절한 에이전트에게 작업을 배정합니다. 그 결과 단계, 의존성, 리뷰, 재시도, 승인 지점을 포함한 보이는 워크플로우가 만들어집니다.

![](images/openteams-workflow.png)

에이전트를 느슨한 체인으로 실행시키는 대신, **openteams**는 작업을 상태를 가진 실행 그래프로 전환합니다.

**참고: Workflow 모드는 더 많은 token을 사용합니다. token 잔액이 충분한지 확인하세요.**

## 주요 업데이트
- **2026.05.20 (v0.4.4)**
  - Workflow 모드 beta 버전
- **2026.05.07 (v0.3.22)**
  - 그룹 채팅 세션의 멤버를 한 번의 클릭으로 프리셋 팀으로 저장 지원
- **2026.04.14 (v0.3.15)**
  - Workspace File Change Viewer
- **2026.04.06 (v0.3.12)**
  - 다크 UI 모드 활성화
  - openteams-cli 동시성 문제 수정
- **2026.04.02 (v0.3.10)**
  - 앱 내 버전 업데이트 구현
  - 문서 웹사이트 공개

## 로드맵

openteams는 활발히 개발 중입니다. 앞으로 다음 방향으로 나아갑니다.

- [ ] **전문 AI workers** — 전문 분야 지식을 갖추고 전문적인 문제를 해결할 수 있는 AI workers를 더 많이 제공합니다.
- [ ] **고산출 AI team** — 효율적인 전문 AI workers로 구성되어 특정 비즈니스에 맞게 생산 워크플로우를 커스터마이즈하고, 요구사항을 엔드투엔드로 산출물로 전환합니다.
- [ ] **더 많은 에이전트 통합** — Kilo code, hermes-agent, openclaw 등 더 많은 범용 Agent를 통합합니다.

***비전: token 소비를 실제 생산성으로 바꾸기.***

기능 요청이 있거나 방향성에 참여하고 싶다면 [토론을 열어 주세요](https://github.com/openteams-lab/openteams/discussions).

## 커뮤니티

- [GitHub Issues](https://github.com/openteams-lab/openteams/issues): 버그 리포트와 기능 요청
- [GitHub Discussions](https://github.com/openteams-lab/openteams/discussions): 제품 아이디어와 질문
- [Discord](https://discord.gg/openteams): 커뮤니티 채팅
- [Linux.do](https://linux.do): 친구 링크, 커뮤니티 교류 지원에 감사드립니다
- 커뮤니티 그룹:

<p>
  <a href="images/openteams-wechat-community.png"><img alt="openteams WeChat 커뮤니티 그룹 QR 코드" src="images/openteams-wechat-community.png" width="260"></a>
  <a href="images/openteams-feishu-community.png"><img alt="openteams Feishu/Lark 커뮤니티 그룹 QR 코드" src="images/openteams-feishu-community.png" width="260"></a>
</p>

## 핵심 기능

| 기능 | 의미 |
| --- | --- |
| AI 직원과 AI 팀 | token을 실제 생산성으로 바꿉니다. 각 AI 직원 또는 팀은 도메인 전문성을 갖고 범용 모델을 전문가로 끌어올립니다. 단순히 텍스트를 생성하는 것이 아니라 실제 작업을 낼 준비가 되어 있습니다. |
| 멀티 에이전트 워크스페이스 | 여러 AI 에이전트를 하나의 공유 세션으로 모아 별도 창을 오갈 필요를 줄입니다. |
| 공유 컨텍스트 | 에이전트는 같은 대화와 프로젝트 컨텍스트를 기반으로 작업합니다. |
| Free Chat | `@`를 사용해 직접적이고 가벼운 에이전트 협업을 할 수 있습니다. |
| Workflow 모드 | 복잡한 작업을 구조화된 단계, 의존성, 리뷰, 재시도, 승인으로 변환합니다. |
| 보이는 실행 | 각 에이전트가 무엇을 하고 있는지, 어디에서 작업이 막혔는지 볼 수 있습니다. |
| 리뷰와 재시도 | 단계를 리뷰하고 필요한 작업만 다시 시도해 전체 프로젝트 재시작을 피합니다. |
| 이슈 관리 | 개발자가 관리하는 작업 항목을 기록하고 우선순위를 정하며, GitHub 이슈를 동기화하고 실행 세션을 만들거나 연결합니다. |
| 격리 워크스페이스 | 세션별 독립 Git worktree에서 작업한 뒤 다른 작업에 영향을 주지 않고 각 결과를 검토, 병합 또는 폐기합니다. |
| 빌드 통계 | 수정한 버그와 제공한 기능을 세션 및 모델별 Token 사용량과 비용 내역에 비교합니다. |
| 아티팩트와 추적 | 로그, diff, 트랜스크립트, 생성된 아티팩트를 작업에 연결해 보관합니다. |
| 로컬 워크스페이스 실행 | 에이전트는 설정된 워크스페이스에서 작업하며 실행 기록은 `.openteams/` 아래에 저장됩니다. |

## 이런 분들에게 적합합니다

openteams는 다음 사용자에게 적합합니다.

- 여러 코딩 에이전트를 사용하면서 전환과 조율에 지친 개발자
- 에이전트 실행을 검토 가능하고 재현 가능하게 관리해야 하는 기술 리드

이것은 단순히 더 많은 에이전트를 모아두는 장소가 아닙니다. 에이전트를 실제로 일하는 팀으로 바꾸는 방법입니다.

## 기술 스택

| 계층 | 기술 |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Rust |
| Desktop | Tauri |
| Database | SQLx-managed relational schema |
| Workflow UI | React Flow |

## 로컬 개발

### 필수 조건

- **Rust** >= 1.75
- **Node.js** >= 18
- **pnpm** >= 8

### macOS, Linux, Windows

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

### 로컬에서 `openteams-cli` 빌드

내장 또는 공개 빌드 대신 로컬 `openteams-cli` 바이너리를 컴파일해야 한다면 아래 명령을 사용하세요.
빌드 산출물은 binaries 디렉터리에 생성됩니다.

```bash
# From the repository root
bun run ./scripts/build-openteams-cli.ts
```

## 기여

기여를 환영합니다. 시작 방법은 다음과 같습니다.

1. **issue 찾기** — 입문자에게 적합한 작업은 [Good First Issues](https://github.com/openteams-lab/openteams/labels/good%20first%20issue)를 확인하거나 open issue를 둘러보세요.
2. **개발 전에 논의하기** — 큰 pull request를 열기 전에 방향을 맞추기 위해 issue 또는 discussion을 열어 주세요.
3. **코드 스타일 따르기** — 제출 전에 아래를 실행하세요.

```bash
pnpm run format
pnpm run check
pnpm run lint
```

4. **PR 제출** — 무엇을 왜 변경했는지 설명하세요. 관련 issue가 있다면 링크해 주세요.

전체 가이드는 [CONTRIBUTING.md](../CONTRIBUTING.md)를 참고하세요.

## 라이선스

openteams는 Apache License 2.0으로 배포됩니다. 쉽게 말해 다음과 같이 사용할 수 있습니다.

- 개인, 교육, 내부 또는 상업 프로젝트에서 무료로 사용합니다.
- 소스 코드를 복사하고 수정해 새로운 작업의 기반으로 사용합니다.
- 원본이나 수정본을 소스 코드 또는 컴파일된 소프트웨어로 배포합니다.
- 비공개 소스 제품에 포함해 판매하면서도 제품의 나머지 코드는 공개하지 않습니다.

openteams 또는 수정본을 재배포할 때는 라이선스 사본을 포함하고, 관련 저작권 및 출처 고지를 유지하며, 변경한 파일을 명확히 표시해야 합니다.

그 밖에 알아둘 점은 세 가지입니다.

- **브랜드:** 코드는 사용할 수 있지만 openteams 공식 프로젝트인 것처럼 표시하거나 openteams 이름과 상표를 자신의 브랜드로 사용할 수는 없습니다.
- **특허:** 코드 기여자는 자신의 코드와 필수적으로 관련된 특허를 근거로 사용자의 openteams 이용을 막지 않겠다고 약속합니다. 대신 “openteams가 내 특허를 침해했다”는 이유로 소송을 제기하면 이 특허 보호를 잃게 됩니다. 종료되는 것은 특허 허가뿐이며 일반적인 코드 사용 권한은 그대로 유지됩니다. 특허 소송을 하지 않는 일반 사용자에게는 사실상 영향이 없습니다.
- **위험:** 소프트웨어는 무료로 현재 상태 그대로 제공됩니다. 자신의 용도에 맞는지와 사용 중 발생하는 문제나 위험은 사용자가 직접 판단하고 책임져야 하며, 프로젝트는 보증이나 손해 배상을 제공하지 않습니다.

전체 법적 조건은 [LICENSE](../LICENSE)를 확인하세요.
