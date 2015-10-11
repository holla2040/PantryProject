// (c) 2014 Don Coleman
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* global mainPage, deviceList, refreshButton */
/* global resultDiv, deviceLabel, setButton, disconnectButton */
/* global ble, cordova  */
/* jshint browser: true , devel: true*/
'use strict';

// ASCII only
function bytesToString(buffer) {
    return String.fromCharCode.apply(null, new Uint8Array(buffer));
}

// ASCII only
function stringToBytes(string) {
    var array = new Uint8Array(string.length);
    for (var i = 0, l = string.length; i < l; i++) {
        array[i] = string.charCodeAt(i);
    }
    return array.buffer;
}

var pantry = {
    serviceUUID:      "713D0000-503E-4C75-BA94-3148F18D941E",
    txCharacteristic: "713D0003-503E-4C75-BA94-3148F18D941E", // transmit is from the phone's perspective
    rxCharacteristic: "713D0002-503E-4C75-BA94-3148F18D941E"  // receive is from the phone's perspective
};

var app = {
    initialize: function() {
        this.bindEvents();
        detailPage.hidden = true;
        app.devices = {};
    },
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        sendButton.addEventListener('click', this.sendData, false);
        disconnectButton.addEventListener('touchstart', this.disconnect, false);
        deviceList.addEventListener('touchstart', this.connect, false); // assume not scrolling
    },
    onDeviceReady: function() {
        app.refreshDeviceList();
    },
    refreshDeviceList: function() {
        if (cordova.platformId === 'android') { // Android filtering is broken
            ble.scan([], 0.5, app.onDiscoverDevice, app.onError);
        } else {
            ble.scan([pantry.serviceUUID], 5, app.onDiscoverDevice, app.onError);
        }
        app.renderDeviceList();
        setTimeout(app.refreshDeviceList,1000);
    },
    onDiscoverDevice: function(device) {
        app.devices[device.id] = {'id':device.id,'name':device.name,'rssi':device.rssi,'manudata':String.fromCharCode.apply(null, new Uint8Array(device.advertising)),'timestamp':Math.round(new Date().getTime() / 1000)};


        app.renderDeviceList();
    },
    renderDeviceList: function() {
        var httpReq = new plugin.HttpRequest();
        //console.log("onDiscoverDevice");
        // manuData, will always have manuData and first item, then name
        // [2, 1, 4, 10, 255, 1, 69, 79, 0, 6, 112, 255, 3, 0, 10, 8, 83, 109, 97, 114, 116, 66, 105, 107, 101,
        //           l , mf,  v, ty, st,er,id, runtime
        //  0  1  2  3   4    5  6   7   8  9  10   11  12 13  
        //          |    manu data                             |

        var now = Math.round(new Date().getTime() / 1000);

        var html = "";
        deviceList.innerHTML = '';
        Object.keys(app.devices).forEach(function(key) {
            var device = app.devices[key];
            if (now < (device.timestamp + 30)) {
                var html = '<b>' + device.name + '</b><br/>'+"ID: "+device.id+", RSSI: " + device.rssi;
                var listItem = document.createElement('li');
                var deviceState = 'unknown';

                if (device.name == "Pantry") {
                    var value = parseInt(device.manudata.split("|")[1]);
                    html += "<br/>"+String(new Date()).split(" ")[4]+"<br/> "+value;
                    listItem.dataset.deviceId = device.id;
                    listItem.dataset.deviceName = device.name;
                    listItem.className = 'devicePantry';

                    listItem.innerHTML = html;
                    deviceList.appendChild(listItem);
                    var url = "http://thepantryproject.co/posts/"+device.id.replace(/:/g,"")+"/"+value+"/38.47802%2C-107.8779";
                    url = "http://54.153.72.238/posts/"+device.id.replace(/:/g,"")+"/"+value+"/38.47802,-107.8779";
                    //alert(url);
                    httpReq.get(url, function(status, data) {
                //      listItem.innerHTML = listItem.innerHTML +"<br>"+url+"<br>"+ status+"<br>"+data;
                    });
                }
            } 
        });
    },
    connect: function(e) {
        var deviceId = e.target.dataset.deviceId;
        var onConnect = function() {
                // subscribe for incoming data
                ble.startNotification(deviceId, pantry.serviceUUID, pantry.rxCharacteristic, app.onData, app.onError);
                sendButton.dataset.deviceId = deviceId;
                disconnectButton.dataset.deviceId = deviceId;
        };
        if (deviceId) {
            deviceLabelTitle.innerHTML = e.target.dataset.deviceName;
            deviceLabel.value = e.target.dataset.deviceName;
            ble.connect(deviceId, onConnect, app.onError);
        }
    },
    onData: function(data) { // data received from Arduino
        //console.log(bytesToString(data));
        data = bytesToString(data).split("|");
        var runtimeHours = data[0] / 3600.00;
        var html = ""
        html = "<table>";
        html += "<tr><td>runtime</td><td>"+runtimeHours.toFixed(2)+"h</td></tr>";
        html += "<tr><td>&nbsp;</td><td>"+data[0]+"s</td></tr>";
        html += "<tr><td>battery level</td><td>"+data[1]+"</td></tr>";
        html += "<tr><td>state</td><td>"+data[2]+"</td></tr>";
        html += "<tr><td>RPM</td><td>"+Math.floor((Math.random()*4) + 2316)+"</td></tr>";
        html += "</table>";

        resultDiv.innerHTML = html;
        resultDiv.scrollTop = resultDiv.scrollHeight;
    },
    sendData: function(event) { // send data to Arduino
        var success = function() {
            console.log("success");
            //resultDiv.innerHTML = resultDiv.innerHTML + "Sent: " + deviceLabel.value + "<br/>";
            //resultDiv.scrollTop = resultDiv.scrollHeight;
        };

        var failure = function() {
            alert("Failed writing data to the pantry hardware");
        };

        var data = stringToBytes('L'+deviceLabel.value);
        var deviceId = event.target.dataset.deviceId;
        ble.writeWithoutResponse(deviceId, pantry.serviceUUID, pantry.txCharacteristic, data, success, failure);
    },
    disconnect: function(event) {
        deviceList.innerHTML = ''; // empties the list
        var deviceId = event.target.dataset.deviceId;
        ble.disconnect(deviceId, app.showMainPage, app.onError);
    },
    showMainPage: function() {
        mainPage.hidden = false;
    },
    showApp: function() {
        app.hidden = false;
    },
    onError: function(reason) {
        alert("ERROR: " + reason); // real apps should use notification.alert
    }
};
