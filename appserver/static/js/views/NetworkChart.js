define([
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'd3',
    'app/views/PieChart'
], function(
    $,
    _,
    Backbone,
    Bootstrap,
    d3,
    PieChart
) {
    var DURATION = 500;
    var PADDING = 30;
    var HALF_PADDING = PADDING / 2;


    function collide(node, r) {
        var nx1 = node.x - r,
            nx2 = node.x + r,
            ny1 = node.y - r,
            ny2 = node.y + r;
        return function(quad, x1, y1, x2, y2) {
            if (quad.point && (quad.point !== node)) {
                var x = node.x - quad.point.x,
                    y = node.y - quad.point.y,
                    l = Math.sqrt(x * x + y * y),
                    r = node.radius + quad.point.radius,
                    f = quad.point.fixed;
                if (l < r) {
                    if (f) {
                        l = (l - r) / l;
                        node.x -= x *= l;
                        node.y -= y *= l;
                    } else {
                        l = (l - r) / l * 0.5;
                        node.x -= x *= l;
                        node.y -= y *= l;
                        quad.point.x += x;
                        quad.point.y += y;
                    }
                }
            }
            return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        };
    }

    function getPieChartData(data) {
        return [data.sentTo, data.recvFr];
    }

    function getPalette(data) {
        return ["#78c679", "#2b8cbe"];
    }

    function ellipsis(d) {
        var width = d.radius * 2 - 4;
        var self = d3.select(this),
            textLength = self.node().getComputedTextLength(),
            text = self.text();
        while (textLength > width && text.length > 0) {
            text = text.slice(0, -1);
            self.text(text + '...');
            textLength = self.node().getComputedTextLength();
        }
    }

    function getPathDef(source, target){
        var x1 = source.x;
        var y1 = source.y;
        var r1 = source.radius - 2;

        var x2 = target.x;
        var y2 = target.y;
        var r2 = target.radius - 2;

        var dx = x1 - x2;
        var dy = y1 - y2;
        var dr = Math.sqrt(dx * dx + dy * dy);

        var vx = -dx / 2;
        var vy = -dy / 2;

        var cx = x1 + vx - vy * Math.sqrt(3);
        var cy = y1 + vy + vx * Math.sqrt(3);

        var intersects = intersection(x1, y1, r1, cx, cy, dr);
        if (intersects){
            x1 = intersects[2];
            y1 = intersects[3];
        }
        intersects = intersection(x2, y2, r2, cx, cy, dr);
        if (intersects){
            x2 = intersects[0];
            y2 = intersects[1];
        }
        return "M" + x1 + "," + y1 +
            "A" + dr + "," + dr +
            " 0 0,1 " + x2 + "," +y2;
    }

    function intersection(x0, y0, r0, x1, y1, r1) {
        var a, dx, dy, d, h, rx, ry;
        var x2, y2;

        /* dx and dy are the vertical and horizontal distances between
         * the circle centers.
         */
        dx = x1 - x0;
        dy = y1 - y0;

        /* Determine the straight-line distance between the centers. */
        d = Math.sqrt((dy*dy) + (dx*dx));

        /* Check for solvability. */
        if (d > (r0 + r1)) {
            /* no solution. circles do not intersect. */
            return false;
        }
        if (d < Math.abs(r0 - r1)) {
            /* no solution. one circle is contained in the other */
            return false;
        }

        /* 'point 2' is the point where the line through the circle
         * intersection points crosses the line between the circle
         * centers.
         */

        /* Determine the distance from point 0 to point 2. */
        a = ((r0*r0) - (r1*r1) + (d*d)) / (2.0 * d) ;

        /* Determine the coordinates of point 2. */
        x2 = x0 + (dx * a/d);
        y2 = y0 + (dy * a/d);

        /* Determine the distance from point 2 to either of the
         * intersection points.
         */
        h = Math.sqrt((r0*r0) - (a*a));

        /* Now determine the offsets of the intersection points from
         * point 2.
         */
        rx = -dy * (h/d);
        ry = dx * (h/d);

        /* Determine the absolute intersection points. */
        var xi = x2 + rx;
        var xi_prime = x2 - rx;
        var yi = y2 + ry;
        var yi_prime = y2 - ry;

        return [xi, yi, xi_prime, yi_prime];
    }
    function onNodeHover(el, data) {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        d3.select(el).select("text.data-label")
            .transition().duration(DURATION / 2).attr("opacity", 0)
            .each("end", function(d) {
                var selection = d3.select(this);
                selection.text(d.total);
            }).transition().duration(DURATION / 2).attr("opacity", 1);
        data.pie = new PieChart({
            el: $(el),
            data: getPieChartData(data),
            palette: getPalette(data),
            radius: data.radius
        });
        data.pie.render();
        this.showLinks(el, data);
    }

    function onNodeUnhover(el, data) {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        d3.select(el).select("text.data-label")
            .transition().duration(DURATION / 2).attr("opacity", 0)
            .each("end", function(d) {
                var selection = d3.select(this);
                selection.text(d.text).each(ellipsis);
            }).transition().duration(DURATION / 2).attr("opacity", 1);
        if (data.pie) {
            data.pie.destroy();
            delete data.pie;
        }
        this.hideLinks(el, data);
    }

    return Backbone.View.extend({
        initialize: function(options) {
            Backbone.View.prototype.initialize.apply(this, arguments);
            options = options || {};
            this._container = d3.select(this.el);
            this._width = this.$el.width();
            this._height = this.$el.height();
            this._renderWidth = this._width - PADDING;
            this._renderHeight = this._height - PADDING;
            this._showDataLabel = options.showDataLabel || true;
            this._number = +options.number;
            if (!_.isNaN(this._number)){
                this._number = 50;
            }
        },
        render: function() {
            if (!this._data) {
                return this;
            }
            this.calculate();
            this.renderNetWork();
            return this;
        },
        calculate: function() {
            var size = Math.min(this._renderWidth, this._renderHeight);
            var maxr = this._maxRadius = size / 6;
            var minr = Math.max(size / 32, 10);
            var nodes = [];
            var sizeScale = d3.scale.linear();
            sizeScale.range([minr, maxr]);
            var data = this._data.data;
            var totalSent = 0,
                totalRecv = 0,
                max = 0;
            _.each(data, function(d) {
                totalSent += d.sentTo;
                totalRecv += d.recvFr;
                if (d.total > max) {
                    max = d.total;
                }
                nodes.push(d);
            });
            sizeScale.domain([0, max]);

            // var me = this._data.me;
            // this._rootNode = {
            //     key: me,
            //     text: "You",
            //     title: me,
            //     context: {
            //         name: "You"
            //     },
            //     radius: this._maxRadius,
            //     sent: totalSent,
            //     recv: totalRecv,
            //     sentToConnection:[],
            //     recvFrConnection:[],
            //     total: totalSent + totalRecv,
            //     px: this._renderWidth / 2,
            //     py: this._renderHeight / 2,
            //     fixed: true
            // };
            nodes.forEach(function(node) {
                node.radius = Math.round(sizeScale(node.total));
            });
            nodes.sort(function(a, b) {
                return b.total - a.total;
            });
            this._fullNodes = nodes;
            this._nodes = nodes.slice(0, this._number);
        },
        renderNetWork: function() {
            var nodes = this._nodes;
            var width = this._renderWidth;
            var height = this._renderHeight;
            var svg = this._container;
            var maxRadius = this._maxRadius;
            var showDataLabel = this._showDataLabel;
            if (!svg.select('defs').node()) {
                svg.append('svg:defs').append('svg:marker')
                    .attr('id', 'end-arrow-blue')
                    .attr('viewBox', '0 -5 10 10')
                    .attr('refX', 6)
                    .attr('markerWidth', 3)
                    .attr('markerHeight', 3)
                    .attr('orient', 'auto')
                    .append('svg:path')
                    .attr('d', 'M0,-5L10,0L0,5')
                    .attr('fill', '#2b8cbe');
                svg.append('svg:defs').append('svg:marker')
                    .attr('id', 'end-arrow-green')
                    .attr('viewBox', '0 -5 10 10')
                    .attr('refX', 6)
                    .attr('markerWidth', 3)
                    .attr('markerHeight', 3)
                    .attr('orient', 'auto')
                    .append('svg:path')
                    .attr('d', 'M0,-5L10,0L0,5')
                    .attr('fill', '#004529');
            }
            var nodeGroup = svg.select("g.node-group");
            if (!nodeGroup.node()) {
                nodeGroup = svg.append("g").classed("node-group", true);
                nodeGroup.attr("transform",
                    "translate(" + HALF_PADDING + ", " + HALF_PADDING + ")"
                );
            }
            var linkGroup = svg.select("g.link-group");
            if (!linkGroup.node()) {
                linkGroup = svg.append("g").classed("link-group", true);
                linkGroup.attr("opacity", 0.8).attr("transform",
                    "translate(" + HALF_PADDING + ", " + HALF_PADDING + ")"
                );
            }
            var node = nodeGroup.selectAll(".node")
                .data(this._nodes);
            node.enter().append("g")
                .attr("class", "node");
            node.exit().each(function(d) {
                if (d.pie) {
                    d.pie.destroy();
                    delete d.pie;
                }
            }).remove();

            node.on("mouseenter", null).on("mouseleave", null);
            node.each(function(d) {
                if (d.pie) {
                    d.pie.destroy();
                    delete d.pie;
                }
                var n = d3.select(this);
                n.attr("data-key", d.key);
                var circle = n.select("circle");
                if (!circle.node()) {
                    circle = n.append("circle");
                }
                if (!circle.attr("r")) {
                    circle.attr("r", 0);
                }
                var title = circle.select("title");
                if (!title.node()) {
                    title = circle.append("title");
                }
                title.text(function(d) {
                    return d.title;
                });

                var text = n.select("text.data-label");
                if (!text.node()) {
                    if (showDataLabel) {
                        text = n.append("text").classed("data-label", true);
                    }
                } else if (!showDataLabel) {
                    text.remove();
                }
                if (showDataLabel) {
                    if (text.text() !== d.text){
                        text.text(function(d){
                            return d.text;
                        }).each(ellipsis).attr("opacity", 0)
                        .transition().duration(DURATION).attr("opacity", 1);
                    }
                }
                if (n.classed("root-node")) {
                    return;
                }
                if (!n.attr("transform")) {
                    n.attr("opacity", 0);
                } else {
                    var matrix = n.node().getCTM();
                    d.px = matrix.e;
                    d.py = matrix.f;
                    d.x = matrix.e;
                    d.y = matrix.f;
                }
            });
            var radiusTransition = nodeGroup.transition().duration(DURATION);
            radiusTransition.selectAll(".node").select("circle").attr("r",
                function(d) {
                    return d.radius - 2;
                });

            var force = d3.layout.force()
                .nodes(nodes)
                .gravity(0.05)
                .charge(0)
                .size([width, height]);
            force.on("tick", function() {
                var q = d3.geom.quadtree(nodes),
                    i = 0,
                    n = nodes.length;

                while (++i < n) q.visit(collide(nodes[i], nodes[i].radius +
                    maxRadius));
                node.each(function(d) {
                    var r = d.radius;
                    d.x = Math.max(r, Math.min(width - r, d.x));
                    d.y = Math.max(r, Math.min(height - r, d.y));
                });
            });
            var onmouseover = onNodeHover.bind(this);
            var onmouseleave = onNodeUnhover.bind(this);
            force.on("end", function() {
                node.each(function(d, i) {
                    var n = d3.select(this);
                    var transition;
                    if (n.attr("transform")) {
                        transition = radiusTransition.transition().duration(
                                DURATION)
                            .select(".node:nth-child(" + (i + 1) +
                                ")").attr("transform", function(
                                d) {
                                return "translate(" + d.x +
                                    ", " + d.y + ")";
                            }).attr("opacity", 1);
                    } else {
                        n.attr("transform", function(d) {
                            return "translate(" + d.x +
                                ", " + d.y + ")";
                        });
                        transition = radiusTransition.transition().duration(
                                DURATION)
                            .select(".node:nth-child(" + (i + 1) +
                                ")").attr("opacity", 1);
                    }
                    transition.each("end", function(){
                        d3.select(this).on("mouseenter", function(d) {
                            onmouseover(this, d, i);
                        }).on("mouseleave", function(d) {
                            onmouseleave(this, d, i);
                        });
                    });
                });
            });
            force.start();
            for (var i = 0; i < 100; ++i) {
                force.tick();
            }
            force.stop();
        },
        stopListening: function(){
            this._container.selectAll(".node-group .node").on("mouseenter", null).on("mouseleave", null);
        },
        showLinks: function(el, data) {
            var sentToConnection = data.sentToConnection;
            var recvFrConnection = data.recvFrConnection;
            var allConnection = _.union(sentToConnection, recvFrConnection);
            var me = this._data.me;
            var sentToLinks = [];
            var recvFrLinks = [];
            var nodeContainer = this._container.select(".node-group");
            nodeContainer.selectAll(".node").each(function(d) {
                var n = d3.select(this);
                var key = d.key;
                if (key === data.key || key === me || allConnection.indexOf(
                        key) > -1) {
                    if (d.key === me) {
                        if (data.sentTo){
                            sentToLinks.push(data.key);
                        }
                        if (data.recvFr){
                            recvFrLinks.push(me);
                        }
                    }
                    if (sentToConnection.indexOf(key) > -1) {
                        sentToLinks.push(key);
                    }
                    if (recvFrConnection.indexOf(key) > -1) {
                        recvFrLinks.push(key);
                    }
                } else {
                    n.transition().duration(DURATION).attr("opacity",
                        0.2);
                }
            });
            var linkContainer = this._container.select("g.link-group");
            // var linkTo = linkContainer.selectAll("path.link-to").data(sentToLinks);
            // linkTo.enter().append("path").classed("link-to", true).classed("link", true);
            // linkTo.exit().transition().duration(DURATION).attr("opacity", 0)
            //     .each("end", function(){
            //         d3.select(this).remove();
            //     });
            // var meData = nodeContainer.select(".node[data-key='" + me + "']").data()[0];
            // linkTo.each(function(key) {
            //     var keyData = nodeContainer.select(".node[data-key='" + key +
            //         "']").data()[0];
            //     var n = d3.select(this);
            //     if (n.attr("d")){
            //         d3.select(this).attr("opacity", 0)
            //         .transition().duration(DURATION).attr("d", getPathDef(meData, keyData)).attr("opacity", 1);
            //     } else {
            //         d3.select(this).attr("d", getPathDef(meData, keyData)).attr("opacity", 0)
            //         .transition().duration(DURATION).attr("opacity", 1);
            //     }
            // });
            var linkFrom = linkContainer.selectAll("path.link-from").data(recvFrLinks);
            linkFrom.enter().append("path").classed("link-from", true).classed("link", true);
            linkFrom.exit().transition().duration(DURATION).attr("opacity", 0)
                .each("end", function(){
                    d3.select(this).remove();
                });
            linkFrom.each(function(key) {
                var keyData = nodeContainer.select(".node[data-key='" + key +
                    "']").data()[0];

                var n = d3.select(this);
                if (n.attr("d")){
                    d3.select(this).attr("opacity", 0)
                    .transition().duration(DURATION).attr("d", getPathDef(data, keyData)).attr("opacity", 1);
                } else {
                    d3.select(this).attr("d", getPathDef(data, keyData)).attr("opacity", 0)
                    .transition().duration(DURATION).attr("opacity", 1);
                }
            });
        },
        hideLinks: function(el, data) {
            var sentToConnection = data.sentToConnection;
            var recvFrConnection = data.recvFrConnection;
            var allConnection = _.union(sentToConnection, recvFrConnection);
            var me = this._data.me;
            var nodeContainer = this._container.select(".node-group");
            nodeContainer.selectAll(".node").each(function(d) {
                var n = d3.select(this);
                var key = d.key;
                if (key === data.key || key === me || allConnection.indexOf(
                        key) > -1) {

                } else {
                    n.transition().duration(DURATION).attr("opacity", 1);
                }
            });
            var linkContainer = this._container.select("g.link-group");
            linkContainer.selectAll("path.link-to")
                .transition().duration(DURATION).attr("opacity", 0)
                .each("end", function(){
                    d3.select(this).remove();
                });
            linkContainer.selectAll("path.link-from")
                .transition().duration(DURATION).attr("opacity", 0)
                .each("end", function(){
                    d3.select(this).remove();
                });
        },
        size: function(_) {
            if (_.width) {
                this._width = _.width;
                this._renderWidth = this._width - PADDING;
            }
            if (_.height) {
                this._height = _.height;
                this._renderHeight = this._height - PADDING;
            }
            return this.render();
        },
        data: function(_) {
            this._data = _;
            return this.render();
        },
        setNumber: function(n){
            n = +n;
            if (!_.isNaN(n)){
                this._number = n;
            }
            if (!this._fullNodes){
                return;
            }
            this._nodes = this._fullNodes.slice(0, this._number);
            this.renderNetWork();
        }

    });
});
