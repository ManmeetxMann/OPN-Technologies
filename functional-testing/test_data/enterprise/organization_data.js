/*jslint node: true */
"use strict";

let base_data = {
    "name": "Test Org",
    "type": "default",
    "allowsSelfCheckInOut": true,
    "enableTemperatureCheck": true,
    "hourToSendReport": 0,
    "dayShift": 0,
    "allowDependants": false,
    "dailyReminder": {
      "enabled": true,
      "enabledOnWeekends": true,
      "timeOfDayMillis": 0
    },
    "notificationFormatStop": "string",
    "notificationFormatCaution": "string",
    "notificationIconStop": "string",
    "notificationIconCaution": "string"
  }

module.exports = {
    getData: function(overWriteObj={}){
        let data = JSON.parse(JSON.stringify(base_data));
        
        if (overWriteObj.id !== undefined) {
            data.id = overWriteObj.id;
        }
        
        if (overWriteObj.enableTemperatureCheck !== undefined) {
          data.enableTemperatureCheck = overWriteObj.enableTemperatureCheck;
      }
        
        return data;
    }
}