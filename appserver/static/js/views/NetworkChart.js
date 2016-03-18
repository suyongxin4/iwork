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
            var nodes = [];
            var sizeScale = d3.scale.linear();
            sizeScale.range([Math.max(size / 32, 10), size / 8]);
            var sent = this._data.sent;
            var received = this._data.received;
            var key, value, node, total;
            var totalSent = 0,
                totalReceived = 0,
                max = 0;
            for (key in sent) {
                if (!sent.hasOwnProperty(key)) {
                    continue;
                }
                total = value = sent[key];
                totalSent += value;
                node = {
                    name: key,
                    sentTo: value,
                    receivedFrom: 0
                };
                if (received.hasOwnProperty(key)) {
                    value = received[key];
                    node.receivedFrom = value;
                    total += value;
                    totalReceived += value;
                }
                node.total = total;
                if (total > max) {
                    max = total;
                }
                nodes.push(node);
            }
            for (key in received) {
                if (!received.hasOwnProperty(key)) {
                    continue;
                }
                if (sent.hasOwnProperty(key)) {
                    continue;
                }
                total = value = received[key];
                totalReceived += value;
                node = {
                    name: key,
                    sentTo: 0,
                    receivedFrom: value
                };
                node.total = total;
                if (total > max) {
                    max = total;
                }
                nodes.push(node);
            }
            sizeScale.domain([0, max]);

            this._maxRadius = size / 6;
            this._rootNode = {
                name: "You",
                radius: this._maxRadius,
                sent: totalSent,
                received: totalReceived,
                total: totalSent + totalReceived,
                px: this._renderWidth / 2,
                py: this._renderHeight / 2,
                fixed: true
            };
            nodes.forEach(function(node) {
                node.radius = sizeScale(node.total);
            });
            nodes.sort(function(a, b){
                return b.total - a.total;
            });
            this._nodes = nodes.slice(0, 50);
            this._nodes.unshift(this._rootNode);
            // this._links = [];
            // this._nodes.forEach(function(node, index) {
            //     if (index === 0) {
            //         return;
            //     }
            //     this._links.push({
            //         source: 0,
            //         target: index,
            //         sentTo: node.sentTo,
            //         receivedFrom: node.receivedFrom
            //     });
            // }, this);
        },
        renderNetWork: function() {
            var nodes = this._nodes;
            var width = this._renderWidth;
            var height = this._renderHeight;
            var svg = this._container;
            var maxRadius = this._maxRadius;

            var nodeGroup = svg.select("g.node-group");
            if (!nodeGroup.node()) {
                nodeGroup = svg.append("g").classed("node-group", true);
            }
            var node = nodeGroup.selectAll(".node")
                .data(this._nodes);
            node.enter().append("g")
                .attr("class", function(d, i) {
                    return i ? "node" : "node root-node";
                });
            node.exit().remove();

            nodeGroup.select(".root-node").attr("opacity", 1).attr("transform", function(d){
                return "translate(" + d.px + ", " + d.py + ")";
            });
            node.each(function(){
                var n = d3.select(this);
                if (n.classed("root-node")){
                    return;
                }
                if (!n.attr("transform")){
                    n.attr("opacity", 0);
                }
            });

            var circle = node.select("circle");
            if (!circle.node()){
                circle = node.append("circle");
            }
            if (!circle.attr("r")){
                circle.attr("r", 0);
            }
            var radiusTransition = nodeGroup.transition().duration(DURATION);
            radiusTransition.selectAll(".node").select("circle").attr("r", function(d) {
                return d.radius - 2;
            });
            var title = circle.select("title");
            if (!title.node()) {
                title = circle.append("title");
            }
            title.text(function(d) {
                return d.name;
            });

            var text = node.select("text.text-label");
            if (!text.node()){
                if (this._showTextLabel){
                    text = node.append("text").classed("text-label", true);
                }
            } else if (!this._showTextLabel){
                text.remove();
            }
            if (this._showTextLabel){
                text.text(function(d){
                    return d.name;
                }).transition().duration(DURATION / 2).attr("opacity", 0)
                .transition().duration(DURATION / 2).attr("opacity", 1);
            }

            text = node.select("text.data-label");
            if (!text.node()){
                if (this._showDataLabel){
                    text = node.append("text").classed("data-label", true);
                }
            } else if (!this._showDataLabel){
                text.remove();
            }
            if (this._showDataLabel){
                text.text(function(d){
                    return d.total;
                }).attr("opacity", 0).transition().duration(DURATION).attr("opacity", 1);
            }
            var force = d3.layout.force()
                .nodes(nodes)
                // .links(this._links)
                .gravity(0.05)
                // .charge(-2000)
                .charge(function(d, i) {
                    return i ? 0 : -1500;
                })
                .size([width, height]);
            force.on("tick", function() {
                var q = d3.geom.quadtree(nodes),
                i = 0,
                n = nodes.length;

                while (++i < n) q.visit(collide(nodes[i], nodes[i].radius + maxRadius));
                node.each(function(d){
                    var r = d.radius;
                    d.x = Math.max(r, Math.min(width - r, d.x));
                    d.y = Math.max(r, Math.min(height - r, d.y));
                });
            });
            force.on("end", function(){
                node.each(function(d, i){
                    var n = d3.select(this);
                    if (n.classed("root-node")){
                        return;
                    }
                    if (n.attr("transform")){
                        radiusTransition.transition().duration(DURATION)
                            .select(".node:nth-child("+(i+1)+")").attr("transform", function(d) {
                                return "translate(" + d.x + ", " + d.y + ")";
                            }).attr("opacity", 1);
                    } else {
                        n.attr("transform", function(d) {
                            return "translate(" + d.x + ", " + d.y + ")";
                        });
                        radiusTransition.transition().duration(DURATION)
                            .select(".node:nth-child("+(i+1)+")").attr("opacity", 1);
                    }
                });
            });
            force.start();
            for (var i = 0; i < 300; ++i){
                force.tick();
            }
            force.stop();
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
        }
    });
});
