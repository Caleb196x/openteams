# 自反馈工作流 - 实施计划

## Agent配置

| Agent ID        | 类型                            | 职责                                                |
| --------------- | ----------------------------- | ------------------------------------------------- |
| backend-models  | Rust Backend Developer        | 数据模型层：新增表、枚举扩展、DB迁移                               |
| backend-runtime | Rust Backend Developer        | 运行时引擎：StepExecutor、LoopExecutor、ReviewCoordinator |
| backend-api     | Rust Backend Developer        | API层：新增HTTP端点、请求/响应类型、WebSocket推送                 |
| frontend-dev    | TypeScript Frontend Developer | 前端：审核面板、回路可视化、迭代历史UI                              |

**总计需要 4 个 Agent**（可并行工作，有依赖关系的串行）

---

## Phase 0: 数据模型与基础设施 (前置)

### Task 0.1 - 扩展WorkflowStepStatus枚举
- **Agent**: backend-models
- **文件**: `crates/db/src/models/workflow_types.rs`
- **内容**:
  - 新增 `PreCompleted` 状态
  - 新增 `Revising` 状态
- **验收**: 编译通过，现有测试不受影响

### Task 0.2 - 新增WorkflowLoopStatus枚举
- **Agent**: backend-models
- **文件**: `crates/db/src/models/workflow_types.rs`
- **内容**:
  - 新增 `WorkflowLoopStatus` 枚举 (Running, WaitingReview, Passed, Rejected, WaitingUser, Completed, Failed)
  - 新增 `ReviewVerdict` 枚举 (Approved, Rejected)
  - 新增 `ReviewerType` 枚举 (Lead, User)
- **验收**: 编译通过，TS类型导出正确

### Task 0.3 - 新增WorkflowEventType扩展
- **Agent**: backend-models
- **文件**: `crates/db/src/models/workflow_types.rs`
- **内容**:
  - 扩展 `WorkflowEventType` 新增: StepLeadReviewStarted, StepLeadReviewPassed, StepLeadReviewRejected, StepUserReviewStarted, StepUserReviewPassed, StepUserReviewRejected, LoopStarted, LoopRetrying, LoopPassed, LoopFailed, IterationFeedbackReceived, IterationNewPlanGenerated
- **验收**: 编译通过

### Task 0.4 - DB迁移: workflow_loops表
- **Agent**: backend-models
- **文件**: `crates/db/migrations/2026XXXX_create_workflow_loops.sql`
- **内容**:
  - 创建 `workflow_loops` 表（含 user_review_required 字段）
  - 对应Rust模型 `crates/db/src/models/workflow_loop.rs`
  - 基本CRUD方法
- **依赖**: Task 0.2
- **验收**: 迁移可执行，模型可读写

### Task 0.5 - DB迁移: workflow_step_reviews表
- **Agent**: backend-models
- **文件**: `crates/db/migrations/2026XXXX_create_workflow_step_reviews.sql`
- **内容**:
  - 创建 `workflow_step_reviews` 表
  - 对应Rust模型 `crates/db/src/models/workflow_step_review.rs`
  - 基本CRUD方法
- **依赖**: Task 0.2
- **验收**: 迁移可执行，模型可读写

### Task 0.6 - DB迁移: workflow_iteration_feedbacks表
- **Agent**: backend-models
- **文件**: `crates/db/migrations/2026XXXX_create_workflow_iteration_feedbacks.sql`
- **内容**:
  - 创建 `workflow_iteration_feedbacks` 表
  - 对应Rust模型 `crates/db/src/models/workflow_iteration_feedback.rs`
  - 基本CRUD方法
- **验收**: 迁移可执行，模型可读写

### Task 0.7 - 扩展workflow_steps表
- **Agent**: backend-models
- **文件**: `crates/db/migrations/2026XXXX_alter_workflow_steps_feedback.sql`
- **内容**:
  - ALTER TABLE 添加字段: loop_id, lead_review_required, user_review_required, revision_context
  - 更新 WorkflowStep Rust模型对应字段
- **依赖**: Task 0.4
- **验收**: 迁移可执行，现有查询兼容

### Task 0.8 - 扩展WorkflowPlanJson/WorkflowNodeData
- **Agent**: backend-models
- **文件**: `crates/db/src/models/workflow_types.rs`
- **内容**:
  - `WorkflowNodeData` 新增: loop_key, review_scope, lead_review, user_review
  - `WorkflowPlanJson` 新增: loops (Option<Vec<WorkflowLoopDef>>)
  - 新增 `WorkflowLoopDef` 结构体
- **验收**: 现有plan JSON反序列化不受影响(新字段均为Option)

---


## Phase 1: 自反馈节点 (核心)

