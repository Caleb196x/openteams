# 自反馈工作流架构设计方案

## 一、设计概述

基于现有workflow系统（WorkflowPlan → WorkflowExecution → WorkflowRound → WorkflowStep），
在不破坏现有架构的基础上，引入三层治理结构：**自反馈节点 + 自反馈回路 + 反馈迭代**。

核心思路：复用现有 `WorkflowStep`/`WorkflowRound` 模型，通过扩展节点类型和状态机、
新增回路(Loop)概念来实现自动化反馈系统。

---

## 二、程序流程图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         反馈迭代层 (Iteration Layer)                          │
│                                                                             │
│  ┌──────────┐    ┌──────────────────┐    ┌────────────┐    ┌─────────────┐ │
│  │ 生成计划  │───▶│  执行当轮Round    │───▶│ 用户反馈   │───▶│ 生成新计划   │ │
│  │(Revision) │    │                   │    │(Accept/    │    │(NewRevision)│ │
│  └──────────┘    └──────────────────┘    │ Reject)    │    └──────┬──────┘ │
│       ▲                                   └────────────┘           │        │
│       └────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       自反馈回路层 (Loop Layer)                               │
│                                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌───────────────┐           │
│  │ Step A  │───▶│ Step B  │───▶│ Step C  │───▶│ Review Node   │           │
│  │(执行节点)│    │(执行节点)│    │(执行节点)│    │(审核节点)      │           │
│  └─────────┘    └─────────┘    └─────────┘    └───────┬───────┘           │
│       ▲                                               │                    │
│       │              负反馈 (Rejected)                  │ 正反馈             │
│       │◀──────────────────────────────────────────────┘                    │
│       │                                               │                    │
│       │    ┌──────────────────────────────┐           ▼                    │
│       │    │ 前端要求用户输入反馈消息       │    ┌─────────────┐            │
│       │    │ (user_review_required=true时) │    │ 用户审核     │            │
│       │    └──────────────┬───────────────┘    └──────┬──────┘            │
│       │                   │ 用户输入反馈                │                    │
│       │◀──────────────────┘                           │ 通过→完成          │
│       │  (反馈注入回路所有节点context)                   ▼                    │
│       │                                        ┌─────────────┐            │
│       └────────────────────────────────────────│用户拒绝+反馈 │            │
│                                                └─────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      自反馈节点层 (Node Layer)                                │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │  WorkflowStep (单个执行节点)                                     │        │
│  │                                                                │        │
│  │  ┌──────────┐    ┌───────────────┐    ┌──────────────────────┐│        │
│  │  │ Worker   │───▶│ Lead Review   │───▶│ User Review           ││        │
│  │  │ 执行任务  │    │ Agent审核     │    │ (前端弹出审核面板,     ││        │
│  │  └──────────┘    └───────┬───────┘    │  用户输入反馈消息)     ││        │
│  │       ▲                  │ 负反馈      └───────────┬──────────┘│        │
│  │       │◀─────────────────┘                        │            │        │
│  │       │                                           │ 用户拒绝    │        │
│  │       │◀──────────────────────────────────────────┘            │        │
│  │       │   (用户反馈消息注入Worker下次执行context)                │        │
│  └────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 三、节点状态转移图

### 3.1 执行节点 (Task Step) 状态机

```
                          ┌─────────────────────────────────────────┐
                          │                                         │
                          ▼                                         │
┌─────────┐    ┌─────────┐    ┌─────────────┐    ┌──────────────┐ │ ┌───────────────┐
│ Pending │───▶│  Ready  │───▶│   Running   │───▶│WaitingReview │─┤ │PreCompleted   │
└─────────┘    └─────────┘    └─────────────┘    └──────────────┘ │ └───────┬───────┘
                                    ▲                    │          │         │
                                    │                    │ Lead拒绝  │         │ 用户通过
                                    │                    ▼          │         ▼
                                    │              ┌──────────┐    │  ┌───────────┐
                                    └──────────────│ Revising │    │  │ Completed │
                                      (修改后重新  └──────────┘    │  └───────────┘
                                       提交审核)         │          │        ▲
                                                         │ 用户拒绝  │        │
                                                         ▼          │        │
                                                   ┌──────────────┐│        │
                                                   │WaitingInput  │┘        │
                                                   │(等待用户审核) │─────────┘
                                                   └──────────────┘  用户通过
```

**新增状态说明：**
- `Revising`: Worker根据Lead反馈修改中（复用现有Running，通过retry_count区分）
- `PreCompleted`: Lead通过但等待回路级/用户级确认（新增状态）
- `WaitingInput`: 等待用户审核意见（已有状态，复用）

### 3.2 审核节点 (Review Step) 状态机

