define([
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'd3'
], function(
    $,
    _,
    Backbone,
    Bootstrap,
    d3
) {
    return Backbone.View.extend({
        initialize: function(options) {
            Backbone.View.prototype.initialize.apply(this, arguments);
            options = options || {};
            this._container = d3.select(this.el);
            this._data = options.data || [];
            this._palette = options.palette || d3.scale.category10().range();
            this._radius = options.radius || 0;
            this.calculate();
        },
        calculate: function() {
            var total = 0;
            this._data.forEach(function(d) {
                total += d;
            });
            this._total = total;
            var parts = [];
            parts.length = this._data.length;
            if (total !== 0) {
                this._data.forEach(function(d, i) {
                    parts[i] = d / total;
                });
            }
            this._parts = parts;
        },
        render: function() {
            if (!this._data || !this._data.length || !this._radius) {
                return;
            }
            var that = this;
            var svg = this._container;
            var r = this._radius;
            var pieContainer = svg.select("g.pie-container");
            if (!pieContainer.node()) {
                pieContainer = svg.append("g").classed("pie-container", true);
            }
            this._transition = pieContainer.attr("opacity", 0).transition().duration(300).attr("opacity", 1);
            var arc = d3.svg.arc().outerRadius(r - 1).innerRadius(r * 0.5);
            var arcText = d3.svg.arc().outerRadius(r * 0.75).innerRadius(r *
                0.75);
            var pie = d3.layout.pie().sort(null).value(function(d) {
                return d;
            });
            var slices = pieContainer.selectAll("g.part").data(pie(this._data));
            slices.enter().append("g").classed("part", true);
            slices.exit().remove();
            slices.each(function(d, i) {
                var slice = d3.select(this);
                var path = slice.select("path");
                if (!path.node()) {
                    path = slice.append("path");
                    path.style("fill", that._palette[i]);
                }
                path.attr("d", arc);
                var text = slice.select("text");
                if (!text.node()) {
                    text = slice.append("text");
                }
                text.attr("transform", function(d) {
                    return "translate(" + arcText.centroid(d) +
                        ")";
                });
                var ratio = Math.round(that._parts[i] * 100);
                if (ratio && r >= 28) {
                    text.text(ratio + "%");
                }
            });

            return this;
        },
        destroy: function() {
            var pieContainer = this._container.select("g.pie-container");
            if (pieContainer.node()) {
                pieContainer.transition().duration(300).attr("opacity", 0).each("end", function(){
                    d3.select(this).remove();
                });
            }
            return this;
        }
    });
});
