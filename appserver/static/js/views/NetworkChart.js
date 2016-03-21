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
        if (data.fixed) {
            return [data.sent, data.recv];
        } else {
            return [data.sentTo, data.recvFr];
        }
    }

    function getPalette(data) {
        if (data.fixed) {
            return ["#d9f0a3", "#238443"];
        } else {
            return ["#ccebc5", "#2b8cbe"];
        }
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
        var r2 = target.radius - 14;

        var dx = x1 - x2;
        var dy = y1 - y2;
        var dr = Math.sqrt(dx * dx + dy * dy);

        x1 = x1 - dx * r1 / dr;
        y1 = y1 - dy * r1 / dr;
        x2 = x2 + dx * r2 / dr;
        y2 = y2 + dy * r2 / dr;
        dx = x1 - x2;
        dy = y1 - y2;
        dr = Math.sqrt(dx * dx + dy * dy);
        return "M" + x1 + "," + y1 +
            "A" + dr + "," + dr +
            " 0 0,1 " + x2 + "," +y2;
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
            var nodes = [];
            var sizeScale = d3.scale.linear();
            sizeScale.range([Math.max(size / 32, 10), size / 8]);
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

            this._maxRadius = size / 6;
            var me = this._data.me;
            this._rootNode = {
                key: me,
                text: "You",
                title: me,
                context: {
                    name: "You"
                },
                radius: this._maxRadius,
                sent: totalSent,
                recv: totalRecv,
                sentToConnection:[],
                recvFrConnection:[],
                total: totalSent + totalRecv,
                px: this._renderWidth / 2,
                py: this._renderHeight / 2,
                fixed: true
            };
            nodes.forEach(function(node) {
                node.radius = Math.round(sizeScale(node.total));
            });
            nodes.sort(function(a, b) {
                return b.total - a.total;
            });
            this._fullNodes = nodes;
            this._nodes = nodes.slice(0, this._number);
            this._nodes.unshift(this._rootNode);
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
                .attr("class", function(d, i) {
                    return i ? "node" : "node root-node";
                });
            node.exit().each(function(d) {
                if (d.pie) {
                    d.pie.destroy();
                    delete d.pie;
                }
            }).remove();

            nodeGroup.select(".root-node").attr("opacity", 1).attr("transform",
                function(d) {
                    d.x = d.px;
                    d.y = d.py;
                    return "translate(" + d.px + ", " + d.py + ")";
                });
            node.each(function(d) {
                if (d.pie) {
                    d.pie.destroy();
                    delete d.pie;
                }
                var n = d3.select(this);
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
                    text.text(function(d){
                        return d.text;
                    }).each(ellipsis).attr("opacity", 0)
                        .transition().duration(DURATION).attr("opacity", 1);
                }
                n.attr("data-key", d.key);
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
            node.on("mouseenter", null).on("mouseleave", null);
            var radiusTransition = nodeGroup.transition().duration(DURATION);
            radiusTransition.selectAll(".node").select("circle").attr("r",
                function(d) {
                    return d.radius - 2;
                });

            var force = d3.layout.force()
                .nodes(nodes)
                .gravity(0.05)
                .charge(function(d) {
                    return d.fixed ? -1500 : -10;
                })
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
                    if (n.classed("root-node")) {
                        return;
                    }
                    if (n.attr("transform")) {
                        radiusTransition.transition().duration(
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
                        radiusTransition.transition().duration(
                                DURATION)
                            .select(".node:nth-child(" + (i + 1) +
                                ")").attr("opacity", 1);
                    }
                }).on("mouseenter", function(d, i) {
                    onmouseover(this, d, i);
                }).on("mouseleave", function(d, i) {
                    onmouseleave(this, d, i);
                });
            });
            force.start();
            for (var i = 0; i < 100; ++i) {
                force.tick();
            }
            force.stop();
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
            var linkTo = linkContainer.selectAll("path.link-to").data(sentToLinks);
            linkTo.enter().append("path").classed("link-to", true).classed("link", true);
            linkTo.exit().transition().duration(DURATION).attr("opacity", 0)
                .each("end", function(){
                    d3.select(this).remove();
                });
            var meData = nodeContainer.select(".node[data-key='" + me + "']").data()[0];
            linkTo.each(function(key) {
                var keyData = nodeContainer.select(".node[data-key='" + key +
                    "']").data()[0];
                var n = d3.select(this);
                if (n.attr("d")){
                    d3.select(this).attr("opacity", 0)
                    .transition().duration(DURATION).attr("d", getPathDef(meData, keyData)).attr("opacity", 1);
                } else {
                    d3.select(this).attr("d", getPathDef(meData, keyData)).attr("opacity", 0)
                    .transition().duration(DURATION).attr("opacity", 1);
                }
            });
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
            this._nodes.unshift(this._rootNode);
            this.renderNetWork();
        }

    });
});
