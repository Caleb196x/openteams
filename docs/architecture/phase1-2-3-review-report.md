# Phase 1/2/3 实现审核报告

## 总览

| Phase | 总评 | 通过率 |
|-------|------|--------|
| Phase 1 (自反馈节点) | **需修复** | 4/6 PASS, 2/6 PARTIAL |
| Phase 2 (自反馈回路) | **通过** | 5/5 PASS |
| Phase 3 (反馈迭代) | **通过** | 4/4 PASS (有小问题) |

---

## Phase 1 详细结果

| Task | 描述 | 结论 |
|------|------|------|
| 1.1 | `build_lead_review_prompt()` | **PASS** |
| 1.2 | `WorkflowReviewProtocolMessage` + `parse_review_protocol_output()` | **PASS** |
| 1.3 | `build_step_revision_prompt()` | **PASS** |
| 1.4 | `execute_step_with_feedback()` StepExecutor核心循环 | **PARTIAL** |
| 1.5 | 用户审核等待机制 | **PARTIAL** |
| 1.6 | WorkflowCardProjection扩展 | **PASS** |

### 需修复问题 (HIGH)

1. **用户拒绝应重试而非终止** (`workflow_orchestrator/mod.rs` ~L4503-4533)
   - 现状：用户reject后step直接转为Failed
   - 预期：用户reject应注入反馈并`continue`循环（重新执行step）
   - reducer已支持 `WaitingInput -> Revising -> Running`，逻辑需调整

2. **`WaitingReview -> PreCompleted` 状态转移非法** (`workflow_orchestrator/mod.rs` ~L4538-4546)
   - 现状：`user_review_required=false`且Lead通过时，试图做 `WaitingReview -> PreCompleted`
   - 但reducer (`reducer.rs` L235) 不允许此转移
   - 修复方案：reducer增加 `PreCompleted` 到 `WaitingReview` 的合法目标，或改为 `WaitingReview -> Completed`

### 小问题 (LOW)

3. **`review_phase` 命名与设计文档不一致** — 实现用 `"worker_running"`/`"lead_review"`/`"user_review"`，spec用 `"worker_executing"`/`"lead_reviewing"`/`"waiting_user"`
4. **`build_step_revision_prompt()` 缺少 dependency_text** — 未包含前置步骤摘要

---

## Phase 2 详细结果

| Task | 描述 | 结论 |
|------|------|------|
| 2.1 | 回路编译器扩展 | **PASS** |
| 2.2 | 回路审核Prompt构建 | **PASS** |
| 2.3 | LoopExecutor核心实现 | **PASS** |
| 2.4 | 回路与Round执行集成 | **PASS** |
| 2.5 | WorkflowCardProjection扩展(回路级) | **PASS** |

### 小偏差及修复状态

1. **WorkflowCardLoop用step IDs而非step keys** — 功能等价，前端需用ID交叉引用。**决议：接受现状**，`member_step_ids: Vec<String>` 存储 UUID，前端通过 step card 的 id 字段即可关联，无需额外转换。
2. **未实现 `check_loop_convergence()`** — 当前仅靠 `max_retry` 控制终止。**决议：Phase 2 范围内可接受**，后续可作为增强项引入基于输出 diff 的收敛检测，不阻塞当前功能。
3. **回路rejection时review step状态为Completed** — spec 建议 `LoopRejected` 状态，实现用 `Completed` + Loop 级 `Rejected` 状态替代。**决议：接受现状**，Loop 级状态已充分表达语义，step 级引入新状态会增加 reducer 复杂度且无额外价值。

---

## Phase 3 详细结果

| Task | 描述 | 结论 |
|------|------|------|
| 3.1 | 迭代计划生成Prompt | **PASS** |
| 3.2 | 迭代反馈收集与新Round创建 | **PASS** |
| 3.3 | 迭代循环与Execution状态管理 | **PASS** |
| 3.4 | WorkflowCardProjection扩展(迭代级) | **PASS** |

### 小偏差及修复状态

1. **结构化反馈未在prompt中分段展示** — `build_iteration_plan_prompt()` (workflow_iteration.rs:602) 传入原始 JSON 而非格式化的 what_wrong/expected/priority/additional_notes。**决议：待修复(LOW)**，当前 LLM 可解析原始 JSON，但格式化展示可提升 prompt 稳定性。可在后续迭代中将 `user_feedback_json` 解析为结构化段落。
2. **无显式 `WaitingUserAcceptance` round 状态** — 用 execution 级 Waiting 替代。**决议：接受现状**，功能等价，避免引入冗余状态枚举。
3. **workflow_iteration.rs 已有单元测试** — `build_iteration_plan_prompt_includes_feedback_history_and_agents` (workflow_iteration.rs:878) 验证了 prompt 内容、历史拼接和 agent 引用。**修正：原报告标记为缺失，实际已实现，改为 PASS。**
4. **Prompt模板语言为英文** — spec 模板为中文，实现为英文。**决议：接受现状**，英文 prompt 对多语言 LLM 兼容性更好，且测试已验证输出正确。团队如有统一要求可后续调整。

---

## 补充修复项

| # | 问题 | 修复状态 |
|---|------|----------|
| A | Loop 定义方式重构：从 LLM 显式输出改为编译期自动发现 | **已修复** — 架构决策：移除 prompt 中 loops schema，改为 `WorkflowCompiler::discover_loops_from_graph()` 自动从 review 节点反向 BFS 推导。prompt 仅引导 LLM 使用 review 节点和 edges 表达迭代意图，编译器负责结构化回路。详见 workflow_compiler.rs |

## 必须修复项汇总

| # | 严重度 | Phase | 问题 | 负责Agent |
|---|--------|-------|------|-----------|
| 1 | HIGH | P1 | 用户reject应重试而非Failed | backend-runtime |
| 2 | HIGH | P1 | `WaitingReview->PreCompleted`转移非法，reducer需补充或改路径 | backend-runtime |
| 3 | ~~MEDIUM~~ RESOLVED | P3 | ~~workflow_iteration.rs缺少单元测试~~ 已有测试覆盖 (workflow_iteration.rs:878) | backend-runtime |