```
┌─────────┐    ┌─────────┐    ┌─────────────┐    ┌──────────────────┐
│ Pending │───▶│  Ready  │───▶│   Running   │───▶│  审核结果判定     │
└─────────┘    └─────────┘    └─────────────┘    └────────┬─────────┘
                                                          │
                              ┌────────────────────────────┼─────────────────┐
                              │                            │                  │
                              ▼                            ▼                  ▼
                     ┌────────────────┐         ┌──────────────┐    ┌────────────┐
                     │ LoopRejected   │         │WaitingInput  │    │ Failed     │
                     │(打回回路执行节点)│         │(通过,等用户确认)│    └────────────┘
                     └────────┬───────┘         └──────┬───────┘
                              │                        │
                              │ 重置回路内节点           │ 用户确认通过
                              │ 为Ready状态             ▼
                              │                 ┌───────────┐
                              │                 │ Completed │
                              ▼                 └───────────┘
                     回路内所有执行节点
                     重新进入Ready→Running
```

**新增状态说明：**
- `LoopRejected`: 审核节点特有，表示回路级别的拒绝（新增，或复用 Failed + detail_json 区分）

### 3.3 Round (迭代轮次) 状态机

```
┌─────────┐    ┌─────────┐    ┌──────────────────────┐    ┌──────────┐
│ Running │───▶│ 所有节点 │───▶│ WaitingUserAcceptance│───▶│ Accepted │
└─────────┘    │ 完成     │    └──────────┬───────────┘    └──────────┘
               └─────────┘               │
                                          │ 用户Reject + 修改意见
                                          ▼
                                   ┌────────────┐    ┌─────────────────┐
                                   │  Rejected  │───▶│ 新Round生成      │
                                   └────────────┘    │(NewRevision编译) │
                                                     └─────────────────┘
```

---

## 四、类关系图

### 4.1 现有模型扩展

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          现有模型 (保持不变)                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  WorkflowPlan ─────▶ WorkflowPlanRevision ─────▶ CompiledGraph          │
│       │                                               │                  │
│       ▼                                               ▼                  │
│  WorkflowExecution ──▶ WorkflowRound ──▶ WorkflowStep                   │
│       │                                       │                          │
│       ├──▶ WorkflowAgentSession               ├──▶ WorkflowStepEdge     │
│       ├──▶ WorkflowTranscript                 └──▶ WorkflowEvent        │
│       └──▶ WorkflowEvent                                                │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                          新增模型/扩展                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────┐                                                │
│  │ WorkflowLoop (新增)  │  回路定义                                       │
│  ├─────────────────────┤                                                │
│  │ id: Uuid            │                                                │
│  │ execution_id: Uuid  │                                                │
│  │ round_id: Uuid      │                                                │
│  │ loop_key: String    │  回路标识(来自plan_json)                          │
│  │ review_step_id: Uuid│  审核节点ID                                      │
│  │ member_step_ids: Vec│  回路内执行节点ID列表                              │
│  │ status: LoopStatus  │  Running/Passed/Rejected                        │
│  │ retry_count: i32    │  回路重试次数                                    │
│  │ max_retry: i32      │  最大重试次数                                    │
│  │ user_review_required│  是否需要用户审核(默认true)                        │
│  │   : bool            │  false时跳过用户审核直接完成                       │
│  │ rejection_reason:   │  拒绝原因(传递给重执行节点)                        │
│  │   Option<String>    │                                                │
│  └─────────────────────┘                                                │
│                                                                          │
│  ┌─────────────────────────┐                                            │
│  │ WorkflowStepReview(新增) │  节点级审核记录                              │
│  ├─────────────────────────┤                                            │
│  │ id: Uuid               │                                             │
│  │ step_id: Uuid          │  被审核的执行节点                              │
│  │ reviewer_type: Enum    │  Lead / User                                │
│  │ reviewer_id: Option    │  审核者Agent或User ID                         │
│  │ verdict: Enum          │  Approved / Rejected                        │
│  │ feedback: String       │  审核意见                                    │
│  │ review_round: i32      │  第几次审核                                   │
│  │ created_at: DateTime   │                                             │
│  └─────────────────────────┘                                            │
│                                                                          │
│  ┌─────────────────────────────┐                                        │
│  │ WorkflowIterationFeedback   │  迭代反馈记录                            │
│  │ (新增)                       │                                        │
│  ├─────────────────────────────┤                                        │
│  │ id: Uuid                   │                                         │
│  │ execution_id: Uuid         │                                         │
│  │ from_round_id: Uuid        │  上一轮Round                              │
│  │ to_round_id: Option<Uuid>  │  新生成的Round                            │
│  │ user_feedback: String      │  用户修改意见(结构化模板)                    │
│  │ current_status_summary:    │  当前执行现状摘要                          │
│  │   String                   │                                         │
│  │ new_plan_diff: Option<Str> │  新计划与旧计划的差异                       │
│  │ created_at: DateTime       │                                         │
│  └─────────────────────────────┘                                        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.2 枚举扩展

