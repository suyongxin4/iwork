define([
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'd3',
    'fullcalendar',
    'contrib/text!app/templates/HomeView.html'
], function(
    $,
    _,
    Backbone,
    Bootstrap,
    d3,
    Fullcalendar,
    Template
) {
    return Backbone.View.extend({
        template:Template,
        initialize: function(options){
            Backbone.View.prototype.initialize.apply(this, arguments);
            this._compiledTemplate = _.template(this.template);
            this._options = options;
        },
        render: function() {
            this.$el.html(this._compiledTemplate({}));
            this.$(".calendar").fullCalendar();
            return this;
        }
    });
});
