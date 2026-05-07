# Phase 0 Workflow Runtime 预研报告

## 1. 代码入口与职责切分

- `crates/services/src/services/workflow_runtime.rs`
  - 负责 prompt 构建、agent 执行封装、协议输出解析、runtime transcript 持久化、WorkflowCardProjection 构建。
  - 关键 step 运行入口：
    - `pub async fn run_workflow_step_agent_prompt(...) -> Result<String, WorkflowRuntimeError>`
    - `pub async fn run_workflow_step_agent_follow_up(...) -> Result<String, WorkflowRuntimeError>`
    - 两者最终都会进入 `async fn run_workflow_agent_prompt_inner(...) -> Result<String, WorkflowRuntimeError>`。
- `crates/services/src/services/workflow_orchestrator/mod.rs`
  - 负责 round 调度主循环、step 状态推进、protocol message 落库与 waiting/failure 处理。
  - 当前真正的单 step 调度入口：
    - `async fn prepare_and_run_step(...) -> Result<StepOutcome, OrchestratorError>`
  - 当前 round 主循环入口：
    - `pub async fn wake_scheduler(...) -> Result<(), OrchestratorError>`
- `crates/services/src/services/workflow_orchestrator/reducer.rs`
  - 负责 execution / step / agent session 的合法状态迁移校验与事件写入。

## 2. Step 执行调用链

`wake_scheduler` -> `prepare_and_run_step` -> `guarded_transition_step_and_sync(Ready -> Running)` -> `build_step_execution_prompt` -> `run_workflow_step_agent_prompt` -> `run_workflow_agent_prompt_inner` -> `parse_step_protocol_output` -> `handle_step_protocol_message`

`handle_step_protocol_message` 的分支：

- `FinalResult` -> `WorkflowStep::record_execution_result(...)` -> `transition_step_and_sync(..., Completed, "step_completed")`
- `Error` -> 记录 summary/content -> `transition_step_and_sync(..., Failed, "step_failed")`
- `ApprovalRequest` / `PermissionRequest` -> `park_for_user_action(..., WaitingReview, ...)`
- `ContinueConfirmation` / `InputRequest` -> `park_for_user_action(..., WaitingInput, ...)`

## 3. Ready -> Running -> Completed 现有流程

### Ready

- 初始 Ready 在 bootstrap 时由编译结果的 `CompiledGraph.ready_step_keys` 触发：
  - `WorkflowCompiler::compile(...)` 计算无入边节点为 ready。
  - `WorkflowOrchestrator::bootstrap_execution(...)` 中把这些 step 通过 `reducer::transition_step(..., Ready)` 推进到 `Ready`。
- 后续 Ready 由 `wake_scheduler` 动态提升：某个 `Pending` step 的所有前驱都已 `Completed` 时，推进为 `Ready`。
- Waiting/Failed/Interrupted 的 step 也可通过用户动作或 retry 路径回到 `Ready`。

### Running

- `prepare_and_run_step(...)` 先做 CAS 保护的 `Ready -> Running`：`guarded_transition_step_and_sync(..., WorkflowStepStatus::Running, "step_started")`。
- 然后写入一条 system transcript，构建 prompt，调用 runtime 层启动 executor。

### Completed

- agent 必须输出 workflow protocol JSON；`workflow_runtime.rs` 的 `parse_step_protocol_output(...)` 会校验 `step_key` / `execution_id`。
- 当协议类型是 `final_result` 时，orchestrator 记录 `summary_text` / `content` / `outputs`，再把 step 推进到 `Completed`。
- 所有 step 进入 completed-like（`Completed | Skipped | Cancelled`）后，execution 会被导出为 `Waiting`，并挂起到最终用户确认，而不是立即自动 `Completed`。

## 4. Round 执行主循环

`wake_scheduler(...)` 的循环逻辑：

