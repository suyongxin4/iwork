define([
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'moment',
    'app/utils/TimeUtil',
    'contrib/text!app/templates/EmailAnalysisView.html',
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
            var render = _.debounce(this.render.bind(this), 100);
            this._collector.onChange("analysis", render);
        },
        render: function() {
            this.$el.html(this._compiledTemplate({}));
            this.renderChart();
        },
        renderChart: function(){
            Highcharts.getOptions().plotOptions.pie.colors = ["#78c679", "#2b8cbe"];
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
                    text: "Total Emails: " + (this._collector.getTotalSent() + this._collector.getTotalReceived()),
                    style: {
                        fontSize: "16px"
                    }
                },
                tooltip: {
                    pointFormat: '{series.name}: <b>{point.y} mails</b>'
                },
                plotOptions:{
                    pie:{
                        dataLabels:{
                            enabled: true,
                            format: '<b>{point.name}</b>: {point.percentage:.1f} %'
                        }
                    }
                },
                legend:{
                    enabled: false
                },
                series:[{
                    name: "Number of Emails",
                    data: [{
                        name: "Sent",
                        y: this._collector.getTotalSent()
                    },{
                        name: "Received",
                        y: this._collector.getTotalReceived()
                    }],
                    size: "80%",
                    innerSize: "40%"
                }]
            });
            this.$(".bar-chart").highcharts({
                navigation: {
                    buttonOptions:{
                        enabled: false
                    }
                },
                chart:{
                    type: "bar",
                    backgroundColor: "#eee"
                },
                title:{
                    text: "Number of Sent Emails by Hour",
                    style: {
                        fontSize: "16px"
                    }
                },
                subtitle:{
                    text: "Total Sent: " + this._collector.getTotalSent()
                },
                xAxis: {
                    categories:[
                        "Before 8 a.m.",
                        "8 ~ 9 a.m.",
                        "9 ~ 10 a.m.",
                        "10 ~ 11 a.m.",
                        "11 ~ 12 a.m.",
                        "12 a.m. ~ 1 p.m.",
                        "1 ~ 2 p.m.",
                        "2 ~ 3 p.m.",
                        "3 ~ 4 p.m.",
                        "4 ~ 5 p.m.",
                        "5 ~ 6 p.m.",
                        "6 ~ 7 p.m.",
                        "7 ~ 8 p.m.",
                        "After 8 p.m.",
                    ]
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: null
                    }
                },
                plotOptions:{
                    bar:{
                        dataLabels:{
                            enabled: true
                        }
                    }
                },
                legend:{
                    enabled: false
                },
                series:[{
                    name: "Number of Emails",
                    data: this._collector.getSentCollection(),
                    color: "#78c679"
                }]
            });

            this.$(".chart svg text[zIndex=8]").remove();
        }
    });
});
