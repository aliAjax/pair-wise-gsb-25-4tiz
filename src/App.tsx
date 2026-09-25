import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type { Calibration, ExamRecord } from "./domain/types";
import { deviceStatus, latestCalibrationByDevice } from "./domain/rules";
import { loadCalibrations, loadExams, saveCalibrations, saveExams } from "./domain/storage";
import { isSameDay } from "./domain/format";
import { CalibrationForm } from "./components/CalibrationForm";
import { DeviceStatusBoard } from "./components/DeviceStatusBoard";
import { ExamDesk } from "./components/ExamDesk";
import { RecordList } from "./components/RecordList";

const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const metricColors = ["status-info", "status-ok", "status-danger", "status-info"];

function App() {
  const [calibrations, setCalibrations] = useState<Calibration[]>(loadCalibrations);
  const [exams, setExams] = useState<ExamRecord[]>(loadExams);
  const [now, setNow] = useState(() => Date.now());

  // 本地留档：任何变更立即写入 localStorage，重开页面数据仍在
  useEffect(() => saveCalibrations(calibrations), [calibrations]);
  useEffect(() => saveExams(exams), [exams]);

  // 每 30 秒刷新当前时间，让校准两小时有效期自动失效
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const deviceIds = useMemo(
    () => [...latestCalibrationByDevice(calibrations).keys()],
    [calibrations]
  );

  const metrics = [
    {
      label: "今日校准",
      value: calibrations.filter((c) => isSameDay(c.calibratedAt, now)).length,
    },
    {
      label: "放行设备",
      value: deviceIds.filter((id) => deviceStatus(id, calibrations) === "released").length,
    },
    {
      label: "停用设备",
      value: deviceIds.filter((id) => deviceStatus(id, calibrations) === "suspended").length,
    },
    { label: "验光记录", value: exams.length },
  ];

  const addCalibration = (data: Omit<Calibration, "id">) =>
    setCalibrations((prev) => [...prev, { ...data, id: newId("cal") }]);

  const addExam = (data: Omit<ExamRecord, "id">) =>
    setExams((prev) => [...prev, { ...data, id: newId("exam") }]);

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-11 · 设备放行台</p>
          <h1>眼科验光记录</h1>
          <p className="subtitle">
            开工先用标准片校准验光仪，放行状态与顾客验光联动：偏差超限的设备自动停用、不能接新顾客，
            校准超过两小时或未通过检查时，验光只能保留草稿。
          </p>
        </div>
        <div className="stack-card">
          <span>放行规则</span>
          <strong>
            标准片球镜 / 柱镜任一偏差超过 0.12D 即停用，修好并重新校准通过后恢复；校准两小时内有效。
          </strong>
        </div>
      </section>

      <section className="metrics-grid">
        {metrics.map((metric, index) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <i className={metricColors[index % metricColors.length]} />
          </article>
        ))}
      </section>

      <section className="workspace">
        <CalibrationForm onAdd={addCalibration} />
        <DeviceStatusBoard calibrations={calibrations} now={now} />
      </section>

      <section className="workspace">
        <ExamDesk calibrations={calibrations} now={now} onSave={addExam} />
        <RecordList exams={exams} />
      </section>
    </main>
  );
}

export default App;