1. 重新加载 execution / plan / revision / session / agents / steps / edges。
2. 调 `synchronize_runtime_state(...)`，根据 step 聚合状态回推 execution / agent session 状态。
3. 扫描 `Pending` step；若所有前驱均 `Completed`，提升为 `Ready`。
4. 以 `workflow_agent_session_id` 做分组，同一 agent session 同时只挑一个 `Ready` step，按 `display_order` 选最小者。
5. 若有待执行 step，必要时先把 execution 推到 `Running`。
6. 用 `join_all` 并发执行本批 step。
7. 执行后再同步状态：
   - 若 execution 变为 `Waiting` 且所有 step 都 completed-like，调用 `park_for_final_review(...)` 写入 unresolved `final_review` transcript。
   - 若有 parked/failure，则刷新 projection 后返回，等待用户动作或人工恢复。
   - 若本批全部完成且还能继续推进，就刷新 card 后继续下一轮 loop。

现阶段 round 本身没有独立 executor；round 调度逻辑实际集中在 orchestrator 的 scheduler loop 中。

## 5. Agent Prompt 构建模式

### Step 执行 prompt

函数：`pub fn build_step_execution_prompt(...) -> String`

现有模式特点：

- 强制 agent 只返回一个 JSON 对象。
- 协议类型固定为：`final_result` / `error` / `approval_request` / `permission_request` / `continue_confirmation` / `input_request`。
- prompt 包含：
  - `workflow_goal`
  - `step_type`
  - `step_title`
  - `step_instructions`
  - 前置依赖摘要 `completed_dependency_summaries`
- `_step_transcript_context` 参数当前未实际注入 prompt，是明显扩展点。

### Follow-up prompt

函数：`fn build_step_follow_up_prompt(...) -> String`

- 用于 Waiting/Failed 后的同 session 续跑。
- 明确注入：
  - previous agent message
  - latest user input
  - 同一 `step_key` / `execution_id`
- 要求“继续当前上下文，不要从头开始”，适合 Phase 1 承接 revision / review feedback 注入。

### Plan 生成 prompt

函数：`pub fn build_plan_generation_prompt(...) -> String`

- 把 `goal + available_agents + schema + previous_failure_reason` 编成严格 JSON 生成约束。
- 输出目标是 React Flow 兼容的 `WorkflowPlanJson`，随后交给 `WorkflowCompiler::compile(...)`。

## 6. WorkflowCardProjection 构建方式

函数：`pub fn build_workflow_card_projection(...) -> Result<WorkflowCardProjection, WorkflowRuntimeError>`

构建流程：

1. 反序列化 revision 中的 `plan_json`。
2. 调 `overlay_step_statuses(...)`，把数据库中的 step status 覆盖回 plan nodes。
3. 从 `ChatSessionAgent + ChatAgent + WorkflowAgentSession` 组装 `WorkflowCardAgent` 列表。
4. 从 `WorkflowStep` 组装 `WorkflowCardStep`：
   - `status` / `step_type` 使用 `to_workflow_wire_value(...)`
   - `summary_text` 通过 `parse_summary_text_preview(...)` 做预览
   - `content` 直接取 step.content
5. 从 `result` step 的 `summary_text` 里解析 `SummaryPayload`，提取 `result_summary` 和 `outputs`。
6. execution.status 到 card.state 的映射：
   - `Pending -> Pending`
   - `Completed -> Completed`
   - `Failed -> Failed`
   - `Paused -> Paused`
   - `Waiting -> Waiting`
   - `Recompiling -> Running`
   - 其它默认 `Running`

扩展点：Phase 1 新增 loop/review 元数据时，最合适的投影接入点就是 `WorkflowCardProjection` / `WorkflowCardStep` 的构建阶段。

## 7. WaitingInput / WaitingReview / Final Review 现状

### Step 级 waiting

- 统一入口：`park_for_user_action(...)`
- 行为：
  - 先把 step 推到 `WaitingInput` 或 `WaitingReview`
  - 写一条 `WorkflowTranscript`，`entry_type` 分别为 `approval_request` / `permission_request` / `continue_confirmation` / `input_request`
  - transcript `meta_json` 写入 `resolved: false`、`description`，`input_request` 还会写 `placeholder`

### 用户处理 waiting

