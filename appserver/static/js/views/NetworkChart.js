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

    function getFirstName(d){
        var str, splitter;
        if (d.context.name){
            str = d.context.name;
            splitter = " ";
        } else {
            str = d.key;
            splitter = "@";
        }
        var index = str.lastIndexOf(splitter);
        if (index < 0){
            index = str.length;
        }
        index = Math.min(index, 11);
        return str.substring(0, index);
    }

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
    function getPieChartData(data){
        if (data.sentTo || data.receivedFrom){
            return [data.sentTo, data.receivedFrom];
        } else {
            return [data.sent, data.received];
        }
    }

    function getPalette(data){
        if (data.sentTo || data.receivedFrom){
            return ["#ccebc5", "#2b8cbe"];
        } else {
            return ["#d9f0a3", "#238443"];
        }
    }

    function onNodeHover(el, data){
        d3.event.preventDefault();
        d3.event.stopPropagation();
        d3.select(el).select("text.data-label")
            .transition().duration(DURATION / 2).attr("opacity", 0)
            .each("end", function(d){
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
        this.showTooltip(el, data);
    }

    function onNodeUnhover(el, data){
        d3.event.preventDefault();
        d3.event.stopPropagation();
        d3.select(el).select("text.data-label")
            .transition().duration(DURATION / 2).attr("opacity", 0)
            .each("end", function(){
                var selection = d3.select(this);
                selection.text(getFirstName);
            }).transition().duration(DURATION / 2).attr("opacity", 1);
        if (data.pie){
            data.pie.destroy();
            delete data.pie;
        }
        this.hideTooltip();
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
            var orgMap = this._data.orgMap;
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
                    key: key,
                    context: orgMap[key] || {},
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
                    key: key,
                    context: orgMap[key] || {},
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
                key: this._data.me,
                context: {
                    name: "You"
                },
                radius: this._maxRadius,
                sent: totalSent,
                received: totalReceived,
                total: totalSent + totalReceived,
                px: this._renderWidth / 2,
                py: this._renderHeight / 2,
                fixed: true
            };
            nodes.forEach(function(node) {
                node.radius = Math.round(sizeScale(node.total));
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
            node.exit().each(function(d){
                if (d.pie){
                    d.pie.destroy();
                    delete d.pie;
                }
            }).remove();

            nodeGroup.select(".root-node").attr("opacity", 1).attr("transform", function(d){
                d.x = d.px;
                d.y = d.py;
                return "translate(" + d.px + ", " + d.py + ")";
            });
            node.each(function(d){
                if (d.pie){
                    d.pie.destroy();
                    delete d.pie;
                }
                var n = d3.select(this);
                if (n.classed("root-node")){
                    return;
                }
                if (!n.attr("transform")){
                    n.attr("opacity", 0);
                } else {
                    var matrix = n.node().getCTM();
                    d.px = matrix.e;
                    d.py = matrix.f;
                    d.x = matrix.e;
                    d.y = matrix.f;
                }
            });
            node.on("mouseover", null);
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
                return d.key;
            });

            var text = node.select("text.data-label");
            if (!text.node()){
                if (this._showDataLabel){
                    text = node.append("text").classed("data-label", true);
                }
            } else if (!this._showDataLabel){
                text.remove();
            }
            if (this._showDataLabel){
                text.text(getFirstName).attr("opacity", 0).transition().duration(DURATION).attr("opacity", 1);
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
            var onmouseover = onNodeHover.bind(this);
            var onmouseleave = onNodeUnhover.bind(this);
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
                }).on("mouseenter", function(d, i){
                    onmouseover(this, d, i);
                }).on("mouseleave", function(d, i){
                    onmouseleave(this, d, i);
                });
            });
            force.start();
            for (var i = 0; i < 100; ++i){
                force.tick();
            }
            force.stop();
        },
        showTooltip: function(){

        },
        hideTooltip: function(){

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