```rust
// 扩展 WorkflowStepStatus
pub enum WorkflowStepStatus {
    Pending,
    Ready,
    Running,
    WaitingReview,      // 已有 - 等待Lead审核
    WaitingInput,       // 已有 - 等待用户输入/审核
    PreCompleted,       // 新增 - Lead通过,等待回路/用户确认
    Revising,           // 新增 - 根据反馈修改中
    Blocked,
    Completed,
    Failed,
    Skipped,
    Cancelled,
    InterruptRequested,
    Interrupted,
}

// 扩展 WorkflowStepType
pub enum WorkflowStepType {
    Task,               // 已有 - 执行节点
    Review,             // 已有 - 审核节点(回路审核)
    Result,             // 已有 - 结果汇总节点
}

// 新增 - 回路状态
pub enum WorkflowLoopStatus {
    Running,            // 回路执行中
    WaitingReview,      // 等待审核节点审核
    Passed,             // 审核通过
    Rejected,           // 审核拒绝,准备重执行
    WaitingUser,        // 等待用户确认
    Completed,          // 用户确认,回路完成
    Failed,             // 超过最大重试次数
}

// 新增 - 审核结论
pub enum ReviewVerdict {
    Approved,
    Rejected,
}

// 新增 - 审核者类型
pub enum ReviewerType {
    Lead,
    User,
}
```

### 4.3 Plan JSON 扩展

```rust
// WorkflowNodeData 扩展
pub struct WorkflowNodeData {
    pub step_type: String,          // "task" | "review" | "result"
    pub title: String,
    pub instructions: String,
    pub agent_id: Option<String>,
    pub acceptance: Option<Vec<String>>,
    pub outputs: Option<Vec<String>>,
    pub interruptible: bool,
    pub max_retry: Option<u32>,

    // 新增字段
    pub loop_key: Option<String>,           // 所属回路标识
    pub review_scope: Option<Vec<String>>,  // Review节点: 审核哪些step_key
    pub lead_review: Option<bool>,          // 是否需要Lead审核(默认true)
    pub user_review: Option<bool>,          // 是否需要用户审核(默认false, Review节点默认true)
}

// WorkflowPlanJson 扩展
pub struct WorkflowPlanJson {
    // ... 现有字段 ...

    // 新增: 回路定义(可选, 也可从edges拓扑自动推断)
    pub loops: Option<Vec<WorkflowLoopDef>>,
}

pub struct WorkflowLoopDef {
    pub loop_key: String,               // 回路标识
    pub member_steps: Vec<String>,      // 回路内执行节点step_key列表
    pub review_step: String,            // 审核节点step_key
    pub max_retry: Option<u32>,         // 回路最大重试次数
    pub user_review_required: Option<bool>, // 是否需要用户审核(默认true, false则跳过)
}
```

---

## 五、核心执行流程

### 5.1 自反馈节点执行流程

```
fn execute_step_with_feedback(step, execution, round):
    loop {
        // Phase 1: Worker 执行
        step.status = Running
        result = run_worker_agent(step)

        if step.lead_review:
            // Phase 2: Lead Agent 审核
            step.status = WaitingReview
            lead_verdict = run_lead_review(step, result)

            if lead_verdict == Rejected:
                // 记录审核意见
                save_step_review(step, Lead, Rejected, lead_verdict.feedback)
                step.retry_count += 1
                if step.retry_count >= step.max_retry:
                    step.status = Failed
                    return Err
                // 将反馈注入Worker下次执行的context
                step.context.push(lead_verdict.feedback)
                continue  // 回到Phase 1

        // Phase 3: 用户审核 (如果需要)
        if step.user_review:
            step.status = WaitingInput
            // 前端弹出审核面板, 要求用户输入反馈消息(文本)
            user_verdict = await_user_review(step, result)

            if user_verdict == Rejected:
                save_step_review(step, User, Rejected, user_verdict.feedback)
                // 用户输入的反馈消息注入Worker下次执行context
                step.context.push(user_verdict.feedback)
                continue  // 回到Phase 1

        // 通过所有审核
        step.status = PreCompleted
        break
    }
```

### 5.2 自反馈回路执行流程

```
fn execute_loop(loop_def, execution, round):
    loop {
        // 执行回路内所有节点(按依赖拓扑序)
        for step in loop_def.member_steps (topological order):
            execute_step_with_feedback(step)

        // 执行审核节点
        review_step = get_step(loop_def.review_step)
        review_step.status = Running
        review_result = run_review_agent(review_step, all_member_results)

        if review_result == Rejected:
            loop.retry_count += 1
            if loop.retry_count >= loop.max_retry:
                loop.status = Failed
                return Err

            // 负反馈 → 回路内所有节点重置
            loop.rejection_reason = review_result.feedback
            for step in loop_def.member_steps:
                step.status = Ready
                step.context.push(review_result.feedback)  // 注入反馈
            continue  // 重新执行整个回路

        // 审核通过 → 用户确认 (如果需要)
        if loop_def.user_review_required != false:
            review_step.status = WaitingInput
            // 前端弹出审核面板, 要求用户输入反馈消息
            user_verdict = await_user_review(review_step)

            if user_verdict == Rejected:
                // 用户反馈消息注入回路所有节点context
                loop.retry_count += 1
                for step in loop_def.member_steps:
                    step.status = Ready
                    step.context.push(user_verdict.feedback)
                continue

        // 全部通过
        loop.status = Completed
        for step in loop_def.member_steps:
            step.status = Completed
        review_step.status = Completed
        break
    }
```

### 5.3 反馈迭代流程

