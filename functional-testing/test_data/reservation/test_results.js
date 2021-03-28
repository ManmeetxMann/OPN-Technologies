/*jslint node: true */
"use strict";

let base_data = {
    "famEGene": "-",
    "famCt": "N/A",
    "calRed61RdRpGene": "-",
    "calRed61Ct": "N/A",
    "quasar670NGene": "-",
    "quasar670Ct": "N/A",
    "hexIC": "-",
    "hexCt": "36",
    "notify": true
}

module.exports = {
    getData: function(overWriteObj={}){
        let data = JSON.parse(JSON.stringify(base_data));
        
        if (overWriteObj.barCode !== undefined) {
            data.barCode = overWriteObj.barCode;
        }

        if (overWriteObj.autoResult !== undefined) {
            data.autoResult = overWriteObj.autoResult;
        }

        if (overWriteObj.action !== undefined) {
            data.action = overWriteObj.action;
        }
        
        return data;
    }
}
