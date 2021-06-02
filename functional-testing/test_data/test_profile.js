/*jslint node: true */
"use strict";

let profiles = {
    "harpreet_preprod_reguser":{
        "email":"harpreet+test1@stayopn.com",
        "organizationId":"TESTPROD1",
        "firstName":"Harpreet 6",
        "lastName":"Gill 6",
        "groupId":"GRP1",
        "groupName":"TEST1_GRP1",
        "userId":"iVK1tRyuU5znFGptWP6s",
        "locationTitle":"TEST1_LOC1",
        "locationId":"TEST_LOC1"
    },
    "harpreet_preprod_lab":{
        "email":"harpreet+test1@stayopn.com",
        "organizationId":"TESTPROD1",
        "firstName":"Harpreet 6",
        "lastName":"Gill 6",
        "groupId":"GRP1",
        "groupName":"TEST1_GRP1",
        "userId":"iVK1tRyuU5znFGptWP6s",
        "locationTitle":"TEST1_LOC1",
        "locationId":"TEST_LOC1"
    },
    "harpreet_preprod_clinic":{
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
    "harpreet_preprod_admin":{
        "email":"harpreet+preprod1@stayopn.com",
        "organizationId":"TESTPROD1",
        "firstName":"Harpreet 1",
        "lastName":"Gill 1",
        "groupId":"GRP1",
        "groupName":"TEST1_GRP1",
        "userId":"iVK1tRyuU5znFGptWP6s",
        "locationTitle":"TEST1_LOC1",
        "locationId":"TEST_LOC1"
    },
    "harpreet_dev_lab":{
        "email":"harpreet+6@stayopn.com",
        "organizationId":"TEST1",
        "firstName":"Harpreet 6",
        "lastName":"Gill 6",
        "groupId":"GRP1",
        "groupName":"TEST1_GRP1",
        "userId":"iVK1tRyuU5znFGptWP6s",
        "locationTitle":"TEST1_LOC1",
        "locationId":"TEST_LOC1"
    },
    "harpreet_dev_admin":{
        "email":"harpreet+6@stayopn.com",
        "organizationId":"TEST1",
        "firstName":"Harpreet 6",
        "lastName":"Gill 6",
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
        //console.log(`LOADING ${profile}`)
        return data[profile];
    }
}
