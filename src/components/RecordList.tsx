import { useMemo, useState } from "react";
import { formatDateTime } from "../rules";
import type { ExamRecord } from "../types";

interface Props {
  records: ExamRecord[];
  onEditDraft: (record: ExamRecord) => void;
}

type Filter = "all" | "saved" | "draft";

export function RecordList({ records, onEditDraft }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => {
    const list =
      filter === "all" ? records : records.filter((record) => record.status === filter);
    return [...list].sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  }, [records, filter]);

  const savedCount = records.filter((r) => r.status === "saved").length;
  const draftCount = records.filter((r) => r.status === "draft").length;

  return (
    <section className="panel records-panel">
      <div className="section-heading">
        <div>
          <p>本地留档</p>
          <h2>验光记录（{records.length}）</h2>
        </div>
        <div className="filter-tabs" role="tablist">
          <button
            type="button"
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            全部 {records.length}
          </button>
          <button
            type="button"
            className={filter === "saved" ? "active" : ""}
            onClick={() => setFilter("saved")}
          >
            已保存 {savedCount}
          </button>
          <button
            type="button"
            className={filter === "draft" ? "active" : ""}
            onClick={() => setFilter("draft")}
          >
            草稿 {draftCount}
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="empty-tip">暂无记录。已保存记录与草稿都会留在本机，重开页面仍可查询。</p>
      ) : (
        <div className="record-list">
          {visible.map((record, index) => (
            <details key={record.id} className="record-card">
              <summary className="record-summary">
                <div className="record-index">{String(index + 1).padStart(2, "0")}</div>
                <div className="record-main">
                  <h3>
                    {record.customerName}
                    {record.customerNo ? <em className="customer-no">{record.customerNo}</em> : null}
                  </h3>
                  <p>
                    {record.category} · 设备 {record.deviceId} · {formatDateTime(record.savedAt)}
                  </p>
                </div>
                <span className={`status-pill status-${record.status}`}>
                  {record.status === "saved" ? "已保存" : "草稿"}
                </span>
              </summary>
              <div className="record-detail">
                <dl>
                  <div>
                    <dt>球镜</dt>
                    <dd>{record.sphere || "—"}</dd>
                  </div>
                  <div>
                    <dt>柱镜</dt>
                    <dd>{record.cylinder || "—"}</dd>
                  </div>
                  <div>
                    <dt>轴位</dt>
                    <dd>{record.axis || "—"}</dd>
                  </div>
                  <div>
                    <dt>瞳距</dt>
                    <dd>{record.pd || "—"}</dd>
                  </div>
                  <div>
                    <dt>裸眼视力</dt>
                    <dd>{record.nakedVision || "—"}</dd>
                  </div>
                  <div>
                    <dt>矫正视力</dt>
                    <dd>{record.correctedVision || "—"}</dd>
                  </div>
                </dl>
                {record.note && <p className="record-note">备注：{record.note}</p>}
                <p className={`record-reason reason-${record.status}`}>{record.reason}</p>
                {record.status === "draft" && (
                  <button type="button" className="primary-action" onClick={() => onEditDraft(record)}>
                    重新校准设备后继续此草稿
                  </button>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
