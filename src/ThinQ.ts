import {API} from './lib/API';
import Device from './utils/Device';
import {PlatformType} from './constants';
import * as uuid from 'uuid';
import DeviceModel from './utils/DeviceModel';
import {MonitorError, NotConnectedError} from './utils/errors';
import Logger from './utils/Logger';
import Mqtt from './lib/Mqtt';
import Factory from './devices/Factory';
import BaseDevice from './devices/BaseDevice';

export type WorkId = typeof uuid['v4'];

export default class ThinQ {
  protected api: API;
  protected workIds: Record<string, WorkId> = {};
  protected deviceModel: Record<string, DeviceModel> = {};

  constructor(
    public log: Logger = new Logger(),
    public config: any = {},
  ) {
    this.config = Object.assign({
      country: 'US',
      language: 'en-US',
      username: '',
      password: '',
    }, config);

    this.api = new API(this.config.country, this.config.language);
    this.api.logger = log;
    this.api.httpClient.interceptors.response.use(response => {
      this.log.debug('[request]', response.config.method, response.config.url);
      return response;
    }, err => {
      return Promise.reject(err);
    });

    this.api.setUsernamePassword(this.config.username, this.config.password);
  }

  public async devices() {
    const listDevices = await this.api.getListDevices().catch(() => {
      return [];
    });

    const listLgDevices: BaseDevice[] = [];
    for (let i=0; i<listDevices.length; i++) {
      const device = new Device(listDevices[i]);
      const thinqDevice = Factory.make(device);
      if (thinqDevice) {
        listLgDevices.push(new thinqDevice(this, new Logger(this.log.log, device.name), device));
      }
    }

    return listLgDevices;
  }

  public async setup(lgDevice: BaseDevice) {
    const device: Device = lgDevice.device;
    // load device model
    device.deviceModel = await this.loadDeviceModel(device);

    if (device.deviceModel.data.Monitoring === undefined
      && device.deviceModel.data.MonitoringValue === undefined
      && device.deviceModel.data.Value === undefined) {
      this.log.warn('['+device.name+'] This device may not "smart" device. Ignore it!');
    }

    if (device.platform === PlatformType.ThinQ1) {
      // register work uuid
      await this.registerWorkId(lgDevice);

      // transform thinq1 device
      const deviceWithSnapshot = Factory.transform(device, null);
      device.snapshot = deviceWithSnapshot.snapshot;
    }

    lgDevice.device = device;

    return true;
  }

  public async unregister(lgDevice: BaseDevice) {
    const device: Device = lgDevice.device;
    if (device.platform === PlatformType.ThinQ1 && device.id in this.workIds && this.workIds[device.id] !== null) {
      try {
        await this.api.sendMonitorCommand(device.id, 'Stop', this.workIds[device.id]);
      } catch (err) {
        //this.log.error(err);
      }

      delete this.workIds[device.id];
    }
  }

  protected async registerWorkId(lgDevice: BaseDevice) {
    const device: Device = lgDevice.device;
    return this.workIds[device.id] = await this.api.sendMonitorCommand(device.id, 'Start', uuid.v4()).then(data => {
      if (data !== undefined && 'workId' in data) {
        return data.workId;
      }

      return null;
    });
  }

  protected async loadDeviceModel(device: Device) {
    const deviceModel = await this.api.httpClient.get(device.data.modelJsonUri).then(res => res.data);
    return this.deviceModel[device.id] = device.deviceModel = new DeviceModel(deviceModel);
  }

  public async pollMonitor(lgDevice: BaseDevice) {
    const device: Device = lgDevice.device;
    device.deviceModel = await this.loadDeviceModel(device);

    if (device.platform === PlatformType.ThinQ1) {
      let result: any = null;
      // check if work id is registered
      if (!(device.id in this.workIds) || this.workIds[device.id] === null) {
        // register work id
        const workId = await this.registerWorkId(lgDevice);
        if (workId === undefined || workId === null) { // device may not connected
          return Factory.transform(device, result);
        }
      }

      try {
        result = await this.api.getMonitorResult(device.id, this.workIds[device.id]);
      } catch (err) {
        if (err instanceof MonitorError) {
          // restart monitor and try again
          await this.unregister(lgDevice);
          await this.registerWorkId(lgDevice);

          // retry 1 times
          try {
            result = await this.api.getMonitorResult(device.id, this.workIds[device.id]);
          } catch (err) {
            // stop it
            // await this.stopMonitor(device);
          }
        } else if (err instanceof NotConnectedError) {
          // device not online
          // this.log.debug('Device not connected: ', device.toString());
        } else {
          throw err;
        }
      }

      return Factory.transform(device, result);
    }

    return device;
  }

  public thinq1DeviceControl(device: Device, key: string, value: any) {
    const data = Factory.prepareControlData(device, key, value);

    return this.api.thinq1PostRequest('rti/rtiControl', data).catch(err => {
      this.log.error('Unknown Error: ', err);
    });
  }

  public deviceControl(device: Device, values: Record<string, any>, command: 'Set' | 'Operation' = 'Set', ctrlKey = 'basicCtrl') {
    return this.api.sendCommandToDevice(device.id, values, command, ctrlKey).catch(err => {
      // submitted same value
      if (err.response?.data?.resultCode === '0103') {
        return false;
      }

      this.log.error('Unknown Error: ', err.response);
    });
  }

  public async registerMQTTListener(keyPair, CSR, callback: (data: any) => void) {
    const delayMs = ms => new Promise(res => setTimeout(res, ms));

    let tried = 5;
    while(tried > 0) {
      try {
        await this._registerMQTTListener(keyPair, CSR, callback);
        return;
      } catch (err) {
        tried--;
        this.log.debug('Cannot start MQTT, retrying in 5s.');
        this.log.debug('mqtt err:', err);
        await delayMs(5000);
      }
    }

    this.log.error('Cannot start MQTT!');
  }

  protected async _registerMQTTListener(keys, csr, callback: (data: any) => void) {
    const route = await this.api.getRequest('https://common.lgthinq.com/route').then(data => data.result);

    const submitCSR = async () => {
      await this.api.postRequest('service/users/client', {});
      return await this.api.postRequest('service/users/client/certificate', {
        csr: csr.replace(/-----(BEGIN|END) CERTIFICATE REQUEST-----/g, '').replace(/(\r\n|\r|\n)/g, ''),
      }).then(data => data.result);
    };

    const connectToMqtt = async () => {
      // submit csr
      const certificate = await submitCSR();

      this.log.debug('open mqtt connection to', route.mqttServer);
      const mqtt = new Mqtt(route.mqttServer, this.log, {
        privateKey: Buffer.from(keys.privateKey, 'utf-8'),
        clientCert: Buffer.from(certificate.certificatePem, 'utf-8'),
        clientId: this.api.client_id,
      });
      mqtt.on('message', (json) => {
        callback(json);
      });
      mqtt.on('offline', () => {
        setTimeout(async () => {
          await connectToMqtt();
        }, 60000);
      });

      await mqtt.connect(certificate.subscriptions);
    };

    // first call
    await connectToMqtt();
  }

  public async isReady() {
    await this.api.ready();
  }
}
