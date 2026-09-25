import { useEffect, useMemo, useState } from "react";
import { evaluateDevice } from "../rules";
import type { Calibration, Device, ExamRecord } from "../types";

const CATEGORIES = ["儿童", "成人", "渐进片", "角膜塑形镜", "散光复查"];

const FIELDS: Array<{ key: keyof FormShape; label: string; placeholder?: string }> = [
  { key: "sphere", label: "球镜(D)", placeholder: "如 -2.75" },
  { key: "cylinder", label: "柱镜(D)", placeholder: "如 -0.75" },
  { key: "axis", label: "轴位(°)", placeholder: "如 180" },
  { key: "pd", label: "瞳距(mm)", placeholder: "如 62" },
  { key: "nakedVision", label: "裸眼视力", placeholder: "如 0.6" },
  { key: "correctedVision", label: "矫正视力", placeholder: "如 1.0" },
];

interface FormShape {
  customerName: string;
  customerNo: string;
  category: string;
  sphere: string;
  cylinder: string;
  axis: string;
  pd: string;
  nakedVision: string;
  correctedVision: string;
  note: string;
  deviceId: string;
}

const emptyForm: FormShape = {
  customerName: "",
  customerNo: "",
  category: CATEGORIES[0],
  sphere: "",
  cylinder: "",
  axis: "",
  pd: "",
  nakedVision: "",
  correctedVision: "",
  note: "",
  deviceId: "",
};

interface Props {
  devices: Device[];
  calibrations: Calibration[];
  now: number;
  /** 正在编辑的草稿 */
  editing: ExamRecord | null;
  onCancelEdit: () => void;
  /** 保存：带 id 表示更新原草稿，不带表示新增 */
  onSave: (record: Omit<ExamRecord, "id" | "savedAt"> & { id?: string }) => void;
}

export function ExamForm({ devices, calibrations, now, editing, onCancelEdit, onSave }: Props) {
  const [form, setForm] = useState<FormShape>(emptyForm);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string[] | null>(null);

  // 从记录列表载入草稿继续编辑
  useEffect(() => {
    if (!editing) return;
    setRecordId(editing.id);
    setForm({
      customerName: editing.customerName,
      customerNo: editing.customerNo,
      category: editing.category,
      sphere: editing.sphere,
      cylinder: editing.cylinder,
      axis: editing.axis,
      pd: editing.pd,
      nakedVision: editing.nakedVision,
      correctedVision: editing.correctedVision,
      note: editing.note,
      deviceId: editing.deviceId,
    });
    setFeedback([`正在继续编辑草稿（原原因：${editing.reason}）`]);
  }, [editing]);

  const set = (key: keyof FormShape) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === form.deviceId),
    [devices, form.deviceId]
  );
  const gate = selectedDevice ? evaluateDevice(selectedDevice, calibrations, now) : null;

  function reset() {
    setForm(emptyForm);
    setRecordId(null);
    setFeedback(null);
  }

  function handleSave() {
    if (!form.customerName.trim()) {
      setFeedback(["请填写顾客姓名"]);
      return;
    }
    if (!form.deviceId || !selectedDevice) {
      setFeedback(["请先选择验光设备"]);
      return;
    }

    const passed = gate?.state === "released";
    const payload = {
      ...form,
      customerName: form.customerName.trim(),
      customerNo: form.customerNo.trim(),
      ...(recordId ? { id: recordId } : {}),
    };
    if (passed) {
      onSave({ ...payload, status: "saved", reason: `设备 ${selectedDevice.id} 校准有效，放行通过` });
      setFeedback(null);
      reset();
      return;
    }

    // 校准超过两小时 / 设备停用 / 未校准：只能留草稿
    const reasons = gate && gate.reasons.length > 0 ? gate.reasons : ["设备未通过放行检查"];
    onSave({ ...payload, status: "draft", reason: reasons.join("；") });
    // 保留表单内容便于继续修改，但后续保存更新同一条草稿，不产生重复
    setFeedback(["设备未通过放行，本条已保存为草稿：", ...reasons]);
  }

  return (
    <section className="panel exam-form">
      <div className="section-heading">
        <div>
          <p>验光记录</p>
          <h2>{editing ? "继续编辑草稿" : "新增顾客验光"}</h2>
        </div>
        {editing && (
          <button type="button" onClick={onCancelEdit}>
            放弃编辑
          </button>
        )}
      </div>

      <div className="field-pair">
        <label className="field">
          <span>顾客姓名 *</span>
          <input value={form.customerName} onChange={set("customerName")} placeholder="姓名" />
        </label>
        <label className="field">
          <span>顾客编号</span>
          <input value={form.customerNo} onChange={set("customerNo")} placeholder="可空" />
        </label>
      </div>

      <label className="field">
        <span>分类</span>
        <select value={form.category} onChange={set("category")}>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>

      <div className="field-grid">
        {FIELDS.map(({ key, label, placeholder }) => (
          <label className="field" key={key}>
            <span>{label}</span>
            <input value={form[key]} onChange={set(key)} placeholder={placeholder} />
          </label>
        ))}
      </div>

      <label className="field">
        <span>备注</span>
        <textarea rows={2} value={form.note} onChange={set("note")} placeholder="处方/复查说明" />
      </label>

      <label className="field device-select-field">
        <span>验光设备 *（停用或校准超过两小时只能留草稿）</span>
        <select value={form.deviceId} onChange={set("deviceId")}>
          <option value="">请选择设备</option>
          {devices.map((device) => {
            // 停用设备不能接新顾客：下拉中直接不可选
            const deviceGate = evaluateDevice(device, calibrations, now);
            const disabled = deviceGate.state === "stopped" || deviceGate.state === "uncalibrated";
            return (
              <option key={device.id} value={device.id} disabled={disabled}>
                {device.id}（{deviceGate.label}
                {disabled ? "，不可接新顾客" : ""}）
              </option>
            );
          })}
        </select>
      </label>

      {gate && (
        <div className={`save-gate save-gate-${gate.state}`}>
          <b>{gate.label}</b>
          {gate.reasons.length > 0 ? (
            <ul>
              {gate.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : (
            <span>校准在两小时有效期内，检查结果合格，可以正式保存。</span>
          )}
        </div>
      )}

      {feedback && (
        <div className={`save-feedback ${feedback.length ? "" : ""}`}>
          {feedback.map((line, index) =>
            index === 0 ? (
              <p key={line} className="feedback-title">
                {line}
              </p>
            ) : (
              <p key={line}>· {line}</p>
            )
          )}
        </div>
      )}

      <div className="form-actions">
        <button type="button" onClick={reset}>
          清空
        </button>
        <button type="button" className="primary-action" onClick={handleSave}>
          {gate?.state === "released" ? "正式保存" : "保存（未通过则留草稿）"}
        </button>
      </div>
    </section>
  );
}
