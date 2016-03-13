define([
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'd3',
    'moment',
    'ElementQueries',
    'ResizeSensor',
    "splunkjs/mvc/searchmanager",
    'contrib/text!app/templates/EmailView.html',
    'app/views/TimeAxis',
    'app/views/NetworkChart'
], function(
    $,
    _,
    Backbone,
    Bootstrap,
    d3,
    moment,
    ElementQueries,
    ResizeSensor,
    SearchManager,
    Template,
    TimeAxis,
    NetworkChart
) {
    var ME = "ysu@splunk.com";

    function getTimeLabels(){
        var current = moment();
        current.startOf("month");
        lastMonth = current.clone().subtract(1, "month");
        lastYear = current.clone().subtract(1, "year");
        var ret = [];
        while (lastYear.isSameOrBefore(lastMonth)){
            ret.push(lastYear.format("YYYY-MM"));
            lastYear.add(1, "month");
        }
        return ret;
    }
    function getUniqueRows(rows){
        var dict = {};
        var dedupedRows = [];
        rows.forEach(function(row){
            var key = row.slice(0, 4).join("");
            if (dict[key]){
                return;
            }
            dict[key] = true;
            dedupedRows.push(row);
        });
        return dedupedRows;
    }

    function DataParser(data){
        this._data = data;
        this._fields = data.fields;
        this._rows = getUniqueRows(data.rows);
        this.length = this._rows.length;
        this._rowObjects = [];
        this._rowObjects.length = this.length;
    }

    DataParser.prototype.getRowField = function(idx, fieldName){
        if (!this._rowObjects[idx]){
            this.getRowObject(idx);
        }
        return this._rowObjects[idx][fieldName];
    };

    DataParser.prototype.getRowObject = function(idx){
        if (this._rowObjects[idx]){
            return this._rowObjects[idx];
        }
        var obj = {};
        var row = this._rows[idx];
        var fields = this._fields;
        row.forEach(function(value, index){
            obj[fields[index]] = value;
        });
        this._rowObjects[idx] = obj;
        return obj;
    };

    return Backbone.View.extend({
        template: Template,
        initialize: function(options) {
            Backbone.View.prototype.initialize.apply(this, arguments);
            this._compiledTemplate = _.template(this.template);
            this._options = options;
        },
        render: function() {
            var that = this;
            this.$el.html(this._compiledTemplate({}));
            var labels = getTimeLabels();
            this._timeAxis = new TimeAxis({
                el: this.$(".time-axis"),
                labels: labels
            });
            // this._timeAxis.render();
            this._networkChart = new NetworkChart({
                el: this.$(".network-chart")
            });
            var lastLabel = labels[labels.length - 1];
            this._range = [lastLabel, lastLabel];
            this.startSearch();
            this._timeAxis.on("range", function(data){
                if (_.isEqual(that._range, data)){
                    return;
                }
                that._range = data;
                that.startSearch();
            });
            var $container = this.$(".connection-diagram-container");
            var resizeHandler = _.debounce(function(){
                that._timeAxis.width($container.width());
                that._networkChart.size({
                    width: $container.width(),
                    height: $container.height() - 60
                });
            }, 50);
            window.ElementQueries.listen();
            new window.ResizeSensor(this.$(".connection-diagram-container"), resizeHandler);
            return this;
        },
        startSearch: function(){
            var that = this;
            var range = this._range;
            var sm = new SearchManager({
                id: _.uniqueId("email"),
                search: "* sourcetype=iwork:email | fields date, from, to, subject, thread-topic",
                earliest_time: moment(range[0]).startOf("month").toISOString(),
                latest_time: moment(range[1]).endOf("month").toISOString(),
            });
            var results = sm.data('results', {
                count: 0,
                offset: 0
            });
            results.on("data", function(model, data) {
                var dp = new DataParser(data);
                var dataReceived = {};
                var dataSent = {};
                for (var i = 0; i < dp.length; ++i){
                    var fieldFrom = dp.getRowField(i, "from");
                    fieldFrom = fieldFrom.trim().replace(/[\n\"]/gm, "").replace(/\t/gm, " ");
                    if (fieldFrom.indexOf(ME) < 0){
                        // Sent to me.
                        if (!dataReceived[fieldFrom]){
                            dataReceived[fieldFrom] = 0;
                        }
                        dataReceived[fieldFrom]++;
                    } else {
                        // Sent by me.
                        var fieldTo = dp.getRowField(i, "to");
                        fieldTo = fieldTo.trim().replace(/[\n\"]/gm, "").replace(/\t/gm, " ");
                        var recipients = fieldTo.split(",");
                        recipients.forEach(function(r){
                            r = r.trim();
                            if (!dataSent[r]){
                                dataSent[r] = 0;
                            }
                            dataSent[r]++;
                        });
                    }
                }
                that._networkChart.data({
                    sent: dataSent,
                    received: dataReceived
                });
            });
        }
    });
});
