define([
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'moment',
    'app/utils/TimeUtil',
    'contrib/text!app/templates/SummaryView.html',
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
            this._collector.onChange("summary", render);
        },
        render: function() {
            this.$el.html(this._compiledTemplate(this.getTemplateParameters()));
            this.renderChart();
        },
        getTemplateParameters: function(){
            var ret = {
                totalTime: this._collector.getTotalTime(),
                totalNumber: this._collector.getTotalNumber(),
                weeks: TimeUtil.getWeeks()
            };
            return ret;
        },
        renderChart: function(){
            this.$(".chart").highcharts({
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
                    text: "How many meetings?"
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
                    })
                }]
            });
            this.$(".chart svg text[zIndex=8]").remove();
        }
    });
});
