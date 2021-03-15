/*jslint node: true */
"use strict";

let base_data = [
    {
      "id": "TEST_LOC1",
      "title": "TEST1 LOC1",
      "address": "111 Adl",
      "city": "TORONTO",
      "state": "ON",
      "zip": "M5A0P7",
      "country": "CA",
      "type": "default",
      "attestationRequired": true,
      "allowAccess": true,
      "questionnaireId": "HSG_TEST_QUESTIONS",
      "allowsSelfCheckInOut": true,
      "zones": [
      ],
      "validFrom": "string",
      "validUntil": "string"
    }
  ]

module.exports = {
    getData: function(overWriteObj={}){
        let data = JSON.parse(JSON.stringify(base_data));
        
        if (overWriteObj.id !== undefined) {
            data[0].id = overWriteObj.id;
        }
        if (overWriteObj.title !== undefined) {
            data[0].title = overWriteObj.title;
        }
        if (overWriteObj.questionnaireId !== undefined) {
            data[0].questionnaireId = overWriteObj.questionnaireId;
        }
        
        return data;
    }
}