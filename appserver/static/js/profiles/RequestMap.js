define(function() {
    var map = {
        "get_iwork_settings": {
            url: "/splunk_app_iwork/iwork_settings",
            method: "GET"
        },

        "save_iwork_settings": {
            url: "/splunk_app_iwork/iwork_settings",
            method: "POST"
        },
        "get_iwork_orgchart": {
            url: "/splunk_app_iwork/iwork_orgchart",
            method: "GET"
        }
    };

    return map;
});
