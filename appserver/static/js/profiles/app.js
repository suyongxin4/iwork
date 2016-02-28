var config = {
    baseUrl: $C.MRSPARKLE_ROOT_PATH + "/" + $C.LOCALE + "/static/js",
    //wrapShim: true,
    shim: {
        'bootstrap': {
            deps: ['jquery']
        }
    },
    paths: {
        'app': '../app/Splunk_TA_iwork/js',
        'lib': '../app/Splunk_TA_iwork/lib/',
        'core': '../../static/js',
        'bootstrap': '../app/Splunk_TA_iwork/lib/bootstrap/js/bootstrap.min',
        'd3': '../app/Splunk_TA_iwork/lib/d3/d3.min',
    },
    enforceDefine: false
};

require.config(config);
