import * as uuid from 'uuid';
import Device from '../utils/Device';
import AirPurifier from './AirPurifier';
import {PlatformType} from '../constants';
import WasherDryerV1, {WasherDryerState} from './WasherDryer/v1';
import AirPurifierV1, {AirPurifierState} from './AirPurifier/v1';
import AirConditionerV1, {AirState} from './AirConditioner/v1';
import RefrigeratorV1, {RefState} from './Refrigerator/v1';
import Refrigerator from './Refrigerator';
import WasherDryer from './WasherDryer';
import AirConditioner from './AirConditioner';
import Dishwasher from './Dishwasher';
import Dehumidifier from './Dehumidifier';

export default class Factory {
  public static make(device: Device) {
    if (device.platform === PlatformType.ThinQ1) {
      switch (device.type) {
        case 'DRYER':
        case 'WASHER': return WasherDryerV1;
        case 'AC': return AirConditionerV1;
        case 'REFRIGERATOR': return RefrigeratorV1;
        case 'AIR_PURIFIER': return AirPurifierV1;
      }

      return null;
    }

    // thinq2
    switch (device.type) {
      case 'AIR_PURIFIER': return AirPurifier;
      case 'REFRIGERATOR': return Refrigerator;
      case 'WASHER':
      case 'WASHER_NEW':
      case 'WASH_TOWER':
      case 'DRYER':
        return WasherDryer;
      case 'DISHWASHER': return Dishwasher;
      case 'DEHUMIDIFIER': return Dehumidifier;
      case 'AC': return AirConditioner;
    }

    return null;
  }

  /**
   * transform device from thinq1 to thinq2 compatible (with snapshot data)
   */
  public static transform(device: Device, monitorData) {
    const decodedMonitor = device.deviceModel.decodeMonitor(monitorData || {});

    switch (device.type) {
      case 'DRYER':
      case 'WASHER':
        device.data.snapshot = WasherDryerState(device.deviceModel, decodedMonitor);
        break;
      case 'AIR_PURIFIER':
        device.data.snapshot = AirPurifierState(device.deviceModel, decodedMonitor);
        break;
      case 'AC':
        device.data.snapshot = AirState(device.deviceModel, decodedMonitor);
        break;
      case 'REFRIGERATOR':
        device.data.snapshot = RefState(device.deviceModel, decodedMonitor);
        break;
      default:
        // return original device data if not supported
        return device;
    }

    if (device.data.snapshot) {
      if (monitorData) {
        // mark device online to perform update
        device.data.online = true;
        device.data.snapshot.online = true;
      }

      device.data.snapshot.raw = monitorData === null ? null : decodedMonitor;
    }

    return device;
  }

  public static prepareControlData(device: Device, key: string, value: string) {
    const data: any = {
      cmd: 'Control',
      cmdOpt: 'Set',
      deviceId: device.id,
      workId: uuid.v4(),
    };

    if (device.deviceModel.data.ControlWifi?.type === 'BINARY(BYTE)') {
      const sampleData = device.deviceModel.data.ControlWifi?.action?.SetControl?.data || '[]';
      const decodedMonitor = device.snapshot.raw || {};
      decodedMonitor[key] = value;
      // build data array of byte
      const byteArray = new Uint8Array(JSON.parse(Object.keys(decodedMonitor).reduce((prev, key) => {
        return prev.replace(new RegExp('{{'+key+'}}', 'g'), parseInt(decodedMonitor[key] || '0'));
      }, sampleData)));
      Object.assign(data, {
        value: 'ControlData',
        data: Buffer.from(String.fromCharCode(...byteArray)).toString('base64'),
        format: 'B64',
      });
    } else {
      data.value = {
        [key]: value,
      };
      data.data = '';
    }

    return data;
  }
}
