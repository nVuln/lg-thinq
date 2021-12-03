import AirConditioner, {FanSpeed} from './index';
import DeviceModel, {RangeValue} from '../../utils/DeviceModel';
import {loopupEnum} from '../../constants/helper';

export default class AirConditionerV1 extends AirConditioner {
  public async setActive(value) {
    const isOn = value ? 1 : 0;
    if (this.statusIsPowerOn && isOn) {
      return; // don't send same status
    }

    const op = isOn ? ACOperation.RIGHT_ON : ACOperation.OFF;
    const opValue = this.device.deviceModel.enumValue('Operation', op);

    this.ThinQ.thinq1DeviceControl(this.device, 'Operation', opValue).then(() => {
      this.emit('airState.operation', isOn);
    });
  }

  public async setTargetTemperature(value) {
    if (!this.statusIsPowerOn) {
      return;
    }

    const temperature = parseInt(value);
    if (temperature === this.targetTemperature) {
      return;
    }

    this.ThinQ.thinq1DeviceControl(this.device, 'TempCfg', temperature.toString()).then(() => {
      this.emit('airState.tempState.target', temperature);
    });
  }

  public async setFanSpeed(value) {
    if (!this.statusIsPowerOn) {
      return;
    }

    const windStrength = FanSpeed[value] || /* AUTO */ 8;
    this.ThinQ.thinq1DeviceControl(this.device, 'WindStrength', windStrength).then(() => {
      this.emit('airState.windStrength', windStrength);
    });
  }

  public async setOpMode(opMode) {
    return await this.ThinQ.thinq1DeviceControl(this.device, 'OpMode', opMode).then(() => {
      this.emit('airState.opMode', opMode);
    });
  }
}

export enum ACOperation {
  OFF = '@AC_MAIN_OPERATION_OFF_W',
  /** This one seems to mean "on" ? */
  RIGHT_ON = '@AC_MAIN_OPERATION_RIGHT_ON_W',
  LEFT_ON = '@AC_MAIN_OPERATION_LEFT_ON_W',
  ALL_ON = '@AC_MAIN_OPERATION_ALL_ON_W',
}

export function AirState(deviceModel: DeviceModel, decodedMonitor) {
  const airState = {
    'airState.opMode': parseInt(decodedMonitor['OpMode'] || '0') as number,
    'airState.operation': loopupEnum(deviceModel, decodedMonitor, 'Operation') !== ACOperation.OFF,
    'airState.tempState.current': parseInt(decodedMonitor['TempCur'] || '0') as number,
    'airState.tempState.target': parseInt(decodedMonitor['TempCfg'] || '0') as number,
    'airState.windStrength': parseInt(decodedMonitor['WindStrength'] || '0') as number,
    'airState.wDir.vStep': parseInt(decodedMonitor['WDirVStep'] || '0') as number,
    'airState.wDir.hStep': parseInt(decodedMonitor['WDirHStep'] || '0') as number,
    'airState.circulate.rotate': parseInt(decodedMonitor['CirculateDir']),
    'airState.lightingState.signal': parseInt(decodedMonitor['SignalLighting']),
  };

  if (deviceModel.value('TempCur')) {
    // eslint-disable-next-line max-len
    airState['airState.tempState.current'] = Math.max(airState['airState.tempState.current'], (deviceModel.value('TempCur') as RangeValue).min);
  }

  if (deviceModel.value('TempCfg')) {
    // eslint-disable-next-line max-len
    airState['airState.tempState.target'] = Math.max(airState['airState.tempState.target'], (deviceModel.value('TempCfg') as RangeValue).min);
  }

  if (decodedMonitor['TotalAirPolution']) {
    airState['airState.quality.overall'] = parseInt(decodedMonitor['TotalAirPolution']);
  }

  if (decodedMonitor['SensorMon']) {
    airState['airState.quality.sensorMon'] = parseInt(decodedMonitor['SensorMon']);
  }

  if (decodedMonitor['SensorPM1']) {
    airState['airState.quality.PM1'] = parseInt(decodedMonitor['SensorPM1']);
  }

  if (decodedMonitor['SensorPM2']) {
    airState['airState.quality.PM2'] = parseInt(decodedMonitor['SensorPM2']);
  }

  if (decodedMonitor['SensorPM10']) {
    airState['airState.quality.PM10'] = parseInt(decodedMonitor['SensorPM10']);
  }

  return airState;
}
