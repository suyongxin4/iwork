define([
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'moment',
    'app/utils/TimeUtil',
    'contrib/text!app/templates/SummaryView.html'
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
            this._collector.onChange("summary", render);
        },
        render: function() {
            this.$el.html(this._compiledTemplate(this.getTemplateParameters()));
        },
        getTemplateParameters: function(){
            var ret = {
                totalTime: this._collector.getTotalTime(),
                totalNumber: this._collector.getTotalNumber(),
                weeks: TimeUtil.getWeeks()
            };
            return ret;
        }
    });
});
