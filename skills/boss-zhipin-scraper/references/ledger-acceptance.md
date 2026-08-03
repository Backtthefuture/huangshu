# 台账、检查点与验收案例

## 全局文件

```text
~/.boss-zhipin-scraper/ledger/job_ledger.jsonl
~/.boss-zhipin-scraper/ledger/batches.jsonl
```

保持旧字段兼容，新增字段允许为空。

## 岗位台账字段

保留：`job_key`、`job_id`、`canonical_url`、`title`、`company`、`location`、`salary`、`experience`、`education`、`source_query`、`first_seen_at`、`last_seen_at`、`last_batch_id`、`detail_status`、`screening_result`、`score`、`collection_method`。

新增建议字段：

- `jd_requirements`：完整 JD 提取结果；
- `score_breakdown`：逐项分数和证据；
- `tier_result`：A/B/C/待确认/排除；
- `hard_gate_result`：通过、失败或待核验；
- `risk_vetoes`：风险否决项；
- `outreach_authorization_id`：本批授权标识；
- `outreach_status`：not_authorized/eligible/sent/failed/unknown/skipped；
- `outreach_message`：实际消息；
- `outreach_at`：发送时间；
- `outreach_failure_reason`：失败原因。

## 批次字段

在旧字段基础上新增：

- `phase`：calibration/outreach/review；
- `calibration_cards`、`calibration_details`；
- `target_outreach_count`：用户确认的本批目标招呼数；
- `selected_tier`；
- `outreach_authorized`；
- `outreach_authorization_id`；
- `outreach_sent`、`outreach_failed`、`outreach_unknown`；
- `remaining_outreach_count`：`max(target_outreach_count - outreach_sent, 0)`；
- `pending_confirmation`；
- `external_actions`；
- `risk_control_triggered`。

校准阶段必须满足 `outreach_authorized=false` 且 `external_actions=0`。

`outreach_sent` 统计确认发送成功的唯一岗位，不统计消息条数。同一岗位即使有自动招呼语和补发消息，也只计 `1`；失败、`unknown`、重复、已沟通和跳过岗位计 `0`。

## 发送事务与恢复对账

每个发送动作必须独立提交：

```text
点击立即沟通
→ 读取最新UI并确认 sent/failed/unknown
→ 写 job_ledger.jsonl
→ 更新 batches.jsonl 的 sent/remaining
→ 追加触达审计.csv
→ 才能处理下一个岗位
```

任一写入失败时不得继续外部动作。恢复 `running` 或 `partial` 批次时，先比较 UI、岗位台账、批次检查点和触达审计；页面已发送而台账缺失时先补记，禁止重复发送。

## 当批输出

至少生成：

- `抓取台账.csv`；
- `候选评分.csv`；
- `触达审计.csv`；
- `本批报告.md`。

只有发生或尝试触达时才要求 `触达审计.csv` 有数据行；否则保留表头或在报告写“零外部动作”。

## 离线验收案例

1. 高匹配、通过档位、已授权：可发送；
2. 边缘分数：待确认，不发送；
3. 完整 JD 经验超上限：排除；
4. 硬性 AI/Agent 经历缺失：排除；
5. 薪资下限不足：排除；
6. 外派、驻场或纯销售：排除；
7. 列表与完整 JD 冲突：按完整 JD；
8. 已沟通过或状态不明：不重复发送；
9. 信息不足或未读完整 JD：待核验，不发送；
10. 验证码、掉线或安全页：保存并停止；
11. 校准阶段即使高分：不发送；
12. 未确认档位或模板：不发送。
13. 校准只发现 3 个达标岗位、目标招呼数为 20：继续搜索和读取新 JD，不得在 3 个后结束。
14. 用户未给招呼数：主动询问并建议 20，不得把校准样本量当作数量授权。
15. 用户批准平台默认招呼语：允许“立即沟通”直接发送，记录实际文案，不擅自补发自定义消息。
16. Computer Use 单次报告 Chrome 状态变化：全量刷新并核验；状态正常则继续，不标记 `partial`。
17. 刷新后仍是 BOSS-Agent、zhipin.com、已登录且无安全验证：恢复当前步骤，若动作结果不明先查发送结果再决定是否重试。
18. 用户明确接管，或刷新后出现登录失效、安全验证、非预期域名：保存检查点并停止。
19. 同一岗位自动招呼后又补发一条：消息数为2，`outreach_sent` 仍为1。
20. 页面显示已发送但批次仍为0：先补岗位台账、批次计数和触达审计，再处理下一岗。
21. 任一检查点写入失败：停止外部动作，不得累计多条后批量补记。
22. 目标17、已确认发送2、用户暂停：批次记 `partial`、`outreach_sent=2`、`remaining_outreach_count=15`；恢复时继续15，不重新发17。

验收时必须证明硬条件和风险否决优先于总分。
