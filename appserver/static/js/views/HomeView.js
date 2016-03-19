define([
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'moment',
    'contrib/text!app/templates/HomeView.html',
    'app/views/MonthView'
], function(
    $,
    _,
    Backbone,
    Bootstrap,
    moment,
    Template,
    MonthView
) {
    function getTimeLabels(){
        var current = moment();
        current.startOf("month");
        var lastMonth = current.clone().subtract(1, "month");
        var lastYear = current.clone().subtract(1, "year");
        var ret = [];
        while (lastYear.isSameOrBefore(lastMonth)){
            ret.push(lastYear.format("YYYY-MM"));
            lastYear.add(1, "month");
        }
        return ret;
    }

    return Backbone.View.extend({
        template: Template,
        initialize: function(options) {
            Backbone.View.prototype.initialize.apply(this, arguments);
            this._compiledTemplate = _.template(this.template);
            this._options = options;
        },
        render: function() {
            this.$el.html(this._compiledTemplate({
                monthLabels: getTimeLabels()
            }));
            this.$(".month-view").each(function(){
                var el = $(this);
                var monthView = new MonthView({
                    el: el,
                    date: el.attr("name")
                });
                monthView.render();
            });
            return this;
        }
    });
});