- 统一入口：`resolve_transcript_action(...)`
- Resume 分支：
  - `approval_request: approved`
  - `permission_request: granted`
  - `continue_confirmation: continued`
  - `input_request: submitted`
  - 这些动作都会把 step 从 waiting 推回 `Ready`，记录一条 user transcript，并返回 `should_wake_scheduler = true`
- Fail 分支：
  - `approval_request: rejected`
  - `permission_request: denied`
  - 会把 step 直接记为 `Failed`

### Final review

- 当 execution.status 推导为 `Waiting` 且所有 step completed-like 时，`ensure_unresolved_final_review(...)` 会创建 execution 级 `final_review` transcript。
- `resolve_final_review(...)`：
  - `accepted` -> execution `Completed`
  - `rejected` -> execution `Paused`

说明：当前 runtime 里还没有设计文档里的 loop review / iteration review 结构，现有 waiting 机制主要是“单 step 请求用户动作 + 全流程最终确认”。

## 8. 状态转移触发点汇总

- `Pending -> Ready`
  - bootstrap 时由 `CompiledGraph.ready_step_keys`
  - scheduler 中前驱全部 `Completed`
  - waiting/failed/interrupted 恢复后
- `Ready -> Running`
  - `prepare_and_run_step(...)`
  - `submit_step_input(...)` 的 follow-up 恢复路径
- `Running -> Completed`
  - protocol `final_result`
- `Running -> WaitingReview`
  - protocol `approval_request` / `permission_request`
- `Running -> WaitingInput`
  - protocol `continue_confirmation` / `input_request`
- `Running -> Failed`
  - protocol `error`
  - runtime 执行错误/解析错误
- `Running -> InterruptRequested -> Interrupted`
  - `interrupt_step(...)` + `cancel_running_step(...)`
- execution 聚合状态由 `reducer::derive_execution_status(...)` 统一回推，不是每个 step 处理分支里手动硬编码。

## 9. Phase 1 适合落点的扩展位置

- Step 自反馈执行：优先扩展 `prepare_and_run_step(...)` 与 `handle_step_protocol_message(...)`，或在 orchestrator 上层包一层 `StepExecutor`。
- Review / waiting 统一协调：复用 `park_for_user_action(...)` 与 `resolve_transcript_action(...)` 的 transcript 驱动模式。
- Feedback prompt 注入：
  - 首选扩展 `build_step_execution_prompt(...)`
  - 重试/续跑场景可复用 `build_step_follow_up_prompt(...)`
- Loop / iteration 投影：扩展 `build_workflow_card_projection(...)`
- 状态机扩展：集中修改 `workflow_orchestrator/reducer.rs` 的 `validate_step_transition(...)`、`derive_execution_status(...)`、`validate_step_in_execution(...)`
- 编译期扩展：在 `WorkflowCompiler::compile(...)` 中增加 loop/review_scope/user_review 等字段编译，必要时配套增强 validator。

## 10. WorkflowCompiler 现状

函数：`WorkflowCompiler::compile(plan: &WorkflowPlanJson, valid_agent_ids: &[String]) -> Result<CompiledGraph, CompileError>`

编译流程：

1. `workflow_validator::validate_plan(...)` 做综合校验。
2. `topological_sort(plan)` 输出确定性的 DAG 顺序。
3. 遍历 topo order，把 node 编译成 `CompiledStep`：
   - `step_key <- node.id`
   - `step_type <- node.data.stepType`
   - `assigned_agent_id <- node.data.agentId`
   - `max_retry <- node.data.max_retry.unwrap_or(default_retry)`
   - `display_order <- topo 顺序`
4. 把 edges 编译成 `CompiledEdge`，默认 `kind = hard`。
5. 通过“无入边节点”计算 `ready_step_keys`。
6. 分别计算 `plan_hash` 与 `compiled_graph_hash`。

结论：当前 compiler 还是“节点/边/DAG/ready roots”模型，尚未内建 loop、review_scope、feedback 注入等语义；Phase 1 需要从这里开始补充编译产物。
