import type { GateResult } from "../rules";
import { formatAge, formatDateTime } from "../rules";
import type { Device } from "../types";

interface Props {
  devices: Device[];
  gates: Map<string, GateResult>;
  now: number;
  onRecalibrate: (deviceId: string) => void;
}

const GATE_CLASS: Record<GateResult["state"], string> = {
  released: "gate-released",
  expired: "gate-expired",
  stopped: "gate-stopped",
  uncalibrated: "gate-uncalibrated",
};

export function DeviceBoard({ devices, gates, now, onRecalibrate }: Props) {
  return (
    <section className="panel device-board">
      <div className="section-heading">
        <div>
          <p>放行看板</p>
          <h2>设备放行状态</h2>
        </div>
        <span className="board-hint">每 30 秒自动刷新校准时效</span>
      </div>

      {devices.length === 0 ? (
        <p className="empty-tip">还没有设备档案。开工时先在下方录入设备编号并完成标准片校准。</p>
      ) : (
        <div className="device-grid">
          {devices.map((device) => {
            const gate = gates.get(device.id);
            const state = gate?.state ?? "uncalibrated";
            const cal = gate?.calibration ?? null;
            return (
              <article key={device.id} className={`device-card ${GATE_CLASS[state]}`}>
                <header className="device-head">
                  <h3>{device.name}</h3>
                  <b className={`gate ${GATE_CLASS[state]}`}>{gate?.label ?? "未校准"}</b>
                </header>

                {cal ? (
                  <dl className="device-meta">
                    <div>
                      <dt>校准人</dt>
                      <dd>{cal.calibrator}</dd>
                    </div>
                    <div>
                      <dt>校准时刻</dt>
                      <dd>{formatDateTime(cal.calibratedAt)}</dd>
                    </div>
                    <div>
                      <dt>已过时长</dt>
                      <dd className={gate?.expired ? "text-danger" : ""}>
                        {formatAge(gate?.ageMs ?? now - new Date(cal.calibratedAt).getTime())}
                      </dd>
                    </div>
                    <div>
                      <dt>球/柱偏差</dt>
                      <dd>
                        {cal.sphereError.toFixed(2)}D / {cal.cylinderError.toFixed(2)}D
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="device-empty">今日尚无校准记录</p>
                )}

                {gate && gate.reasons.length > 0 && (
                  <ul className="gate-reasons">
                    {gate.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  className="recalibrate-btn"
                  onClick={() => onRecalibrate(device.id)}
                >
                  {state === "stopped" ? "维修后重新校准" : "重新校准"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
