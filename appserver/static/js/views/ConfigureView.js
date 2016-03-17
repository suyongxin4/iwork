define([
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'app/utils/RequestUtil',
    'contrib/text!app/templates/ConfigureView.html'
], function(
    $,
    _,
    Backbone,
    Bootstrap,
    RequestUtil,
    Template
) {
    return Backbone.View.extend({
        template: Template,
        initialize: function() {
            Backbone.View.prototype.initialize.apply(this, arguments);
            this._compiledTemplate = _.template(this.template);
        },
        events: {
            "submit form": function(e) {
                e.preventDefault();
                var data = {
                    username: this.$("#input-email-address").val(),
                    password: this.$("#input-password").val()
                };
                this.$("div.hint").hide();
                var that = this;
                RequestUtil.sendRequest("save_iwork_settings", {
                    iwork_settings: JSON.stringify(data)
                }).done(function() {
                    that.$("div.hint").show();
                });
            }
        },
        render: function() {
            this.$el.html(this._compiledTemplate({}));
            this.renderFormContent();
            return this;
        },
        renderFormContent: function() {
            var that = this;
            this.disableInputs();
            RequestUtil.sendRequest("get_iwork_settings")
                .done(function(response) {
                    that.enableInputs();
                    var settings = JSON.parse(response.entry[0].content.iwork_settings);
                    that.$("#input-email-address").val(settings.username);
                });
        },
        enableInputs: function() {
            this.$("input").removeAttr("disabled");
        },
        disableInputs: function() {
            this.$("input").attr("disabled", "disabled");
        }
    });
});
