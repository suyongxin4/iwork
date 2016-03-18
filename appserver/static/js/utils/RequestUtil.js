define([
    "jquery",
    "app/utils/AppInfo",
    "app/profiles/RequestMap"
], function(
    $,
    AppInfo,
    RequestMap
){
    var utils = {};

    utils.sendRequest = function(requestName, data){
        var item = RequestMap[requestName];
        if (!item) {
            throw "Request does not exist";
        }
        var xhr = $.ajax({
            url: AppInfo.getSplunkDRawPrefix() + item.url + "?output_mode=json",
            type: item.method,
            data: data,
            dataType: "json"
        });
        if (!xhr){
            throw "Request failed";
        }
        return xhr;
    };

    return utils;
});
