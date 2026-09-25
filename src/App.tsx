import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import { CalibrationForm, type CalibrationInput } from "./components/CalibrationForm";
import { DeviceBoard } from "./components/DeviceBoard";
import { ExamForm } from "./components/ExamForm";
import { RecordList } from "./components/RecordList";
import { evaluateDevice, judgeCalibration } from "./rules";
import { loadArchive, makeId, saveArchive } from "./storage";
import type { Archive, Calibration, Device, ExamRecord } from "./types";

const PROJECT = {
  id: "hxwl-11",
  title: "设备放行台 · 眼科验光记录",
  subtitle: "开工标准片校准放行，偏差超 0.12D 立即停用；校准两小时有效，未通过只能留草稿",
};

function App() {
  const [archive, setArchive] = useState<Archive>(() => loadArchive());
  // 30 秒一跳，校准超过两小时后看板自动转为过期
  const [now, setNow] = useState(() => Date.now());
  const [presetDeviceId, setPresetDeviceId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<ExamRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    saveArchive(archive);
  }, [archive]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const gates = useMemo(() => {
    const map = new Map<string, ReturnType<typeof evaluateDevice>>();
    archive.devices.forEach((device) => {
      map.set(device.id, evaluateDevice(device, archive.calibrations, now));
    });
    return map;
  }, [archive.devices, archive.calibrations, now]);

  const stats = useMemo(() => {
    const released = [...gates.values()].filter((gate) => gate.state === "released").length;
    const stopped = [...gates.values()].filter((gate) => gate.state === "stopped").length;
    const drafts = archive.records.filter((record) => record.status === "draft").length;
    return { total: archive.devices.length, released, stopped, drafts };
  }, [gates, archive.records]);

  function handleCalibration(input: CalibrationInput, passed: boolean) {
    const { sphereError, cylinderError } = judgeCalibration(
      input.standardSphere,
      input.measuredSphere,
      input.standardCylinder,
      input.measuredCylinder
    );
    const calibration: Calibration = {
      id: makeId("cal"),
      deviceId: input.deviceId,
      standardSphere: input.standardSphere,
      standardCylinder: input.standardCylinder,
      measuredSphere: input.measuredSphere,
      measuredCylinder: input.measuredCylinder,
      sphereError,
      cylinderError,
      calibrator: input.calibrator,
      calibratedAt: input.calibratedAt,
      passed,
    };

    setArchive((prev) => {
      const exists = prev.devices.some((device) => device.id === input.deviceId);
      const devices: Device[] = exists
        ? prev.devices.map((device) =>
            device.id === input.deviceId
              ? { ...device, latestCalibrationId: calibration.id }
              : device
          )
        : [
            ...prev.devices,
            { id: input.deviceId, name: input.deviceId, latestCalibrationId: calibration.id },
          ];
      return {
        ...prev,
        devices,
        calibrations: [...prev.calibrations, calibration],
      };
    });

    // 停用设备必须修好后重新校准：通过即恢复放行，不通过保持停用
    setNotice(
      passed
        ? `设备 ${input.deviceId} 标准片检查合格，已放行（两小时内有效）。`
        : `设备 ${input.deviceId} 偏差超限，已停用。请维修后重新校准，期间不能接新顾客。`
    );
  }

  function handleSave(record: Omit<ExamRecord, "id" | "savedAt"> & { id?: string }) {
    setArchive((prev) => {
      // 带 id（首次存草稿后再次保存，或从列表续编草稿）：更新原条目，不产生重复
      if (record.id && prev.records.some((item) => item.id === record.id)) {
        const { id, ...rest } = record;
        return {
          ...prev,
          records: prev.records.map((item) =>
            item.id === id ? { ...item, ...rest, savedAt: new Date().toISOString() } : item
          ),
        };
      }
      const newRecord: ExamRecord = {
        ...record,
        id: makeId("rec"),
        savedAt: new Date().toISOString(),
      };
      return { ...prev, records: [...prev.records, newRecord] };
    });
    setEditingDraft(null);
    if (record.status === "saved") {
      setNotice(`顾客 ${record.customerName} 的验光记录已正式保存并留档。`);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">{PROJECT.id} · 设备放行台</p>
          <h1>{PROJECT.title}</h1>
          <p className="subtitle">{PROJECT.subtitle}</p>
          {notice && (
            <p className="hero-notice" role="status">
              {notice}
            </p>
          )}
        </div>
        <div className="stack-card">
          <span>今日放行概览</span>
          <strong>
            放行 {stats.released} / 设备 {stats.total} 台
          </strong>
          <strong className={stats.stopped > 0 ? "text-danger" : ""}>
            停用 {stats.stopped} 台
          </strong>
          <strong className={stats.drafts > 0 ? "text-warn" : ""}>
            待处理草稿 {stats.drafts} 条
          </strong>
        </div>
      </section>

      <section className="metrics-grid">
        <article className="metric-card">
          <span>在册设备</span>
          <strong>{stats.total}</strong>
          <i className="status-ok" />
        </article>
        <article className="metric-card">
          <span>放行中</span>
          <strong>{stats.released}</strong>
          <i className="status-ok" />
        </article>
        <article className="metric-card">
          <span>停用设备</span>
          <strong>{stats.stopped}</strong>
          <i className="status-danger" />
        </article>
        <article className="metric-card">
          <span>未通过草稿</span>
          <strong>{stats.drafts}</strong>
          <i className="status-watch" />
        </article>
      </section>

      <DeviceBoard
        devices={archive.devices}
        gates={gates}
        now={now}
        onRecalibrate={(deviceId) => {
          setPresetDeviceId(deviceId);
          document
            .querySelector(".calibrate-form")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      <section className="workspace workspace-split">
        <CalibrationForm
          devices={archive.devices}
          presetDeviceId={presetDeviceId}
          onPresetConsumed={() => setPresetDeviceId(null)}
          onSubmit={handleCalibration}
        />
        <ExamForm
          devices={archive.devices}
          calibrations={archive.calibrations}
          now={now}
          editing={editingDraft}
          onCancelEdit={() => setEditingDraft(null)}
          onSave={handleSave}
        />
      </section>

      <RecordList
        records={archive.records}
        onEditDraft={(record) => {
          setEditingDraft(record);
          document
            .querySelector(".exam-form")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      <footer className="page-footer">
        判定规则：球镜或柱镜任一偏差超过 0.12D 停用；校准有效期两小时。所有校准资料与验光记录仅留存在本机浏览器，重开页面不丢失。
      </footer>
    </main>
  );
}

export default App;