### Task 1.1 - Lead审核Prompt构建函数
- **Agent**: backend-runtime
- **文件**: `crates/services/src/services/workflow_runtime.rs`
- **内容**:
  - 新增 `build_lead_review_prompt()` 函数
  - 按照8A.3模板生成Lead审核prompt
  - 输入: workflow_goal, step, result, dependency_summaries, acceptance_criteria
  - 输出: String prompt
- **依赖**: Phase 0完成
- **验收**: 单元测试验证prompt格式正确

### Task 1.2 - 审核结果解析
- **Agent**: backend-runtime
- **文件**: `crates/services/src/services/workflow_runtime.rs`
- **内容**:
  - 新增 `WorkflowReviewProtocolMessage` 结构体 (type: review_result)
  - 新增 `parse_review_protocol_output()` 函数
  - 解析Lead Agent返回的审核JSON
- **验收**: 单元测试覆盖approved/rejected两种情况

### Task 1.3 - Worker反馈重执行Prompt构建
- **Agent**: backend-runtime
- **文件**: `crates/services/src/services/workflow_runtime.rs`
- **内容**:
  - 新增 `build_step_revision_prompt()` 函数
  - 按照8A.1(Lead反馈)和8A.2(用户反馈)模板生成重执行prompt
  - 输入: step, feedback_source, feedback_content, previous_summary, retry_count
- **依赖**: Task 0.7 (revision_context字段)
- **验收**: 单元测试验证两种反馈模板

### Task 1.4 - StepExecutor核心循环
- **Agent**: backend-runtime
- **文件**: `crates/services/src/services/workflow_runtime.rs`
- **内容**:
  - 新增 `execute_step_with_feedback()` 异步方法
  - 实现: Worker执行 → Lead审核 → (反馈循环) → 用户审核 → PreCompleted
  - 状态转移: Running → WaitingReview → Revising(如rejected) → WaitingInput → PreCompleted
  - 调用save_step_review记录每次审核
  - 更新revision_context字段
- **依赖**: Task 1.1, 1.2, 1.3, Task 0.5
- **验收**: 集成测试覆盖：通过路径、Lead拒绝重试路径、用户拒绝路径、超过max_retry失败路径

### Task 1.5 - 用户审核等待机制
- **Agent**: backend-runtime
- **文件**: `crates/services/src/services/workflow_runtime.rs`
- **内容**:
  - 实现step进入WaitingInput时暂停执行
  - 生成PendingReview投影数据
  - 实现接收UserReviewResponse后恢复执行的机制
- **依赖**: Task 1.4
- **验收**: 异步等待/恢复机制工作正常

### Task 1.6 - WorkflowCardProjection扩展(节点级)
- **Agent**: backend-runtime
- **文件**: `crates/services/src/services/workflow_runtime.rs`
- **内容**:
  - `WorkflowCardStep` 新增字段: review_phase, retry_count, max_retry, loop_key, latest_review
  - `WorkflowCardProjection` 新增字段: pending_review
  - 更新 `build_workflow_card_projection()` 填充新字段
- **依赖**: Task 1.4
- **验收**: 前端能正确接收新字段

---

## Phase 2: 自反馈回路

### Task 2.1 - 回路编译器扩展
- **Agent**: backend-runtime
- **文件**: `crates/services/src/services/workflow_compiler.rs`
- **内容**:
  - 解析 plan_json.loops 定义
  - 验证: review_scope内节点必须是Review节点的前置依赖
  - 验证: 回路内不能有跨回路的hard edge
  - CompiledGraph新增: loops字段
- **依赖**: Task 0.8
- **验收**: 编译器正确识别回路，非法回路报错

### Task 2.2 - 回路审核Prompt构建
- **Agent**: backend-runtime
- **文件**: `crates/services/src/services/workflow_review.rs` (新建)
- **内容**:
  - 新增 `build_loop_review_prompt()` 函数 (按8A.4模板)
  - 新增 `build_loop_rejection_prompt()` 函数 (按8A.5模板)
  - 新增 `build_loop_user_rejection_prompt()` 函数 (按8A.6模板)
  - 新增 `LoopReviewProtocolMessage` 结构体
  - 新增 `parse_loop_review_output()` 解析函数
- **依赖**: Phase 1完成
- **验收**: 单元测试覆盖各模板生成

### Task 2.3 - LoopExecutor核心实现
- **Agent**: backend-runtime
- **文件**: `crates/services/src/services/workflow_loop_executor.rs` (新建)
- **内容**:
  - `LoopExecutor` struct
  - `execute_loop()`: 按拓扑序执行回路内节点 → Review审核 → 用户审核
  - `reset_loop_steps()`: 重置回路内节点状态为Ready
  - `inject_feedback_to_steps()`: 将反馈写入各节点revision_context
  - 管理WorkflowLoop表状态转移 
  - 发射WorkflowEvent (LoopStarted, LoopRetrying, LoopPassed, LoopFailed)
