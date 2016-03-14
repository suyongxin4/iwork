require([
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'splunkjs/mvc/headerview',
    'app/views/EmailView'
], function(
    $,
    _,
    Backbone,
    Bootstrap,
    HeaderView,
    EmailView
) {
    var headerView = new HeaderView({
        id: 'header',
        section: 'dashboards',
        el: $('.header'),
        acceleratedAppNav: true
    });
    headerView.render();

    var emailView = new EmailView({
        el: $('.root-view')
    });
    emailView.render();
});
