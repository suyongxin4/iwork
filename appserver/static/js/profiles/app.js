var config = {
    baseUrl: $C.MRSPARKLE_ROOT_PATH + "/" + $C.LOCALE + "/static/js",
    //wrapShim: true,
    shim: {
        'bootstrap': {
            deps: ['jquery']
        },
        'fullcalendar': {
            deps: ['jquery', 'moment']
        },
        'ResizeSensor': {
            deps: ['jquery']
        },
        'ElementQueries': {
            deps: ["ResizeSensor"]
        },
        "highcharts.core": {
            deps: ["jquery"]
        },
        "highcharts": {
            deps: ["highcharts.core"]
        },
        "select2": {
            deps: ["jquery"]
        }
    },
    paths: {
        'app': '../app/Splunk_App_iwork/js',
        'lib': '../app/Splunk_App_iwork/lib/',
        'core': '../../static/js',
        'bootstrap': '../app/Splunk_App_iwork/lib/bootstrap/js/bootstrap.min',
        'd3': '../app/Splunk_App_iwork/lib/d3/d3.min',
        'moment': '../app/Splunk_App_iwork/lib/moment/moment.min',
        'fullcalendar': '../app/Splunk_App_iwork/lib/fullcalendar/fullcalendar.min',
        'ElementQueries': '../app/Splunk_App_iwork/lib/CSS-Element-Queries/ElementQueries',
        'ResizeSensor': '../app/Splunk_App_iwork/lib/CSS-Element-Queries/ResizeSensor',
        'highcharts.core': '../app/Splunk_App_iwork/lib/highcharts/highcharts',
        'highcharts': '../app/Splunk_App_iwork/lib/highcharts/modules/exporting',
        'select2': '../app/Splunk_App_iwork/lib/select2/js/select2.min',
    },
    enforceDefine: false
};

require.config(config);
