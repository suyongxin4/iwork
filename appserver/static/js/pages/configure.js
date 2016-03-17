require([
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'splunkjs/mvc/headerview',
    'app/views/ConfigureView'
], function(
    $,
    _,
    Backbone,
    Bootstrap,
    HeaderView,
    ConfigureView
) {
    var headerView = new HeaderView({
        id: 'header',
        section: 'dashboards',
        el: $('.header'),
        acceleratedAppNav: true
    });
    headerView.render();

    var configureView = new ConfigureView({
        el: $('.root-view')
    });
    configureView.render();
});
