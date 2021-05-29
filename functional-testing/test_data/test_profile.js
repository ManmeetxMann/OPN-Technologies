/*jslint node: true */
"use strict";

let profiles = {
    "harpreetplus6_dev":{
        "email":"harpreet+6@stayopn.com",
        "organizationId":"TEST1",
        "firstName":"Harpreet 6",
        "lastName":"Gill 6",
        "groupId":"GRP1",
        "groupName":"TEST1_GRP1",
        "userId":"iVK1tRyuU5znFGptWP6s",
        "locationTitle":"TEST1_LOC1",
        "locationId":"9uJKtSmFAC1WuN4aNuZk"
    },
}

module.exports = {
    get: function(overWriteObj={}){
        let data = JSON.parse(JSON.stringify(profiles));
        return data[process.env.ACTIVE_TEST_PROFILE];
    }
}
