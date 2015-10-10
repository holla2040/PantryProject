/* mbed Microcontroller Library
 * Copyright (c) 2006-2013 ARM Limited
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#include "mbed.h"
#include "BLE.h"
#include "LEDService.h"
#include "ble_radio_notification.h"

AnalogIn   ain(A3);
Serial uart(P0_9,P0_11);


BLE        ble;
DigitalOut alivenessLED(P0_23);
DigitalOut actuatedLED(LED2);
uint32_t count;


const static char     DEVICE_NAME[] = "Pantry";
static const uint16_t uuid16_list[] = {LEDService::LED_SERVICE_UUID};

LEDService *ledServicePtr;



void advertisingPayloadSet()
{
    char buf[20];
    sprintf(buf,"%d|%u",++count,ain.read_u16());
 //   sprintf(buf,"%d",++count);
    ble.clearAdvertisingPayload();
    ble.gap().accumulateAdvertisingPayload(GapAdvertisingData::BREDR_NOT_SUPPORTED | GapAdvertisingData::LE_GENERAL_DISCOVERABLE);
    ble.gap().accumulateAdvertisingPayload(GapAdvertisingData::COMPLETE_LIST_16BIT_SERVICE_IDS, (uint8_t *)uuid16_list, sizeof(uuid16_list));
    ble.gap().accumulateAdvertisingPayload(GapAdvertisingData::COMPLETE_LOCAL_NAME, (uint8_t *)DEVICE_NAME, sizeof(DEVICE_NAME));
    ble.gap().setAdvertisingType(GapAdvertisingParams::ADV_CONNECTABLE_UNDIRECTED);
    ble.accumulateAdvertisingPayload(GapAdvertisingData::MANUFACTURER_SPECIFIC_DATA, (const uint8_t *)&buf, strlen(buf));

    uart.printf("%s\n",buf);


}






void disconnectionCallback(const Gap::DisconnectionCallbackParams_t *params)
{
    ble.gap().startAdvertising();
}

void periodicCallback(void)
{
    alivenessLED = !alivenessLED; /* Do blinky on LED1 to indicate system aliveness. */
    advertisingPayloadSet();

}

/**
 * This callback allows the LEDService to receive updates to the ledState Characteristic.
 *
 * @param[in] params
 *     Information about the characterisitc being updated.
 */
void onDataWrittenCallback(const GattWriteCallbackParams *params)
{
    if ((params->handle == ledServicePtr->getValueHandle()) && (params->len == 1)) {
        actuatedLED = *(params->data);
    }
}

int main(void)
{

    uart.baud(115200);

    alivenessLED = 0;
    actuatedLED  = 0;

    Ticker ticker;
    ticker.attach(periodicCallback, 1);

    ble.init();
    ble.gap().onDisconnection(disconnectionCallback);
    ble.gattServer().onDataWritten(onDataWrittenCallback);

    bool initialValueForLEDCharacteristic = false;
    LEDService ledService(ble, initialValueForLEDCharacteristic);
    ledServicePtr = &ledService;

    /* setup advertising */
    ble.gap().accumulateAdvertisingPayload(GapAdvertisingData::BREDR_NOT_SUPPORTED | GapAdvertisingData::LE_GENERAL_DISCOVERABLE);
    ble.gap().accumulateAdvertisingPayload(GapAdvertisingData::COMPLETE_LIST_16BIT_SERVICE_IDS, (uint8_t *)uuid16_list, sizeof(uuid16_list));
    ble.gap().accumulateAdvertisingPayload(GapAdvertisingData::COMPLETE_LOCAL_NAME, (uint8_t *)DEVICE_NAME, sizeof(DEVICE_NAME));
    ble.gap().setAdvertisingType(GapAdvertisingParams::ADV_CONNECTABLE_UNDIRECTED);
    ble.gap().setAdvertisingInterval(1000); /* 1000ms. */
    ble.gap().startAdvertising();

    uart.printf("pantryScale main\n");

    count = 16;

    while (true) {
        ble.waitForEvent();
    }
}
