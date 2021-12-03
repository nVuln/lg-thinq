import {default as V2, RotateSpeed} from './index';
import DeviceModel from '../../utils/DeviceModel';
import {AirState} from '../AirConditioner/v1';

export default class AirPurifierV1 extends V2 {
  public async setActive(value) {
    if (this.statusIsPowerOn && !!value) {
      return;
    }

    await this.ThinQ.thinq1DeviceControl(this.device, 'Operation', value ? '1' : '0');
  }

  public async setTargetAirPurifierState(value) {
    if (!this.statusIsPowerOn || (this.statusIsNormalMode && value === 'MANUAL')) {
      return;
    }

    await this.ThinQ.thinq1DeviceControl(this.device, 'OpMode', value ? '16' : '14');
  }

  public async setRotationSpeed(value) {
    if (!this.statusIsPowerOn || !this.statusIsNormalMode) {
      return;
    }

    const windStrength = parseInt(RotateSpeed[value]) || RotateSpeed.EXTRA;
    await this.ThinQ.thinq1DeviceControl(this.device, 'WindStrength', windStrength.toString());
  }

  public async setSwingMode(value) {
    if (!this.statusIsPowerOn || !this.statusIsNormalMode) {
      return;
    }

    await this.ThinQ.thinq1DeviceControl(this.device, 'CirculateDir', value ? '1' : '0');
  }

  public async setLightSignal(value) {
    if (!this.statusIsPowerOn) {
      return;
    }

    await this.ThinQ.thinq1DeviceControl(this.device, 'SignalLighting', value ? '1' : '0');
  }
}

export function AirPurifierState(deviceModel: DeviceModel, decodedMonitor) {
  const airState = AirState(deviceModel, decodedMonitor);

  airState['airState.operation'] = !!parseInt(decodedMonitor['Operation']);

  return airState;
}
