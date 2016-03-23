require([
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'splunkjs/mvc/headerview',
    'app/views/CalendarView'
], function(
    $,
    _,
    Backbone,
    Bootstrap,
    HeaderView,
    CalendarView
) {
    var headerView = new HeaderView({
        id: 'header',
        section: 'dashboards',
        el: $('.header'),
        acceleratedAppNav: true
    });
    headerView.render();

    var homeView = new CalendarView({
        el: $('.root-view')
    });
    homeView.render();
});
