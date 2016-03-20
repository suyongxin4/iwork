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
    'app/utils/TimeUtil',
    'app/utils/DataParser',
    'app/utils/RequestUtil',
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
    TimeUtil,
    DataParser,
    RequestUtil,
    TimeAxis,
    NetworkChart
) {
    function transform(origin){
        var ret = {};
        for (var key in origin){
            if (origin.hasOwnProperty(key) && origin[key].email){
                ret[origin[key].email] = origin[key];
            }
        }
        return ret;
    }

    var fromBlackList = [
        "jira-comments@splunk.com",
        "confluence@splunk.com",
        "app-builder@splunk.com",
        "splunk@service-now.com",
        "hipchat@splunk.com",
        "voicemail@splunk.com"
    ];

    return Backbone.View.extend({
        template: Template,
        initialize: function(options) {
            Backbone.View.prototype.initialize.apply(this, arguments);
            this._compiledTemplate = _.template(this.template);
            this._options = options;
            this._me = null;
        },
        render: function() {
            var render = this._render.bind(this);
            var that = this;
            if (this._me == null){
                RequestUtil.sendRequest("get_iwork_settings")
                    .done(function(response){
                        var settings = JSON.parse(response.entry[0].content.iwork_settings);
                        that._me = settings.username;
                        RequestUtil.sendRequest("get_iwork_orgchart")
                            .done(function(response){
                                var orgMap = JSON.parse(response.entry[0].content.iwork_orgchart);
                                that._orgMap = transform(orgMap);
                            });
                        render();
                    });
            } else {
                render();
            }
        },
        _render: function(){
            var that = this;
            this.$el.html(this._compiledTemplate({}));
            var labels = TimeUtil.getTimeLabels();
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
                search: "* sourcetype=iwork:email",
                earliest_time: moment(range[0]).startOf("month").toISOString(),
                latest_time: moment(range[1]).endOf("month").toISOString(),
            });
            var results = sm.data('results', {
                count: 0,
                offset: 0
            });
            var me = this._me;
            results.on("data", function(model, data) {
                var dp = new DataParser(data);
                var dataReceived = {};
                var dataSent = {};
                for (var i = 0; i < dp.length; ++i){
                    var fieldFrom = dp.getRowField(i, "from");
                    var fieldTo = dp.getRowField(i, "to");
                    if (fieldFrom == null || fieldTo == null ||
                        fromBlackList.indexOf(fieldFrom) > -1){
                        continue;
                    }
                    if (fieldFrom.indexOf(me) < 0){
                        // Sent to me.
                        if (!dataReceived[fieldFrom]){
                            dataReceived[fieldFrom] = 0;
                        }
                        dataReceived[fieldFrom]++;
                    } else {
                        // Sent by me.
                        fieldTo.forEach(function(r){
                            if (!dataSent[r]){
                                dataSent[r] = 0;
                            }
                            dataSent[r]++;
                        });
                    }
                }
                that._networkChart.data({
                    sent: dataSent,
                    received: dataReceived,
                    orgMap: that._orgMap,
                    me: me
                });
            });
        }
    });
});
