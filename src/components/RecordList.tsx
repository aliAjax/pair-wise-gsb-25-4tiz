import { useState } from "react";
import type { ExamRecord } from "../domain/types";
import { formatDateTime, formatDiopter } from "../domain/format";

interface Props {
  exams: ExamRecord[];
}

const filters = [
  { key: "all", label: "全部" },
  { key: "saved", label: "已保存" },
  { key: "draft", label: "草稿" },
] as const;

type FilterKey = (typeof filters)[number]["key"];

/** 验光记录列表：已保存与草稿都可查，停用设备的历史记录仍然保留 */
export function RecordList({ exams }: Props) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const visible = exams
    .filter((exam) => filter === "all" || exam.status === filter)
    .sort((a, b) => b.savedAt - a.savedAt);

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>顾客数据</p>
          <h2>验光记录</h2>
        </div>
        <div className="filter-row">
          {filters.map((f) => (
            <button
              key={f.key}
              className={filter === f.key ? "active" : ""}
              onClick={() => setFilter(f.key)}
            >
              {f.label} {exams.filter((e) => f.key === "all" || e.status === f.key).length}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="empty-state">暂无记录。</p>
      ) : (
        <div className="record-list">
          {visible.map((exam, index) => (
            <article key={exam.id} className={`record-card ${exam.status}`}>
              <div className="record-index">{String(index + 1).padStart(2, "0")}</div>
              <div>
                <h3>
                  {exam.patientName}{" "}
                  <span className={exam.status === "saved" ? "badge badge-ok" : "badge badge-muted"}>
                    {exam.status === "saved" ? "已保存" : "草稿"}
                  </span>
                </h3>
                <p>
                  设备 {exam.deviceId} · 球镜 {formatDiopter(exam.sphere)} · 柱镜{" "}
                  {formatDiopter(exam.cylinder)} · 轴位 {exam.axis}° ·{" "}
                  {formatDateTime(exam.savedAt)}
                </p>
                {exam.blockReason && (
                  <p className="record-reason">未通过放行检查：{exam.blockReason}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