```
fn run_iteration_cycle(execution):
    loop {
        // 创建/获取当前Round
        round = create_or_get_current_round(execution)

        // 编译当前Revision得到执行图
        compiled = compile_active_revision(execution)

        // 识别回路和独立节点
        loops = identify_loops(compiled)
        independent_steps = get_non_loop_steps(compiled)

        // 按拓扑序执行(回路作为一个整体单位)
        execute_round(round, loops, independent_steps)

        // Round 完成 → 询问用户
        round.status = WaitingUserAcceptance
        user_decision = await_user_iteration_feedback()

        if user_decision.accepted:
            round.status = Accepted
            execution.status = Completed
            break

        // 用户不满意 → 收集结构化反馈
        round.status = Rejected
        feedback = collect_structured_feedback(user_decision)
        // 模板: { what_wrong: "", expected: "", priority: "" }

        // 基于反馈 + 当前成果 + 原始目标 生成新计划
        current_summary = summarize_round_results(round)
        new_plan = generate_new_plan(
            original_goal = execution.plan.goal,
            current_state = current_summary,
            user_feedback = feedback,
        )

        // 创建新Revision
        create_new_revision(execution.plan, new_plan, reason=feedback)

        // 开启新Round
        execution.current_round += 1
        // continue loop
    }
```

---

## 六、关键设计决策 (ADR)

### ADR-1: 回路(Loop)是编排层概念，不改变Step的数据模型

**决策**: Loop作为新表/新模型存在，不侵入WorkflowStep表结构。
Step通过`loop_key`字段关联到Loop。

**原因**: 保持现有Step模型简洁，Loop的重试和状态管理独立于Step。

**权衡**: 增加一个表的复杂度，但换来关注点分离。

### ADR-2: Lead审核复用Agent执行能力，不单独建新服务

**决策**: Lead审核本质上是用Lead Agent执行一次带审核prompt的对话，
结果通过Protocol消息返回。复用现有`run_workflow_agent_prompt`。

**原因**: 现有Agent执行基础设施完备，无需新建审核专用服务。

### ADR-3: 节点状态新增PreCompleted和Revising

**决策**:
- `PreCompleted`: 节点自身审核通过，但等待回路级/用户级确认后才能Completed
- `Revising`: 与Running区分，表示"根据反馈修改中"，retry_count > 0

**原因**: 明确区分"节点自审通过"和"最终完成"两个语义，便于前端展示和状态查询。

### ADR-4: 反馈迭代复用现有Round + Revision机制

**决策**: 每轮迭代 = 一个新Round + 一个新PlanRevision。
用户反馈存储在`WorkflowIterationFeedback`表中，关联前后两个Round。

**原因**: 现有Round/Revision已具备版本管理能力，无需新建迭代层。

### ADR-5: 审核节点的Review Scope通过plan_json声明

**决策**: 审核节点在plan_json中声明`review_scope: ["step_a", "step_b", "step_c"]`，
明确指定它审核哪些前置节点。编译器验证scope内节点必须是Review节点的前置依赖。

**原因**: 显式声明比从拓扑自动推断更清晰可控，避免歧义。

---

## 七、数据库迁移计划

```sql
-- 1. 扩展 workflow_step_status 枚举
ALTER TYPE workflow_step_status ADD VALUE 'pre_completed';
ALTER TYPE workflow_step_status ADD VALUE 'revising';

-- 2. 新增 workflow_loops 表
CREATE TABLE workflow_loops (
    id TEXT PRIMARY KEY,
    execution_id TEXT NOT NULL REFERENCES workflow_executions(id),
    round_id TEXT NOT NULL REFERENCES workflow_rounds(id),
    loop_key TEXT NOT NULL,
    review_step_id TEXT NOT NULL REFERENCES workflow_steps(id),
    member_step_ids_json TEXT NOT NULL,  -- JSON array of step IDs
    status TEXT NOT NULL DEFAULT 'running',
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retry INTEGER NOT NULL DEFAULT 3,
    user_review_required BOOLEAN NOT NULL DEFAULT TRUE,
    rejection_reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. 新增 workflow_step_reviews 表
CREATE TABLE workflow_step_reviews (
    id TEXT PRIMARY KEY,
    step_id TEXT NOT NULL REFERENCES workflow_steps(id),
    execution_id TEXT NOT NULL REFERENCES workflow_executions(id),
    reviewer_type TEXT NOT NULL,  -- 'lead' | 'user'
    reviewer_id TEXT,
    verdict TEXT NOT NULL,  -- 'approved' | 'rejected'
    feedback TEXT NOT NULL DEFAULT '',
    review_round INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. 新增 workflow_iteration_feedbacks 表
CREATE TABLE workflow_iteration_feedbacks (
    id TEXT PRIMARY KEY,
    execution_id TEXT NOT NULL REFERENCES workflow_executions(id),
    from_round_id TEXT NOT NULL REFERENCES workflow_rounds(id),
    to_round_id TEXT REFERENCES workflow_rounds(id),
    user_feedback_json TEXT NOT NULL,  -- 结构化模板JSON
    current_status_summary TEXT NOT NULL,
    new_plan_diff TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. workflow_steps 表添加字段
ALTER TABLE workflow_steps ADD COLUMN loop_id TEXT REFERENCES workflow_loops(id);
ALTER TABLE workflow_steps ADD COLUMN lead_review_required BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE workflow_steps ADD COLUMN user_review_required BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE workflow_steps ADD COLUMN revision_context TEXT;  -- 累积反馈context JSON
```

