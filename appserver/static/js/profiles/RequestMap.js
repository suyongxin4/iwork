define(function() {
    var map = {
        "get_iwork_settings": {
            url: "/splunk_ta_iwork/iwork_settings",
            method: "GET"
        },

        "save_iwork_settings": {
            url: "/splunk_ta_iwork/iwork_settings",
            method: "POST"
        }
    };

    return map;
});
