

/*
 * Copyright 2020 Michael Friedel
 * Modifieed 2025 by ValkyrieOnWater for fixes.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

module.exports = function (app) {
  var plugin = {};
  var socket;

  plugin.id = 'signalk-tempest';
  plugin.name = 'SignalK Tempest';
  plugin.description = 'This plugin allows you to receive data from the Weatherflow Tempest weather station';

  function station2sealevel(pSta, elev) {
    const ys = 0.0065
    const g = 9.80665
    const rd = 287.05
    const p1 = (rd*ys)/g
    const p2 = g/(rd*ys)
    return pSta * Math.pow(1 + Math.pow(1013.25/pSta,p1) * ((ys*elev)/288.15),p2)
  }
  function degrees2radians(d) {
    return (Math.round(d*0.01745*100)/100);
  }

  plugin.start = function (options, restartPlugin) {
    var dgram = require('dgram');
    socket = dgram.createSocket('udp4');

    socket.on('listening', function () {
      socket.setBroadcast(true);
      socket.addMembership('239.255.255.250');
    });
    socket.on('message', function (message, remote) {
      var devices = {};
      var packet = JSON.parse(message)
      // Decode messages.. and add to values
app.debug(packet);

//      var ts = new Date(parseInt(packet.timestamp)*1000);
var ts  = new Date(Date.now());
     dev = {
          values: [],
          source: { label: 'UDP239.255.255.250',
            type: 'TempestHub',
            'src': packet.serial_number,
            'msg': packet.type
          },
          timestamp: ts.toISOString()
      }
      if ('hub_sn' in packet) {
        dev.source[packet.serial_number] = {'hub': packet.hub_sn, 'msg': packet.type}
      }


      if (packet.type.localeCompare('obs_st')==0) {
        dev.values.push({ path: 'environment.outside.pressure', value: parseFloat(packet.obs[0][6])*100 });
        dev.values.push({ path: 'environment.outside.temperature', value: parseFloat(packet.obs[0][7])+273});
        dev.values.push({ path: 'environment.outside.relativeHumidity', value: parseFloat(packet.obs[0][8])});
        dev.values.push({ path: 'environment.outside.illuminance', value: parseFloat(packet.obs[0][9])});
        dev.values.push({ path: 'environment.outside.uv', value: parseFloat(packet.obs[0][10])});
        dev.values.push({ path: 'environment.outside.solar', value: parseFloat(packet.obs[0][11])});
        dev.values.push({ path: 'environment.outside.lightning.distance', value: parseFloat(packet.obs[0][14])});
        dev.values.push({ path: 'environment.outside.lightning.strikes', value: parseFloat(packet.obs[0][15])});

        dev.values.push({ path: 'environment.outside.wind.lull', value: parseFloat(packet.obs[0][1])});
        dev.values.push({ path: 'environment.outside.wind.gusts', value: parseFloat(packet.obs[0][3])});
        dev.values.push({ path: 'environment.outside.wind.avg', value: parseFloat(packet.obs[0][2])});
        var wd = parseFloat(packet.obs[0][4]);
        if (wd > 180) { wd -= 360; }
        dev. values.push({ path: 'environment.outside.wind.angle', value: degrees2radians(wd)});
        dev.values.push({ path: 'environment.outside.rain', value: parseFloat(packet.obs[0][12])});
      }
      else if (packet.type.localeCompare('rapid_wind')==0) {
        var wd = parseFloat(packet.ob[2]);
        if (wd > 180) { wd -= 360; }
        dev.values.push({ path: 'environment.wind.angleApparent', value: degrees2radians(wd)});
        dev.values.push({ path: 'environment.wind.speedApparent', value: parseFloat(packet.ob[1])});
      }
      else if (packet.type.localeCompare('evt_strike')==0) {
        dev.values.push({ path: 'environment.outside.lightning.strike.timestamp', value: parseInt(packet.evt[0])});
        dev.values.push({ path: 'environment.outside.lightning.strike.distance', value: parseInt(packet.evt[1])});
        dev.values.push({ path: 'environment.outside.lightning.strike.energy', value: parseInt(packet.evt[2])});
      }
      else if (packet.type.localeCompare('evt_precip')==0) {
        dev.values.push({ path: 'environment.outside.rain_event', value: parseInt(packet.evt[0])});
      }
      else if  (packet.type.localeCompare('device_status')==0) {
        dev.values.push({ path: 'network.tempest.hub', value: packet.hub_sn});
        //     device_status = {
        //   "serial_number": "AR-00004049",
        //   "type": "device_status",
        //   "hub_sn": "HB-00000001",
        //   "timestamp": 1510855923,
        //   "uptime": 2189,
        //   "voltage": 3.50,
        //   "firmware_revision": 17,
        //   "rssi": -17,
        //   "hub_rssi": -87,
        //   "sensor_status": 0,
        //   "debug": 0
        // }
        dev.values.push({ path: 'network.tempest.uptime', value: parseInt(packet.uptime)});
        dev.values.push({ path: 'network.tempest.voltage', value: parseFloat(packet.voltage)});
        dev.values.push({ path: 'network.tempest.firmware_revision', value: packet.firmware_revision});
        dev.values.push({ path: 'network.tempest.rssi', value: parseInt(packet.rssi)});
        dev.values.push({ path: 'network.tempest.hub_rssi', value: parseInt(packet.hub_rssi)});
        dev.values.push({ path: 'network.tempest.sensor_status', value: parseInt(packet.sensor_status)});
        dev.values.push({ path: 'network.tempest.debug', value: parseInt(packet.debug)});
      }
      else if  (packet.type.localeCompare('hub_status')==0) {
        //   	{
        //   "serial_number":"HB-00000001",
        //   "type":"hub_status",
        //   "firmware_revision":"35",
        //   "uptime":1670133,
        //   "rssi":-62,
        //   "timestamp":1495724691,
        //   "reset_flags": "BOR,PIN,POR",
        //   "seq": 48,
        //   "fs": [1, 0, 15675411, 524288],
        //       "radio_stats": [2, 1, 0, 3, 2839],
        //       "mqtt_stats": [1, 0]
        // }
        dev.values.push({ path: 'network.tempest.firmware_revision', value: packet.firmware_revision});
        dev.values.push({ path: 'network.tempest.uptime', value: parseInt(packet.uptime)});
        dev.values.push({ path: 'network.tempest.rssi', value: parseInt(packet.rssi)});
        dev.values.push({ path: 'network.tempest.reset_flags', value: packet.reset_flags});
        dev.values.push({ path: 'network.tempest.seq', value: packet.seq});
        dev.values.push({ path: 'network.tempest.fs', value: packet.fs});
      }

      if (dev.values.length) { // Notify  of changes
        app.handleMessage("signalk-tempest", { updates: [  dev ] });
      }
    });

    socket.bind('50222');
  };

  plugin.stop = function () {
    socket.close();
  };

  plugin.schema = {
    type: 'object',
    properties: {
      temp: {
        type: 'string',
        title: 'SignalK key for temperature',
        default: 'environment.outside.temperature'
      },
      humidity: {
        type: 'string',
        title: 'SignalK key for humidity',
        default: 'environment.outside.relativeHumidity'
      },
      pressure: {
        type: 'string',
        title: 'SignalK key for pressure (Pa)',
        default: 'environment.outside.pressure',
        units: "Pa"
      },
      illuminance: {
        type: 'string',
        title: 'SignalK key for illuminance (Lux)',
        default: 'environment.outside.illuminance',
        units: "lux"
      },
      solar: {
        type: 'string',
        title: 'SignalK key for solar irradiation (W/m2)',
        default: 'environment.outside.solar',
        units: "W/m2"
      },
      aws: {
        type: 'string',
        title: 'SignalK key for windspeed',
        default: 'environment.wind.speedApparent',
      },
      awa: {
        type: 'string',
        title: 'SignalK key for wind direction (apparent)',
        default: 'environment.wind.angleApparent',
      },
      lightning_strikes: {
        type: 'string',
        title: 'SignalK key for number of lightning strikes',
        default: 'environment.lightning.strikes',
      },
      lightning_distance: {
        type: 'string',
        title: 'SignalK key Avg distance of lightning strikes (km)',
        default: 'environment.lightning.distance',
        units: "km"
      },
      network_tempest_firmware_revision: {
        type: 'string',
        title: 'Firmare revision',
        default: 'network.tempest.firmware.revision',
      },
      network_tempest_uptime: {
        type: 'string',
        title: 'Firmare revision',
        default: 'network.tempest.firmware.revision',
      },
      network_tempest_voltage: {
        type: 'string',
        title: 'Battery volts',
        default: 'network.tempest.voltage',
        units: "V"
      },
      network_tempest_rssi: {
        type: 'string',
        title: 'RSSI',
        default: 'network.tempest.rssi',
        units: "V"
      },
      network_tempest_rssi: {
        type: 'string',
        title: 'RSSI',
        default: 'network.tempest.rssi',
      },
      network_tempest_hub_rssi: {
        type: 'string',
        title: 'HUB RSSI',
        default: 'network.tempest.hub_rssi',
      }
    }
  };

  return plugin;
};
