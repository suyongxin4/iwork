require([
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'splunkjs/mvc/headerview',
    'app/views/HomeView'
], function(
    $,
    _,
    Backbone,
    Bootstrap,
    HeaderView,
    HomeView
) {
    var headerView = new HeaderView({
        id: 'header',
        section: 'dashboards',
        el: $('.header'),
        acceleratedAppNav: true
    });
    headerView.render();

    var homeView = new HomeView({
        el: $('.root-view')
    });
    homeView.render();
});
