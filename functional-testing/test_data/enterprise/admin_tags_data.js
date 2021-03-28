/*jslint node: true */
"use strict";

let base_data = {
}

module.exports = {
    getData: function(overWriteObj={}){
        let data = JSON.parse(JSON.stringify(base_data));
        return data;
    }
}