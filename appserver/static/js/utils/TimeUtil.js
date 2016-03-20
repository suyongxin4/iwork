define([
    "moment"
], function(
    moment
) {
    var util = {};

    util.getTimeLabels = function() {
        var current = moment();
        current.startOf("month");
        var lastMonth = current.clone().subtract(1, "month");
        var lastYear = current.clone().subtract(1, "year");
        var ret = [];
        while (lastYear.isSameOrBefore(lastMonth)) {
            ret.push(lastYear.format("YYYY-MM"));
            lastYear.add(1, "month");
        }
        return ret;
    };

    util.getWeeks = function(){
        var current = moment();
        current.startOf("month");
        var lastMonth = current.clone().subtract(1, "month").endOf("month");
        var lastYear = current.clone().subtract(1, "year");
        return lastMonth.diff(lastYear, "weeks");
    };

    return util;
});