- **依赖**: Task 2.1, 2.2, Task 0.4
- **验收**: 集成测试：正常通过路径、Review拒绝重试路径、用户拒绝路径、user_review_required=false跳过路径、超过max_retry失败路径

### Task 2.4 - 回路与Round执行集成
- **Agent**: backend-runtime
- **文件**: `crates/services/src/services/workflow_runtime.rs`
- **内容**:
  - 修改Round执行逻辑，识别loop节点 vs 独立节点
  - 回路作为整体调度单元
  - 回路完成后才释放后续依赖节点
- **依赖**: Task 2.3
- **验收**: 混合回路+独立节点的workflow能正确执行

### Task 2.5 - WorkflowCardProjection扩展(回路级)
- **Agent**: backend-runtime
- **文件**: `crates/services/src/services/workflow_runtime.rs`
- **内容**:
  - `WorkflowCardProjection` 新增: loops (Vec<WorkflowCardLoop>)
  - 更新 `build_workflow_card_projection()` 填充回路状态
- **依赖**: Task 2.3
- **验收**: 前端能接收回路状态数据

---

## Phase 3: 反馈迭代

### Task 3.1 - 迭代计划生成Prompt
- **Agent**: backend-runtime
- **文件**: `crates/services/src/services/workflow_iteration.rs` (新建)
- **内容**:
  - `IterationManager` struct
  - `build_iteration_plan_prompt()`: 按8A.7模板生成新计划prompt
  - `summarize_round_results()`: 汇总当前Round所有节点结果
- **依赖**: Phase 2完成
- **验收**: 单元测试验证prompt包含所有必要信息

### Task 3.2 - 迭代反馈收集与新Round创建
- **Agent**: backend-runtime
- **文件**: `crates/services/src/services/workflow_iteration.rs`
- **内容**:
  - `collect_user_feedback()`: 处理UserIterationFeedback
  - `generate_new_plan()`: 调用Lead Agent生成新计划
  - `create_new_round()`: 创建新PlanRevision + 新Round + 编译
  - 存储WorkflowIterationFeedback记录
- **依赖**: Task 3.1, Task 0.6
- **验收**: 集成测试：用户reject → 生成新计划 → 新Round可执行

### Task 3.3 - 迭代循环与Execution状态管理
- **Agent**: backend-runtime
- **文件**: `crates/services/src/services/workflow_runtime.rs`
- **内容**:
  - 修改execution主循环，Round完成后等待用户迭代反馈
  - 用户accept → execution.status = Completed
  - 用户reject → 触发IterationManager生成新计划
  - execution.current_round 递增
- **依赖**: Task 3.2
- **验收**: 多轮迭代正确执行

### Task 3.4 - WorkflowCardProjection扩展(迭代级)
- **Agent**: backend-runtime
- **文件**: `crates/services/src/services/workflow_runtime.rs`
- **内容**:
  - `WorkflowCardProjection` 新增: current_round, iteration_history
  - 更新 `build_workflow_card_projection()` 填充迭代历史
- **依赖**: Task 3.3
- **验收**: 前端能接收迭代历史数据

---

## Phase 4: API层

### Task 4.1 - 用户审核响应API
- **Agent**: backend-api
- **文件**: `crates/api/src/routes/workflow.rs` (或对应API文件)
- **内容**:
  - POST `/api/workflow/review/respond` - 处理UserReviewResponse
  - 参数验证: reject时feedback必填
  - 调用runtime恢复执行
- **依赖**: Task 1.5
- **验收**: API可调用，状态正确推进

### Task 4.2 - 用户迭代反馈API
- **Agent**: backend-api
- **文件**: `crates/api/src/routes/workflow.rs`
- **内容**:
  - POST `/api/workflow/iteration/feedback` - 处理UserIterationFeedback
  - 参数验证: reject时feedback结构完整
  - 调用IterationManager
- **依赖**: Task 3.2
- **验收**: API可调用，新Round生成

### Task 4.3 - WebSocket/SSE推送扩展
- **Agent**: backend-api
- **文件**: 对应stream/websocket文件
- **内容**:
  - CardProjection推送包含新字段
  - pending_review变更时主动推送
  - 回路状态变更推送
- **依赖**: Task 1.6, 2.5, 3.4
- **验收**: 前端实时接收状态变更

---

## Phase 5: 前端

### Task 5.1 - 审核面板组件
- **Agent**: frontend-dev
- **文件**: 前端对应组件目录
- **内容**:
  - 根据pending_review渲染审核面板
  - 根据prompt_template渲染表单字段
  - approve/reject按钮操作
  - reject时强制填写feedback
  - 调用后端审核响应API