---

## 八、服务层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     WorkflowRuntime (扩展)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────┐   ┌──────────────────────────────┐     │
│  │ StepExecutor       │   │ LoopExecutor                 │     │
│  │ (自反馈节点执行器)   │   │ (自反馈回路执行器)             │     │
│  ├────────────────────┤   ├──────────────────────────────┤     │
│  │ execute()          │   │ execute_loop()               │     │
│  │ run_worker()       │   │ reset_loop_steps()           │     │
│  │ run_lead_review()  │   │ inject_feedback_to_steps()   │     │
│  │ await_user_review()│   │ check_loop_convergence()     │     │
│  │ handle_revision()  │   └──────────────────────────────┘     │
│  └────────────────────┘                                         │
│                                                                 │
│  ┌────────────────────────────┐   ┌────────────────────────┐   │
│  │ IterationManager           │   │ ReviewCoordinator      │   │
│  │ (反馈迭代管理器)             │   │ (审核协调器)            │   │
│  ├────────────────────────────┤   ├────────────────────────┤   │
│  │ collect_user_feedback()    │   │ run_loop_review()      │   │
│  │ summarize_round_results() │   │ aggregate_step_results()│   │
│  │ generate_iteration_plan() │   │ emit_rejection()       │   │
│  │ create_new_round()        │   │ await_user_confirm()   │   │
│  └────────────────────────────┘   └────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 实现位置建议

| 组件                | 实现方式                  | 文件                                    |
| ----------------- | --------------------- | ------------------------------------- |
| StepExecutor      | WorkflowRuntime内新增方法组 | workflow_runtime.rs                   |
| LoopExecutor      | 新trait + impl         | workflow_loop_executor.rs (新增)        |
| IterationManager  | 新struct               | workflow_iteration.rs (新增)            |
| ReviewCoordinator | 新struct               | workflow_review.rs (新增)               |
| 模型扩展              | 扩展现有文件                | workflow_types.rs, 新增workflow_loop.rs |

---

## 八(附)、反馈Prompt内容格式设计

当反馈发生时，需要将反馈信息以结构化prompt的形式注入Agent执行上下文。
以下定义三层反馈各自的prompt模板。

### 8A.1 自反馈节点层 - Lead审核反馈Prompt

**触发时机**: Lead Agent审核不通过，Worker需要根据反馈重新执行。

```text
## 修改要求 (第 {retry_count} 次修改)

你之前的执行结果未通过 Lead Agent 审核。请根据以下审核意见修改你的工作。

### 审核意见
{lead_feedback}

### 你上次的执行结果摘要
{previous_summary}

### 要求
1. 仔细阅读审核意见，理解问题所在
2. 针对审核意见中指出的问题进行修改
3. 保留上次执行中正确的部分，只修改有问题的部分
4. 修改完成后按照标准格式返回结果

### 原始任务指令 (不变)
step 标题：{step_title}
step 指令：{step_instructions}

### 已完成前置步骤摘要
{dependency_text}
```

### 8A.2 自反馈节点层 - 用户审核反馈Prompt

**触发时机**: 用户审核不通过，Worker需要根据用户反馈重新执行。

```text
## 用户修改要求 (第 {retry_count} 次修改)

你之前的执行结果未通过用户审核。请根据用户的修改意见重新执行。

### 用户反馈
{user_feedback}

### 你上次的执行结果摘要
{previous_summary}

### 要求
1. 用户的反馈具有最高优先级，必须严格按照用户意见修改
2. 如果用户反馈与原始指令有冲突，以用户反馈为准
3. 保留上次执行中用户未提出异议的部分
4. 修改完成后按照标准格式返回结果

### 原始任务指令 (参考)
step 标题：{step_title}
step 指令：{step_instructions}

### 已完成前置步骤摘要
{dependency_text}
```

### 8A.3 自反馈节点层 - Lead审核Prompt (给Lead Agent)

**触发时机**: Worker执行完成后，Lead Agent对结果进行审核。

```text
## 审核任务

你是本次 workflow 的 Lead Agent，请审核以下执行节点的结果。

### workflow 目标
{workflow_goal}

### 被审核节点信息
- step 标题：{step_title}
- step 指令：{step_instructions}
- 验收标准：{acceptance_criteria}

### 执行结果
摘要：{step_summary}
详细内容：{step_content}
产出文件：{step_outputs}

### 前置依赖结果摘要
{dependency_text}

### 审核要求
请从以下维度评估执行结果：
1. 是否完成了 step 指令要求的所有内容
2. 结果质量是否满足验收标准
3. 是否与 workflow 整体目标一致
4. 是否有明显的错误或遗漏

### 返回格式
通过时返回：
{{
  "type": "review_result",
  "step_key": "{step_key}",
  "execution_id": "{execution_id}",
  "verdict": "approved",
  "feedback": "审核通过的简要说明"
}}

不通过时返回：
{{
  "type": "review_result",
  "step_key": "{step_key}",
  "execution_id": "{execution_id}",
  "verdict": "rejected",
  "feedback": "详细说明不通过的原因和需要修改的具体内容"
}}
```

