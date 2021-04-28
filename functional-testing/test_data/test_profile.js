/*jslint node: true */
"use strict";

let profiles = {
    "harpreetplus1_dev":{
        "email":"harpreet+1@stayopn.com",
        "organizationId":"kZ0e2uvQPQ0VQSQOfxVm",
        "firstName":"Harpreet1",
        "lastName":"Gill1",
        "groupId":"ikQ8EfsJQdR22mKRslIk",//Parents & Guardians
        "groupName":"Parents & Guardians",
        "userId":"nU37QJUgp1vya5SZYaVG",
        "locationTitle":"TEST1_LOC1"
    },
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
    "harpreet_prod":{
        "email":"harpreet@stayopn.com",
        "organizationId":"TESTPROD1",
        "firstName":"Harpreet",
        "lastName":"Gill",
        "groupId":"GRP1",
        "groupName":"TEST1_GRP1",
        "userId":"oamA3OzMdibDzq4WlLdk",
        "locationTitle":"TEST1_LOC1"
    },
    "harpreet_infra":{
        "email":"harpreet@stayopn.com",
        "organizationId":"TESTPROD1",
        "firstName":"Harpreet",
        "lastName":"Gill",
        "groupId":"GRP1",
        "groupName":"TEST1_GRP1",
        "userId":"oamA3OzMdibDzq4WlLdk",
        "locationTitle":"TEST1_LOC1"
    },
    "harpreet_preprod":{
        "email":"harpreet+fhhealthclinic@stayopn.com",
        "organizationId":"TESTPROD1",
        "firstName":"Harpreet",
        "lastName":"Gill",
        "groupId":"GRP1",
        "groupName":"TEST1_GRP1",
        "userId":"yF8jterQlTo1WVZb2wmq",
        "locationTitle":"TEST1_LOC1",
        "locationId":"70Cd5Qxtma0tVLPlmX0Y"
    },
    "meselisaac":{
        "email":"meselisaac@gmail.com",
        "organizationId":"TEST1",
        "firstName":"Harpreet",
        "lastName":"Dev 2",
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
