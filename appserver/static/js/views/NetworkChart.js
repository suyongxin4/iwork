define([
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'd3',
    'moment',
    'ElementQueries',
    'ResizeSensor',
    "splunkjs/mvc/searchmanager",
    'contrib/text!app/templates/EmailView.html',
    'app/views/TimeAxis',
    'app/views/NetworkChart'
], function(
    $,
    _,
    Backbone,
    Bootstrap,
    d3,
    moment,
    ElementQueries,
    ResizeSensor,
    SearchManager,
    Template,
    TimeAxis,
    NetworkChart
) {
    var DURATION = 500;
    var PADDING = 30;
    var HALF_PADDING = PADDING / 2;

    return Backbone.View.extend({
        template: Template,
        initialize: function(options) {
            Backbone.View.prototype.initialize.apply(this, arguments);
            this._container = d3.select(this.el);
            this._width = this.$el.width();
            this._height = this.$el.height();
            this._renderWidth = this._width - PADDING;
            this._renderHeight = this._height - PADDING;
        },
        render: function() {
            var that = this;
            if (!this._data) {
                return this;
            }
            this.calculate();
            this.renderNetWork();
            return this;
        },
        calculate: function() {
            this._nodes = [{
                name: "You",
                charge: -50,
            }];
            var sent = this._data.sent;
            var received = this._data.received;
            var key, value, node;
            for (key in sent) {
                value = sent[key];
                node = {
                    name: key,
                    sentTo: value,
                    receivedFrom: 0
                };
                if (received.hasOwnProperty(key)) {
                    node.receivedFrom = received[key];
                }
                this._nodes.push(node);
            }
            for (key in received) {
                if (sent.hasOwnProperty(key)) {
                    continue;
                }
                value = received[key];
                node = {
                    name: key,
                    sentTo: 0,
                    receivedFrom: value
                };
                this._nodes.push(node);
            }
            this._links = [];
            this._nodes.forEach(function(node, index) {
                if (index === 0) {
                    return;
                }
                this._links.push({
                    source: 0,
                    target: index,
                    sentTo: node.sentTo,
                    receivedFrom: node.receivedFrom
                });
            }, this);
        },
        renderNetWork: function() {
            var svg = this._container;
            var force = d3.layout.force()
                .nodes(this._nodes)
                .links(this._links)
                .charge(function(d) {
                    if (d.charge) {
                        return d.charge;
                    }
                    return -Math.sqrt(d.sentTo + d.receivedFrom);
                })
                .linkDistance(function(d) {
                    if (!d.sentTo){
                        return 200;
                    }
                    return Math.sqrt(d.sentTo) * 50;
                })
                .size([this._renderWidth, this._renderHeight])
                .start();

            var link = svg.selectAll(".link")
                .data(this._links);
            link.enter().append("line")
                .attr("class", "link")
                .style("stroke-width", function(d) {
                    if (!d.receivedFrom){
                        return 1;
                    }
                    return Math.sqrt(d.receivedFrom);
                })
                .style("stroke", "#999999");
            link.exit().remove();

            var node = svg.selectAll(".node")
                .data(this._nodes);
            node.enter().append("circle")
                .attr("class", "node")
                .attr("r", function(d) {
                    if (d.charge) {
                        return 30;
                    }
                    return Math.sqrt(d.sentTo + d.receivedFrom)*3;
                })
                .style("fill", "#1f77b4")
                .style("stroke", "#333333")
                .call(force.drag);
            node.exit().remove();

            node.append("title")
                .text(function(d) {
                    return d.name;
                });

            force.on("tick", function() {
                link.attr("x1", function(d) {
                        return d.source.x;
                    })
                    .attr("y1", function(d) {
                        return d.source.y;
                    })
                    .attr("x2", function(d) {
                        return d.target.x;
                    })
                    .attr("y2", function(d) {
                        return d.target.y;
                    });

                node.attr("cx", function(d) {
                        return d.x;
                    })
                    .attr("cy", function(d) {
                        return d.y;
                    });
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
        }
    });
});
