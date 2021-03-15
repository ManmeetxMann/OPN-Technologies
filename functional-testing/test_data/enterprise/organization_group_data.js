/*jslint node: true */
"use strict";

let base_data = [
    {
      "id": "GRP1",
      "name": "string",
      "isPrivate": true
    }
  ]

module.exports = {
    getData: function(overWriteObj={}){
        let data = JSON.parse(JSON.stringify(base_data));
        
        if (overWriteObj.id !== undefined) {
            data[0].id = overWriteObj.id;
        }
        if (overWriteObj.name !== undefined) {
            data[0].name = overWriteObj.name;
        }
        
        return data;
    }
}