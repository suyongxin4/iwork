define([
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'moment',
    'app/utils/TimeUtil',
    'app/utils/MeetingDataCollector',
    'contrib/text!app/templates/HomeView.html',
    'app/views/MonthView',
    'app/views/SummaryView',
    'app/views/AnalysisView'
], function(
    $,
    _,
    Backbone,
    Bootstrap,
    moment,
    TimeUtil,
    MeetingDataCollector,
    Template,
    MonthView,
    SummaryView,
    AnalysisView
) {

    return Backbone.View.extend({
        template: Template,
        initialize: function(options) {
            Backbone.View.prototype.initialize.apply(this, arguments);
            this._compiledTemplate = _.template(this.template);
            this._options = options;
            this._collector = new MeetingDataCollector();
        },
        render: function() {
            var labels = TimeUtil.getTimeLabels();
            this.$el.html(this._compiledTemplate({
                monthLabels: labels
            }));
            var collector = this._collector;
            this.$(".month-view").each(function(i){
                var el = $(this);
                var monthView = new MonthView({
                    el: el,
                    date: el.attr("name"),
                    index: i,
                    collector: collector
                });
                monthView.render();
            });
            new SummaryView({
                el: this.$(".summary-container"),
                collector: collector,
                labels: labels
            });
            new AnalysisView({
                el: this.$(".analysis-container"),
                collector: collector,
                labels: labels
            });
            return this;
        }
    });
});
