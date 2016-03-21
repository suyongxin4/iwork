define([
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'd3',
    'moment',
    'select2',
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
    select2,
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
    function transform(origin) {
        var ret = {};
        for (var key in origin) {
            if (origin.hasOwnProperty(key) && origin[key].email) {
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
            if (this._me == null) {
                RequestUtil.sendRequest("get_iwork_settings")
                    .done(function(response) {
                        var settings = JSON.parse(response.entry[0].content
                            .iwork_settings);
                        that._me = settings.username;
                        RequestUtil.sendRequest("get_iwork_orgchart")
                            .done(function(response) {
                                var orgMap = JSON.parse(response.entry[
                                    0].content.iwork_orgchart);
                                that._orgMap = transform(orgMap);
                                render();
                            });
                    });
            } else {
                render();
            }
        },
        _render: function() {
            var that = this;
            this.$el.html(this._compiledTemplate({}));
            this.$(".sel-number").select2({
                minimumResultsForSearch: Infinity
            }).on("change", function() {
                that._networkChart.setNumber(that.$(".sel-number").val());
            });

            this.$(".sel-group").select2({
                minimumResultsForSearch: Infinity
            }).on("change", function() {
                that._networkChart.data(that.generateNetworkData());
            });
            var labels = TimeUtil.getTimeLabels();
            this._timeAxis = new TimeAxis({
                el: this.$(".time-axis"),
                labels: labels
            });
            // this._timeAxis.render();
            this._networkChart = new NetworkChart({
                el: this.$(".network-chart"),
                number: this.$(".sel-number").val()
            });
            var lastLabel = labels[labels.length - 1];
            this._range = [lastLabel, lastLabel];
            this.startSearch();
            this._timeAxis.on("range", function(data) {
                if (_.isEqual(that._range, data)) {
                    return;
                }
                that._range = data;
                that.startSearch();
            });
            var $container = this.$(".connection-diagram-container");
            var resizeHandler = _.debounce(function() {
                that._timeAxis.width($container.width());
                that._networkChart.size({
                    width: $container.width(),
                    height: $container.height() - 90
                });
            }, 50);
            window.ElementQueries.listen();
            new window.ResizeSensor(this.$(".connection-diagram-container"),
                resizeHandler);
            return this;
        },
        startSearch: function() {
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
            results.on("data", function(model, data) {
                that._result = new DataParser(data);
                that._networkChart.data(that.generateNetworkData());
            });
        },
        generateNetworkData: function() {
            var type = this.$(".sel-group").val();
            var dp = this._result;
            var me = this._me;
            var orgMap = this._orgMap;
            var networkData = {};
            var getEntry, getKeys, getText, getTitle;
            var entry, i, fieldFrom, fieldTo;
            if (type === "individual") {
                getEntry = function(email) {
                    if (!networkData[email]) {
                        networkData[email] = {
                            key: email,
                            context: orgMap[email] || {},
                            sentTo: 0,
                            sentToConnection: [],
                            recvFr: 0,
                            recvFrConnection: []
                        };
                    }
                    return networkData[email];
                };
                getKeys = function(emails) {
                    return emails;
                };

                getText = function(d) {
                    var str, splitter;
                    if (d.context.name) {
                        str = d.context.name;
                        splitter = " ";
                    } else {
                        str = d.key;
                        splitter = "@";
                    }
                    var index = str.lastIndexOf(splitter);
                    if (index < 0) {
                        index = str.length;
                    }
                    return str.substring(0, index);
                };

                getTitle = function(d) {
                    return d.context.name ? d.context.name + " <" + d.key +
                        ">" : d.key;
                };
            } else if (type === "department") {
                getEntry = function(email) {
                    var context = orgMap[email] || {};
                    var key = context.department || "Unknown";
                    if (!networkData[key]) {
                        networkData[key] = {
                            key: key,
                            context: context,
                            sentTo: 0,
                            sentToConnection: [],
                            recvFr: 0,
                            recvFrConnection: []
                        };
                    }
                    return networkData[key];
                };
                getKeys = function(emails) {
                    return _.uniq(emails.map(function(email){
                        var context = orgMap[email] || {};
                        return context.department || "Unknown";
                    }));
                };

                getText = function(d) {
                    var match = d.key.match(/\d+\s(.*)$/);
                    return match? match[1] : d.key;
                };

                getTitle = function(d) {
                    return d.key;
                };
            } else if (type === "location"){
                getEntry = function(email) {
                    var context = orgMap[email] || {};
                    var key = context.location || "Unknown";
                    if (!networkData[key]) {
                        networkData[key] = {
                            key: key,
                            context: context,
                            sentTo: 0,
                            sentToConnection: [],
                            recvFr: 0,
                            recvFrConnection: []
                        };
                    }
                    return networkData[key];
                };
                getKeys = function(emails) {
                    return _.uniq(emails.map(function(email){
                        var context = orgMap[email] || {};
                        return context.location || "Unknown";
                    }));
                };

                getText = function(d) {
                    return d.key;
                };

                getTitle = function(d) {
                    return d.key;
                };
            }
            for (i = 0; i < dp.length; ++i) {
                fieldFrom = dp.getRowField(i, "from");
                fieldTo = dp.getRowField(i, "to");
                if (fieldFrom == null || fieldTo == null ||
                    fromBlackList.indexOf(fieldFrom) > -1) {
                    continue;
                }
                if (fieldFrom.indexOf(me) < 0) {
                    // Sent to me.
                    entry = getEntry(fieldFrom);
                    entry.recvFr++;
                    entry.recvFrConnection = _.union(entry.recvFrConnection,
                        getKeys(fieldTo));
                } else {
                    // Sent by me.
                    var keys = getKeys(fieldTo);
                    fieldTo.forEach(function(r) {
                        entry = getEntry(r);
                        entry.sentToConnection = _.union(entry.sentToConnection,
                            keys);
                    });
                    keys.forEach(function(key){
                        networkData[key].sentTo++;
                    });
                }
            }
            _.each(networkData, function(data) {
                data.recvFrConnection = _.without(data.recvFrConnection,
                    me, data.key).sort();
                data.sentToConnection = _.without(data.sentToConnection,
                    me, data.key).sort();
                data.total = data.recvFr + data.sentTo;
                data.text = getText(data);
                data.title = getTitle(data);
            });
            return {
                data: networkData,
                me: me
            };
        }
    });
});
