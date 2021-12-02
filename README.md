# LG ThinQ - API client

A plugin for controlling/monitoring LG ThinQ device via their ThinQ platform.

⚠️ This library works with v2 of the LG ThinQ API. But some v1 device may backward compatible, please check table [Implementation Status](#implementation-status) below.

A plugin for interacting with the "LG ThinQ" system, which can control new LG smart device. API used in this plugin is not official, I reversed from their "LG ThinQ" mobile app.

## Installation

```
npm install lg-thinq
```

## Implementation Status

| *Device* | *Implementation* | *Status* | *Control* | *Thinq2* | *Thinq1* |
| --- | --- | --- | --- | --- | --- |
| Refrigerator | ✔️ | ✔️ | ✔️ | ✔️ | ✔️ |
| Air Purifier | ✔️ | ✔️ | ✔️ | ✔️ | ✔️ |
| Washer & Dryer | ✔️ | ✔️ | 🚫 | ✔️ | ✔️ |
| Dishwasher | ✔️ | ✔️ | ✔️ | ✔️ | 🚫 |
| Dehumidifier | ✔️ | ✔️ | ⚠️ | ✔️ | 🚫 |
| AC | ✔️ | ✔️ | ✔️ | ✔️ | ✔️ |

for more device support please open issue request.

## Support

If you would like to report a bug, please [open an issue](https://github.com/nVuln/lg-thinq/issues/new/choose).