### 8A.4 自反馈回路层 - Review节点审核Prompt (给Lead Agent)

**触发时机**: 回路内所有执行节点完成后，Review节点对整体结果进行审核。

```text
## 回路审核任务

你是本次 workflow 的 Lead Agent，请对以下回路（阶段）的所有执行结果进行综合审核。

### workflow 目标
{workflow_goal}

### 回路信息
- 回路标识：{loop_key}
- 当前重试次数：{loop_retry_count} / {loop_max_retry}
- 审核范围：{review_scope_step_titles}

### 各执行节点结果

{for each step in review_scope:}
#### [{step_index}] {step_title}
- 指令：{step_instructions}
- 验收标准：{step_acceptance}
- 执行摘要：{step_summary}
- 详细内容：{step_content}
- 产出：{step_outputs}
{end for}

### 审核要求
请从整体角度评估本回路的执行质量：
1. 各节点的结果是否相互一致、逻辑连贯
2. 整体是否达成了本阶段的目标
3. 各节点之间的产出是否正确衔接
4. 是否存在需要整体返工的系统性问题

### 返回格式
通过时返回：
{{
  "type": "loop_review_result",
  "loop_key": "{loop_key}",
  "execution_id": "{execution_id}",
  "verdict": "approved",
  "feedback": "回路审核通过的综合评价"
}}

不通过时返回（会导致回路内所有节点重新执行）：
{{
  "type": "loop_review_result",
  "loop_key": "{loop_key}",
  "execution_id": "{execution_id}",
  "verdict": "rejected",
  "feedback": "详细说明整体问题，以及对每个需要修改的节点的具体修改建议",
  "step_feedbacks": [
    {{ "step_key": "{step_key_1}", "feedback": "针对该节点的具体修改意见" }},
    {{ "step_key": "{step_key_2}", "feedback": "针对该节点的具体修改意见" }}
  ]
}}
```

### 8A.5 自反馈回路层 - 回路负反馈注入Prompt

**触发时机**: Review节点或用户审核不通过，反馈注入回路内各执行节点重新执行。

```text
## 回路返工要求 (第 {loop_retry_count} 次回路重试)

本回路的整体审核未通过，你需要根据以下反馈重新执行你的任务。

### 回路审核结论
{loop_rejection_reason}

### 针对你的节点的修改意见
{step_specific_feedback}

### 其他节点的修改方向 (供参考)
{other_steps_feedback_summary}

### 你上次的执行结果
摘要：{your_previous_summary}

### 要求
1. 重点关注「针对你的节点的修改意见」进行修改
2. 注意与其他节点修改方向保持一致
3. 保留上次正确的工作成果，针对性修改
4. 修改完成后按照标准格式返回结果

### 原始任务指令
step 标题：{step_title}
step 指令：{step_instructions}

### 已完成前置步骤摘要（回路外）
{external_dependency_text}
```

### 8A.6 自反馈回路层 - 用户审核反馈注入Prompt

**触发时机**: 用户审核回路整体结果不通过，反馈注入回路内各节点重新执行。

```text
## 用户回路返工要求 (第 {loop_retry_count} 次回路重试)

本回路的整体结果未通过用户审核，请根据用户反馈重新执行。

### 用户反馈
{user_feedback}

### 回路执行现状摘要
{loop_current_state_summary}

### 你上次的执行结果
摘要：{your_previous_summary}

### 要求
1. 用户反馈具有最高优先级
2. 理解用户反馈对整体回路的影响，调整你的工作
3. 修改完成后按照标准格式返回结果

### 原始任务指令
step 标题：{step_title}
step 指令：{step_instructions}
```

### 8A.7 反馈迭代层 - 新计划生成Prompt (给Lead Agent)

**触发时机**: 一轮计划执行完成后，用户反馈不满意，需要生成新一轮迭代计划。

```text
## 迭代计划生成 (第 {iteration_round + 1} 轮)

上一轮计划执行完成但用户不满意，请根据以下信息生成新一轮的迭代计划。

### 原始任务目标
{original_goal}

### 上一轮执行现状摘要
{current_state_summary}

各节点执行结果：
{for each step:}
- [{step_key}] {step_title}: {step_status} - {step_summary}
{end for}

已产出文件：
{all_outputs}

### 用户反馈 (必须严格满足)
- 哪里不对：{user_feedback.what_wrong}
- 期望结果：{user_feedback.expected}
- 优先级：{user_feedback.priority}
- 补充说明：{user_feedback.additional_notes}

### 历史迭代记录
{for each previous_round:}
第 {round_index} 轮：{round_status}
- 用户反馈：{round_user_feedback}
{end for}

### 生成要求
1. 基于当前已有成果，不要从头开始，而是增量修改
2. 新计划应当直接解决用户反馈中指出的问题
3. 保留上一轮中用户未提出异议的成果
4. 如果需要修改已有文件，在step指令中明确指出
5. 新计划中可以复用上一轮的部分节点（如果该节点不需要重做）
6. 按照标准 workflow plan JSON 格式返回新计划

### 可用 Agent 列表
Lead: {lead_agent_id}
Available: {available_agents}

### 返回格式
返回完整的 workflow plan JSON（与初始计划格式一致）。
```

