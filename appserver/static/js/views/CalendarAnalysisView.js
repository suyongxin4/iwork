define([
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'moment',
    'app/utils/TimeUtil',
    'contrib/text!app/templates/CalendarAnalysisView.html',
    'highcharts'
], function(
    $,
    _,
    Backbone,
    Bootstrap,
    moment,
    TimeUtil,
    Template
) {

    return Backbone.View.extend({
        template: Template,
        initialize: function(options) {
            Backbone.View.prototype.initialize.apply(this, arguments);
            this._compiledTemplate = _.template(this.template);
            this._options = options;
            this._collector = options.collector;
            this._labels = options.labels;
            var render = _.debounce(this.render.bind(this), 100);
            this._collector.onChange("analysis", render);
        },
        render: function() {
            this.$el.html(this._compiledTemplate({}));
            this.renderChart();
        },
        renderChart: function(){
            this.$(".column-chart").highcharts({
                navigation: {
                    buttonOptions:{
                        enabled: false
                    }
                },
                chart:{
                    type: "column",
                    backgroundColor: "#eee"
                },
                title:{
                    text: "Number of Meetings by Duration"
                },
                xAxis: {
                    categories:[
                        "0 ~ 30min",
                        "31 ~ 60min",
                        "61 ~ 120min",
                        "> 120min",
                    ]
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: null
                    }
                },
                plotOptions:{
                    column:{
                        dataLabels:{
                            enabled: true
                        }
                    }
                },
                legend:{
                    enabled: false
                },
                series:[{
                    name: "Number of Meetings",
                    data: this._collector.getCollection().map(function(row){
                        return row.length;
                    }),
                    color: "#2b8cbe"
                }]
            });
            Highcharts.getOptions().plotOptions.pie.colors = ["#2b8cbe", "#78c679"];
            this.$(".pie-chart").highcharts({
                navigation: {
                    buttonOptions:{
                        enabled: false
                    }
                },
                chart:{
                    type: "pie",
                    backgroundColor: "#eee"
                },
                title:{
                    text: "Busy vs. Free"
                },
                tooltip: {
                    pointFormat: '{point.name}: <b>{point.y:.1f} hours</b>'
                },
                plotOptions:{
                    pie:{
                        dataLabels:{
                            enabled: true,
                            format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                        }
                    }
                },
                legend:{
                    enabled: false
                },
                series:[{
                    name: "Meeting Hours",
                    data: [{
                        name: "Meeting Hours",
                        y: this._collector.getTotalTime() / 60
                    },{
                        name: "Free Hours",
                        y: TimeUtil.getHours() - this._collector.getTotalTime() / 60
                    }]
                }]
            });
            this.$(".line-chart-number").highcharts({
                navigation: {
                    buttonOptions:{
                        enabled: false
                    }
                },
                chart:{
                    type: "line",
                    backgroundColor: "#eee"
                },
                title:{
                    text: "Number of Meetings by Month"
                },
                xAxis: {
                    categories: this._labels
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: null
                    }
                },
                plotOptions:{
                    line:{
                        dataLabels:{
                            enabled: true
                        }
                    }
                },
                legend:{
                    enabled: false
                },
                series:[{
                    name: "Number of Meetings",
                    data: this._collector.getSubCollection().map(function(collection){
                        return collection.totalNumber;
                    }),
                    color: "#2b8cbe"
                }]
            });
            this.$(".line-chart-time").highcharts({
                navigation: {
                    buttonOptions:{
                        enabled: false
                    }
                },
                chart:{
                    type: "line",
                    backgroundColor: "#eee"
                },
                title:{
                    text: "Meetings Hours by Month"
                },
                xAxis: {
                    categories: this._labels
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: null
                    }
                },
                plotOptions:{
                    line:{
                        dataLabels:{
                            enabled: true
                        }
                    }
                },
                legend:{
                    enabled: false
                },
                series:[{
                    name: "Meetings Hours",
                    data: this._collector.getSubCollection().map(function(collection){
                        return +(collection.totalTime / 60).toFixed(2);
                    }),
                    color: "#2b8cbe"
                }]
            });

            this.$(".chart svg text[zIndex=8]").remove();
        }
    });
});
