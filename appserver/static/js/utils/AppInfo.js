define([
    'jquery',
    'underscore',
    'backbone',
    'splunkjs/mvc/utils'
], function(
    $,
    _,
    Backbone,
    SplunkJsUtils
) {
    return {
        getLocale: function() {
            return SplunkJsUtils.getPageInfo().locale;
        },
        getCurrentApp: function() {
            return SplunkJsUtils.getPageInfo().app;
        },
        getUrlPrefix: function() {
            var pageinfo = SplunkJsUtils.getPageInfo();
            var urlPrefix = "/" + pageinfo.locale;
            if (pageinfo.root !== undefined) {
                urlPrefix = "/" + pageinfo.root + urlPrefix;
            }
            return urlPrefix;
        },
        getCustomUrlPrefix: function() {
            var urlPrefix = this.getUrlPrefix();
            var app = this.getCurrentApp();
            return urlPrefix + "/custom/" + app;
        },
        getSplunkDRawPrefix: function(){
            var urlPrefix = this.getUrlPrefix();
            var app = this.getCurrentApp();
            return urlPrefix + "/splunkd/__raw/servicesNS/nobody/" + app;
        }
    };
});