### 8A.8 Prompt注入策略

| 层级           | 反馈来源                 | Prompt注入位置                         | 注入方式                |
| ------------ | -------------------- | ---------------------------------- | ------------------- |
| 节点层-Lead反馈   | Lead Agent审核rejected | Worker Agent下次执行的system prompt追加   | 追加到step指令后方         |
| 节点层-用户反馈     | 用户输入feedback         | Worker Agent下次执行的system prompt追加   | 追加到step指令后方         |
| 回路层-Review反馈 | Review节点rejected     | 回路内所有Worker Agent重执行的system prompt | 替换原始prompt为返工prompt |
| 回路层-用户反馈     | 用户输入feedback         | 回路内所有Worker Agent重执行的system prompt | 替换原始prompt为返工prompt |
| 迭代层-用户反馈     | 用户iteration feedback | Lead Agent生成新计划的prompt             | 独立的计划生成prompt       |

**revision_context 字段格式** (存储在 workflow_steps.revision_context 中)：

```json
{
  "feedback_history": [
    {
      "round": 1,
      "source": "lead",
      "feedback": "缺少错误处理逻辑",
      "timestamp": "2026-05-02T10:00:00Z"
    },
    {
      "round": 2,
      "source": "user",
      "feedback": "需要添加单元测试",
      "timestamp": "2026-05-02T10:30:00Z"
    }
  ],
  "previous_summary": "实现了基本的CRUD接口...",
  "previous_outputs": ["src/api/handler.rs"]
}
```

---

## 九、可观测性要求

1. **WorkflowEvent** 扩展事件类型:
   - `StepLeadReviewStarted`, `StepLeadReviewPassed`, `StepLeadReviewRejected`
   - `StepUserReviewStarted`, `StepUserReviewPassed`, `StepUserReviewRejected`
   - `LoopStarted`, `LoopRetrying`, `LoopPassed`, `LoopFailed`
   - `IterationFeedbackReceived`, `IterationNewPlanGenerated`

2. **WorkflowTranscript** 新增entry_type:
   - `lead_review`, `user_review`, `loop_rejection`, `iteration_feedback`

3. **前端 WorkflowCard** 展示:
   - 节点显示当前审核状态(Worker执行中/Lead审核中/用户审核中)
   - 回路显示重试次数
   - 迭代显示轮次历史

---

## 十、前端数据定义 (Backend → Frontend)

### 10.1 WorkflowCardProjection 扩展

在现有 `WorkflowCardProjection` 基础上新增字段：

```rust
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct WorkflowCardProjection {
    // --- 现有字段 ---
    pub execution_id: Option<String>,
    pub plan_id: String,
    pub revision_id: String,
    pub title: String,
    pub goal: String,
    pub state: WorkflowCardState,
    pub execution_status: String,
    pub error_message: Option<String>,
    pub completed_step_count: usize,
    pub total_step_count: usize,
    pub result_summary: Option<String>,
    pub outputs: Vec<String>,
    pub agents: Vec<WorkflowCardAgent>,
    pub steps: Vec<WorkflowCardStep>,
    pub plan: WorkflowPlanJson,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub validation_errors: Option<String>,

    // --- 新增字段 ---
    pub current_round: i32,                          // 当前迭代轮次
    pub loops: Vec<WorkflowCardLoop>,                // 回路状态列表
    pub pending_review: Option<WorkflowPendingReview>, // 当前等待用户操作的审核请求
    pub iteration_history: Vec<WorkflowIterationSummary>, // 历史迭代摘要
}
```

### 10.2 WorkflowCardStep 扩展

```rust
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct WorkflowCardStep {
    // --- 现有字段 ---
    pub id: String,
    pub step_key: String,
    pub title: String,
    pub step_type: String,
    pub status: String,
    pub agent_name: Option<String>,
    pub summary_text: Option<String>,
    pub content: Option<String>,

    // --- 新增字段 ---
    pub review_phase: Option<String>,       // "worker_executing" | "lead_reviewing" | "waiting_user" | null
    pub retry_count: i32,                   // 当前重试次数
    pub max_retry: i32,                     // 最大重试次数
    pub loop_key: Option<String>,           // 所属回路标识
    pub latest_review: Option<WorkflowCardReview>, // 最近一次审核结果
}
```

### 10.3 新增前端数据结构

