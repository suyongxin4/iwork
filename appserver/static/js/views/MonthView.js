define([
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'd3',
    'moment',
    'fullcalendar',
    "splunkjs/mvc/searchmanager",
    'app/utils/DataParser'
], function(
    $,
    _,
    Backbone,
    Bootstrap,
    d3,
    moment,
    Fullcalendar,
    SearchManager,
    DataParser
) {
    function generateBuckets(start, end){
        var buckets = {};
        while (start.isBefore(end)){
            buckets[start.format("YYYY-MM-DD")] = 0;
            start.add(1, "d");
        }
        return buckets;
    }

    function heatMapColorforValue(value){
      var h = (1.0 - value) * 120;
      return "hsl(" + h + ", 100%, 50%)";
    }

    return Backbone.View.extend({
        initialize: function(options) {
            Backbone.View.prototype.initialize.apply(this, arguments);
            this._options = options;
            this._date = options.date;
            this._index = options.index;
            this._calendarData = null;
            this._collector = options.collector;
        },
        render: function() {
            this.$el.fullCalendar({
                viewRender: this.onViewRender.bind(this),
                header: {
                    right: ""
                },
                defaultDate: this._date,
                weekends: false
            });
            this.$(".fc-scroller").removeAttr("style");
            return this;
        },
        onViewRender: function(view) {
            this.$(".fc-body .fc-row:last-child").remove();
            var viewMoment = view.calendar.getDate().utcOffset(moment().utcOffset());
            this.decorateCalendar(viewMoment.clone().startOf("month"),
                viewMoment.clone().endOf("month"));
        },
        decorateCalendar: function(start, end) {
            var sm = new SearchManager({
                id: _.uniqueId("calendar"),
                search: "* sourcetype=iwork:calendar subject!=*BLACKOUT* | fields start, stop, subject, attendees",
                earliest_time: start.toISOString(),
                latest_time: end.toISOString(),
            });
            var results = sm.data('results', {
                count: 0,
                offset: 0
            });
            var buckets = generateBuckets(start, end);
            var index = this._index;
            var that = this;
            results.on("data", function(model, data) {
                var rawIdx = data.fields.indexOf("_raw");
                var dp = new DataParser(data, {
                    dedup: function(rows){
                        var ret = [];
                        var map = {};
                        rows.forEach(function(row){
                            var obj = JSON.parse(row[rawIdx]);
                            var key = [obj.start, obj.stop, obj.subject, obj.attendees?obj.attendees.join():obj.attendees].join();
                            if (map[key]){
                                return;
                            }
                            map[key] = true;
                            ret.push(row);
                        });
                        return ret;
                    }
                });
                for (var i = 0; i < dp.length; ++i){
                    var s = moment(dp.getRowField(i, "start"));
                    var d = -s.diff(dp.getRowField(i, "stop"), "minutes");
                    that._collector.addData(d, index);
                    buckets[s.format("YYYY-MM-DD")] += d;
                }
                that.$(".fc-day").css("background", "none");
                for (var key in buckets){
                    if (buckets.hasOwnProperty(key)){
                        var day = that.$(".fc-day[data-date='"+key+"']");
                        var ratio = buckets[key] / 8 / 60;
                        if (ratio > 1){
                            ratio = 1;
                        }
                        day.css("background", heatMapColorforValue(ratio));
                        if (ratio > 0.9){
                            that.$(".fc-day-number[data-date='"+key+"']")
                                .css("color", "#fff");
                        }
                    }
                }
            });
        },
    });
});
