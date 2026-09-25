import type { Calibration, DeviceStatus } from "../domain/types";
import {
  CALIBRATION_VALID_MS,
  isCalibrationFresh,
  isCalibrationPassing,
  isDeviationOver,
  latestCalibrationByDevice,
} from "../domain/rules";
import { formatDateTime, formatDiopter, formatSigned, formatTime } from "../domain/format";

interface Props {
  calibrations: Calibration[];
  now: number;
}

const statusMeta: Record<DeviceStatus, { label: string; className: string }> = {
  released: { label: "放行中", className: "badge badge-ok" },
  suspended: { label: "停用", className: "badge badge-danger" },
  unchecked: { label: "未校准", className: "badge badge-muted" },
};

/** 设备放行台：按设备展示最近一次校准结果与放行状态 */
export function DeviceStatusBoard({ calibrations, now }: Props) {
  const devices = [...latestCalibrationByDevice(calibrations).entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>设备放行台</p>
          <h2>放行状态</h2>
        </div>
      </div>
      {devices.length === 0 ? (
        <p className="empty-state">暂无校准记录，请先在左侧录入开工校准。</p>
      ) : (
        <div className="device-grid">
          {devices.map(([deviceId, latest]) => {
            const passing = isCalibrationPassing(latest);
            const fresh = isCalibrationFresh(latest, now);
            const status: DeviceStatus = passing ? "released" : "suspended";
            const sphDiff = latest.measuredSphere - latest.standardSphere;
            const cylDiff = latest.measuredCylinder - latest.standardCylinder;
            return (
              <article key={deviceId} className={`device-card ${status}`}>
                <div className="device-head">
                  <h3>{deviceId}</h3>
                  <div className="badge-row">
                    <span className={statusMeta[status].className}>
                      {statusMeta[status].label}
                    </span>
                    {passing && !fresh && <span className="badge badge-warn">待复校</span>}
                  </div>
                </div>
                <div className="device-meta">
                  <span>
                    校准人 <b>{latest.operator}</b>
                  </span>
                  <span>
                    校准时刻 <b>{formatDateTime(latest.calibratedAt)}</b>
                  </span>
                  <span>
                    标准片{" "}
                    <b>
                      球镜 {formatDiopter(latest.standardSphere)} · 柱镜{" "}
                      {formatDiopter(latest.standardCylinder)}
                    </b>
                  </span>
                  <span>
                    实测{" "}
                    <b>
                      球镜 {formatDiopter(latest.measuredSphere)} · 柱镜{" "}
                      {formatDiopter(latest.measuredCylinder)}
                    </b>
                  </span>
                  <span>
                    球镜偏差{" "}
                    <b className={isDeviationOver(sphDiff) ? "dev-over" : ""}>
                      {formatSigned(sphDiff)}
                    </b>
                  </span>
                  <span>
                    柱镜偏差{" "}
                    <b className={isDeviationOver(cylDiff) ? "dev-over" : ""}>
                      {formatSigned(cylDiff)}
                    </b>
                  </span>
                  {passing && (
                    <span>
                      有效期至 <b>{formatTime(latest.calibratedAt + CALIBRATION_VALID_MS)}</b>
                    </span>
                  )}
                </div>
                {!passing && (
                  <p className="device-note danger">
                    标准片偏差超过 0.12D，设备停用，不能接新顾客；修好并重新校准通过后自动恢复放行。
                  </p>
                )}
                {passing && !fresh && (
                  <p className="device-note warn">
                    校准已超过两小时，保存验光前需重新校准，否则只能留草稿。
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