```rust
/// 回路状态(传递给前端)
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct WorkflowCardLoop {
    pub loop_key: String,                   // 回路标识
    pub status: String,                     // "running" | "waiting_review" | "passed" | "rejected" | "waiting_user" | "completed" | "failed"
    pub retry_count: i32,                   // 当前回路重试次数
    pub max_retry: i32,                     // 最大重试次数
    pub member_step_keys: Vec<String>,      // 回路内节点step_key
    pub review_step_key: String,            // 审核节点step_key
    pub user_review_required: bool,         // 是否需要用户审核
    pub rejection_reason: Option<String>,   // 最近一次拒绝原因
}

/// 等待用户操作的审核请求(前端据此弹出审核面板)
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct WorkflowPendingReview {
    pub review_id: String,                  // 审核请求唯一ID
    pub review_type: String,                // "step_user_review" | "loop_user_review" | "iteration_acceptance"
    pub target_id: String,                  // step_id 或 loop_key 或 round_id
    pub target_title: String,               // 显示标题
    pub context_summary: String,            // 审核上下文摘要(展示给用户看的执行结果)
    pub prompt_template: WorkflowReviewPromptTemplate, // 引导用户输入的模板
}

/// 用户审核输入模板(前端渲染表单用)
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct WorkflowReviewPromptTemplate {
    pub message: String,                    // 提示文案, 如"请审核以下执行结果"
    pub fields: Vec<WorkflowReviewField>,   // 表单字段定义
    pub actions: Vec<WorkflowReviewAction>, // 可选操作按钮
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct WorkflowReviewField {
    pub key: String,                        // 字段标识, 如 "feedback"
    pub label: String,                      // 显示标签, 如 "修改意见"
    pub field_type: String,                 // "text" | "textarea" | "select"
    pub required: bool,                     // 是否必填
    pub placeholder: Option<String>,        // 占位文本
    pub options: Option<Vec<String>>,       // select类型的选项
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct WorkflowReviewAction {
    pub action: String,                     // "approve" | "reject"
    pub label: String,                      // 按钮文案, 如 "通过" / "打回修改"
    pub style: String,                      // "primary" | "danger"
    pub requires_feedback: bool,            // 点击时是否必须填写feedback
}

/// 单次审核记录(传递给前端展示历史)
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct WorkflowCardReview {
    pub reviewer_type: String,              // "lead" | "user"
    pub verdict: String,                    // "approved" | "rejected"
    pub feedback: String,                   // 审核意见内容
    pub review_round: i32,                  // 第几轮审核
    pub created_at: String,                 // 时间戳
}

/// 迭代历史摘要(前端展示轮次切换)
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct WorkflowIterationSummary {
    pub round_index: i32,                   // 轮次序号
    pub status: String,                     // "accepted" | "rejected" | "running"
    pub user_feedback: Option<String>,      // 用户反馈摘要(rejected时)
    pub result_summary: Option<String>,     // 该轮执行结果摘要
    pub started_at: String,
    pub completed_at: Option<String>,
}
```

### 10.4 前端 → 后端 用户审核响应

```rust
/// 用户提交审核结果(前端POST到后端)
#[derive(Debug, Clone, Deserialize)]
pub struct UserReviewResponse {
    pub review_id: String,                  // 对应 PendingReview.review_id
    pub action: String,                     // "approve" | "reject"
    pub feedback: Option<String>,           // 用户输入的反馈消息(reject时必填)
}

/// 用户提交迭代反馈(反馈迭代层, 前端POST到后端)
#[derive(Debug, Clone, Deserialize)]
pub struct UserIterationFeedback {
    pub execution_id: String,
    pub round_id: String,
    pub action: String,                     // "accept" | "reject"
    pub feedback: Option<UserIterationFeedbackDetail>, // reject时必填
}

/// 结构化迭代反馈模板
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserIterationFeedbackDetail {
    pub what_wrong: String,                 // 哪里不对
    pub expected: String,                   // 期望的结果
    pub priority: Option<String>,           // 优先级: "high" | "medium" | "low"
    pub additional_notes: Option<String>,   // 补充说明
}
```

### 10.5 前端交互时序

```
┌──────┐          ┌──────────┐          ┌───────────────┐
│前端UI│          │  后端API  │          │WorkflowRuntime│
└──┬───┘          └────┬─────┘          └──────┬────────┘
   │                   │                       │
   │  订阅workflow状态  │                       │
   │◀─────────────────▶│                       │
   │                   │                       │
   │  CardProjection   │                       │
   │  (含pending_review)│                       │
   │◀──────────────────│◀──────────────────────│ step进入WaitingInput
   │                   │                       │
   │ 弹出审核面板       │                       │
   │ (渲染prompt_      │                       │
   │  template表单)    │                       │
   │                   │                       │
   │ 用户填写feedback   │                       │
   │ 点击approve/reject│                       │
   │──────────────────▶│  UserReviewResponse   │
   │                   │──────────────────────▶│
   │                   │                       │ 处理反馈,
   │                   │                       │ 推进状态机
   │  更新CardProjection│                       │
   │◀──────────────────│◀──────────────────────│
   │                   │                       │
```

---

## 十一、实现优先级

| 阶段 | 内容 | 依赖 |
|------|------|------|
| P0 | 自反馈节点 (Lead审核 + 用户审核) + 前端审核面板数据接口 | 现有Step执行 |
| P1 | 回路模型 + LoopExecutor + WorkflowCardLoop投影 | P0 |
| P2 | 反馈迭代 (结构化反馈模板 + 新计划生成) + IterationSummary | P1 |
| P3 | 前端完整展示适配 (审核面板、回路可视化、迭代历史) | P0-P2 |
