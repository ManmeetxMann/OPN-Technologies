/*jslint node: true */
"use strict";

let profiles = {
    "harpreetplus6_dev_reguser":{
        "email":"harpreet@stayopn.com",
        "organizationId":"PUBLIC_ORG",
        "firstName":"Harpreet 6",
        "lastName":"Gill 6",
        "groupId":"GRP1",
        "groupName":"TEST1_GRP1",
        "userId":"iVK1tRyuU5znFGptWP6s",
        "locationTitle":"TEST1_LOC1",
        "locationId":"TEST_LOC1"
    },
    "harpreetplus6_dev_lab":{
        "email":"harpreet@stayopn.com",
        "organizationId":"PUBLIC_ORG",
        "firstName":"Harpreet 6",
        "lastName":"Gill 6",
        "groupId":"GRP1",
        "groupName":"TEST1_GRP1",
        "userId":"iVK1tRyuU5znFGptWP6s",
        "locationTitle":"TEST1_LOC1",
        "locationId":"TEST_LOC1"
    },
    "harpreet_test_lab":{
        "email":"harpreet+test1@stayopn.com",
        "organizationId":"TESTPROD1",
        "firstName":"Harpreet 1",
        "lastName":"Gill 1",
        "groupId":"GRP1",
        "groupName":"TEST1_GRP1",
        "userId":"iVK1tRyuU5znFGptWP6s",
        "locationTitle":"TEST1_LOC1",
        "locationId":"TEST_LOC1"
    },
}

module.exports = {
    get: function(overWriteObj={}){
        const data = JSON.parse(JSON.stringify(profiles));
        const profile = `${process.env.ACTIVE_TEST_PROFILE}_${process.env.USER_ROLE}`
        return data[profile];
    }
}