- **依赖**: Task 4.1
- **验收**: 用户可操作审核面板，数据正确提交

### Task 5.2 - 节点状态展示增强
- **Agent**: frontend-dev
- **文件**: WorkflowCard相关组件
- **内容**:
  - 显示review_phase (执行中/Lead审核中/等待用户)
  - 显示retry_count/max_retry
  - 显示latest_review（最近审核意见）
  - PreCompleted/Revising状态样式
- **依赖**: Task 1.6
- **验收**: 节点状态实时更新

### Task 5.3 - 回路可视化
- **Agent**: frontend-dev
- **文件**: WorkflowCard相关组件
- **内容**:
  - 回路节点分组显示
  - 回路状态badge (重试次数)
  - 回路rejection_reason展示
- **依赖**: Task 2.5
- **验收**: 回路状态正确展示

### Task 5.4 - 迭代历史与反馈表单
- **Agent**: frontend-dev
- **文件**: WorkflowCard相关组件
- **内容**:
  - 迭代轮次列表/标签页切换
  - 结构化反馈表单 (what_wrong, expected, priority, additional_notes)
  - 调用迭代反馈API
- **依赖**: Task 4.2, 3.4
- **验收**: 用户可查看历史轮次，提交迭代反馈

---

## 依赖关系总览

```
Phase 0 (模型层)
  ├── Task 0.1~0.3 (枚举扩展) ──────────────────┐
  ├── Task 0.4~0.7 (DB迁移+模型) ───────────────┤
  └── Task 0.8 (PlanJson扩展) ──────────────────┤
                                                 ▼
Phase 1 (自反馈节点) ◀──────────────────── Phase 0
  ├── Task 1.1~1.3 (Prompt函数) ─┐
  ├── Task 1.4 (StepExecutor) ◀──┘
  ├── Task 1.5 (等待机制) ◀── Task 1.4
  └── Task 1.6 (Projection) ◀── Task 1.4 
                    │
                    ▼
Phase 2 (自反馈回路) ◀──────────────────── Phase 1
  ├── Task 2.1 (编译器) ◀── Task 0.8
  ├── Task 2.2 (Prompt) ─┐
  ├── Task 2.3 (LoopExec) ◀── 2.1 + 2.2
  ├── Task 2.4 (集成) ◀── Task 2.3
  └── Task 2.5 (Projection) ◀── Task 2.3
                    │
                    ▼
Phase 3 (反馈迭代) ◀───────────────────── Phase 2
  ├── Task 3.1 (Prompt) ─┐
  ├── Task 3.2 (Manager) ◀── 3.1
  ├── Task 3.3 (主循环) ◀── 3.2
  └── Task 3.4 (Projection) ◀── 3.3
                    │
                    ▼
Phase 4 (API层) ◀── Phase 1.5 + Phase 3.2
  ├── Task 4.1 (审核API) ◀── Task 1.5
  ├── Task 4.2 (迭代API) ◀── Task 3.2
  └── Task 4.3 (推送) ◀── Task 1.6 + 2.5 + 3.4
                    │
                    ▼
Phase 5 (前端) ◀── Phase 4
  ├── Task 5.1 (审核面板) ◀── Task 4.1
  ├── Task 5.2 (节点状态) ◀── Task 1.6
  ├── Task 5.3 (回路) ◀── Task 2.5
  └── Task 5.4 (迭代历史) ◀── Task 4.2
```

## 并行策略

| 时间段 | backend-models | backend-runtime | backend-api | frontend-dev |
|--------|---------------|-----------------|-------------|-------------|
| Week 1 | Phase 0 全部 | - | - | - |
| Week 2 | 支持/Review | Phase 1 (Task 1.1~1.4) | - | 准备TS类型 |
| Week 3 | - | Phase 1 (Task 1.5~1.6) + Phase 2 (2.1~2.2) | Task 4.1 | Task 5.1, 5.2 |
| Week 4 | - | Phase 2 (Task 2.3~2.5) | - | Task 5.3 |
| Week 5 | - | Phase 3 (Task 3.1~3.4) | Task 4.2, 4.3 | Task 5.4 |
| Week 6 | - | 集成测试+修复 | 集成测试 | 集成测试 |

---

## 风险点

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Lead Agent审核prompt质量不稳定 | 误判通过/拒绝 | 增加验收标准明确度，审核prompt加入示例 |
| 回路重试死循环 | 执行卡死 | max_retry硬限制 + 超时机制 |
| 用户审核长时间无响应 | 执行阻塞 | 设置超时，可配置自动通过策略 |
| 新计划生成质量差 | 迭代不收敛 | 提供上轮完整context，限制计划diff幅度 |
| DB迁移兼容性 | 现有数据异常 | 新字段全部Option/有Default，不影响现有数据 |
