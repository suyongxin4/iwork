require([
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'splunkjs/mvc/headerview'
], function(
    $,
    _,
    Backbone,
    Bootstrap,
    HeaderView
) {
    var headerView = new HeaderView({
        id: 'header',
        section: 'dashboards',
        el: $('.header'),
        acceleratedAppNav: true
    });
    headerView.render();
});
