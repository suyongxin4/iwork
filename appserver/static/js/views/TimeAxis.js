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

    function getEventPos(g) {
        var rect = g.getBoundingClientRect();
        var event = d3.event.sourceEvent || d3.event;
        var x = event.clientX;
        var y = event.clientY;
        return {
            x: x - rect.left,
            y: y - rect.top
        };
    }

    return Backbone.View.extend({
        initialize: function(options) {
            Backbone.View.prototype.initialize.apply(this, arguments);
            this._container = d3.select(this.el);
            this._width = this.$el.width();
            this._renderWidth = this._width - PADDING;
            this._labels = options.labels;
            this._indicatorStart = this._labels.length - 1;
            this._indicatorEnd = this._labels.length - 1;
        },
        render: function() {
            this.calculate();
            this.renderAxis();
            this.renderIndicator();
            return this;
        },
        renderAxis: function() {
            var container = this._container;
            var group = container.select("g.axis");
            if (!group.node()) {
                group = container.append("g").attr("class", "axis");
                group.attr("transform", "translate(" + HALF_PADDING + ", 15)");
            }
            var axisLine = group.selectAll("line.axis-line")
                .data([this._renderWidth]);
            axisLine.enter().append("line")
                .attr("class", "axis-line")
                .attr("x1", 0)
                .attr("y1", 5)
                .attr("y2", 5);
            axisLine.exit().remove();
            axisLine.attr("x2", function(d) {
                return d;
            });

            var axisTicks = group.selectAll("line.axis-tick").data(this._tickData);
            axisTicks.enter().append("line")
                .attr("class", "axis-tick")
                .attr("y1", 0)
                .attr("y2", 10);
            axisTicks.exit().remove();

            axisTicks.attr("x1", function(d) {
                return d;
            }).attr("x2", function(d) {
                return d;
            });

            var axisLabels = group.selectAll("text.axis-label").data(this._labelData);
            axisLabels.enter().append("text")
                .attr("class", "axis-label")
                .attr("text-anchor", "middle")
                .attr("y", 35);
            axisLabels.exit().remove();

            axisLabels.attr("x", function(d) {
                return (d.start + d.end) / 2;
            }).text(function(d) {
                return d.label;
            });
        },
        _calcIndicatorStart: function(x) {
            var tickData = this._tickData;
            var length = tickData.length;
            if (x < tickData[0]) {
                x = tickData[0];
                this._indicatorStart = 0;
            } else if (x > tickData[length - 2]) {
                x = tickData[length - 2];
                this._indicatorStart = this._labels.length - 1;
            } else {
                for (var i = 0; i < length - 1; ++i) {
                    var tick = tickData[i];
                    var nextTick = tickData[i + 1];
                    if (x * 2 < (tick + nextTick)) {
                        x = tick;
                        this._indicatorStart = i;
                        break;
                    }
                }
            }
            return x;
        },
        _calcIndicatorEnd: function(x) {
            var tickData = this._tickData;
            var length = tickData.length;
            if (x < tickData[1]) {
                x = tickData[1];
                this._indicatorEnd = 0;
            } else if (x > tickData[length - 1]) {
                x = tickData[length - 1];
                this._indicatorEnd = this._labels.length - 1;
            } else {
                for (var i = length - 1; i > 0; --i) {
                    var tick = tickData[i];
                    var prevTick = tickData[i - 1];
                    if (x * 2 > (tick + prevTick)) {
                        x = tick;
                        this._indicatorEnd = i - 1;
                        break;
                    }
                }
            }
            return x;
        },
        onBackgroundClick: function() {
            var group = this._container.select("g.indicator");
            var groupNode = group.node();
            var pos = getEventPos(groupNode);
            var x = pos.x;
            var tickData = this._tickData;
            var length = tickData.length;
            var idx;
            if (x <= tickData[0]) {
                idx = 0;
            } else if (x > tickData[length - 1]) {
                idx = this._labels.length - 1;
            } else {
                for (var i = 0; i < length - 1; ++i) {
                    var tick = tickData[i];
                    var nextTick = tickData[i + 1];
                    if (tick < x && x <= nextTick) {
                        idx = i;
                        break;
                    }
                }
            }
            this.setIndicatorAt(idx);
        },
        setIndicatorAt: function(_) {
            var idx = _;
            if (idx < 0) {
                idx = 0;
            } else if (idx > this._labels.length - 1) {
                idx = this._labels.length - 1;
            }
            this._indicatorStart = idx;
            this._indicatorEnd = idx;
            var sPos = this._getIndicatorStartPos();
            var ePos = this._getIndicatorEndPos();
            var group = this._container.select("g.indicator");
            group.select("rect.indicator").transition().duration(DURATION)
                .attr("x", sPos).attr("width", ePos - sPos);
            group.select("circle.start").transition().duration(DURATION)
                .attr("cx", sPos);
            group.select("circle.end").transition().duration(DURATION)
                .attr("cx", ePos);
            this.triggerChange();
        },
        triggerChange: function() {
            this.trigger("range", [
                this._labels[this._indicatorStart],
                this._labels[this._indicatorEnd]
            ]);
        },
        renderIndicator: function() {
            var that = this;
            var container = this._container;
            var group = container.select("g.indicator");
            if (!group.node()) {
                group = container.append("g").classed("indicator", true);
                group.attr("transform", "translate(" + HALF_PADDING + ", 15)");
            }

            var background = group.select("rect.background");
            if (!background.node()) {
                background = group.append("rect")
                    .classed("background", true)
                    .attr("height", 10)
                    .attr("fill", "transparent");
                background.on("click", this.onBackgroundClick.bind(this));
            }
            background.attr("width", this._renderWidth);

            var groupNode = group.node();
            var sPos = this._getIndicatorStartPos();
            var ePos = this._getIndicatorEndPos();
            var indicatorRect = group.select("rect.indicator");
            if (!indicatorRect.node()) {
                indicatorRect = group.append("rect").classed("indicator", true);
                var rectDrag = d3.behavior.drag();
                indicatorRect.call(rectDrag);
                rectDrag.on("dragstart", function() {
                    var pos = that._dragStartPos = getEventPos(
                        groupNode);
                    var box = indicatorRect.node().getBBox();
                    that._dragStartRectBox = box;
                    that._dragStartPosAgainstRect = {
                        x: pos.x - box.x,
                        y: pos.y - box.y
                    };
                }).on("drag", function() {
                    var pos = getEventPos(groupNode);
                    var x = pos.x;
                    var dx = that._dragStartPosAgainstRect.x;
                    var dxr = that._dragStartRectBox.width - dx;
                    if (x + dxr > that._renderWidth) {
                        x = that._renderWidth - dxr;
                    }
                    if (x - dx < 0) {
                        x = dx;
                    }
                    indicatorStartCircle.attr("cx", x - dx);
                    indicatorEndCircle.attr("cx", x + dxr);
                    indicatorRect.attr("x", x - dx);
                }).on("dragend", function() {
                    var pos = getEventPos(groupNode);
                    var sx = that._calcIndicatorStart(pos.x - that._dragStartPosAgainstRect
                        .x);
                    var ex = that._calcIndicatorEnd(sx + that._dragStartRectBox
                        .width);
                    indicatorStartCircle.transition().duration(DURATION)
                        .attr("cx", sx);
                    indicatorEndCircle.transition().duration(DURATION)
                        .attr("cx", ex);
                    indicatorRect.transition().duration(DURATION)
                        .attr("x", sx);
                    that.triggerChange();
                    delete that._dragStartRectBox;
                    delete that._dragStartPos;
                    delete that._dragStartPosAgainstRect;
                });
            }
            indicatorRect.attr("x", sPos)
                .attr("y", 0)
                .attr("width", ePos - sPos)
                .attr("height", 10);
            var indicatorStartCircle = group.select("circle.start");
            if (!indicatorStartCircle.node()) {
                indicatorStartCircle = group.append("circle").classed("start",
                    true);
                var startDrag = d3.behavior.drag();
                indicatorStartCircle.call(startDrag);
                startDrag.on("dragstart", function() {
                    that._dragStartPos = getEventPos(groupNode);
                }).on("drag", function() {
                    var pos = getEventPos(groupNode);
                    var x = pos.x;
                    var end = that._getIndicatorEndPos();
                    if (x > end) {
                        x = end;
                    }
                    if (x < 0) {
                        x = 0;
                    }
                    indicatorStartCircle.attr("cx", x);
                    indicatorRect.attr("x", x).attr("width", end - x);
                }).on("dragend", function() {
                    var pos = getEventPos(groupNode);
                    var x = that._calcIndicatorStart(pos.x);
                    indicatorStartCircle.transition().duration(DURATION)
                        .attr("cx", x);
                    var end = that._getIndicatorEndPos();
                    indicatorRect.transition().duration(DURATION).attr(
                        "x", x).attr("width", end - x);
                    that.triggerChange();
                    delete that._dragStartPos;
                });
            }
            indicatorStartCircle.attr("cx", sPos)
                .attr("cy", 5)
                .attr("r", 5);

            var indicatorEndCircle = group.select("circle.end");
            if (!indicatorEndCircle.node()) {
                indicatorEndCircle = group.append("circle").classed("end", true);
                var endDrag = d3.behavior.drag();
                indicatorEndCircle.call(endDrag);
                endDrag.on("dragstart", function() {
                    that._dragStartPos = getEventPos(groupNode);
                }).on("drag", function() {
                    var pos = getEventPos(groupNode);
                    var x = pos.x;
                    var start = that._getIndicatorStartPos();
                    if (x > that._renderWidth) {
                        x = that._renderWidth;
                    }
                    if (x < start) {
                        x = start;
                    }
                    indicatorEndCircle.attr("cx", x);
                    indicatorRect.attr("width", x - start);
                }).on("dragend", function() {
                    var pos = getEventPos(groupNode);
                    var x = that._calcIndicatorEnd(pos.x);
                    indicatorEndCircle.transition().duration(DURATION)
                        .attr("cx", x);
                    var start = that._getIndicatorStartPos();
                    indicatorRect.transition().duration(DURATION)
                        .attr("width", x - start);
                    that.triggerChange();
                    delete that._dragStartPos;
                });
            }
            indicatorEndCircle.attr("cx", ePos)
                .attr("cy", 5)
                .attr("r", 5);
        },
        _getIndicatorStartPos: function() {
            return this._tickData[this._indicatorStart];
        },
        _getIndicatorEndPos: function() {
            return this._tickData[this._indicatorEnd + 1];
        },
        calculate: function() {
            if (!this._labelData) {
                this._labelData = [];
                this._labelData.length = this._labels.length;
            }
            if (!this._tickData) {
                this._tickData = [];
                this._tickData.length = this._labels.length + 1;
            }
            var labelData = this._labelData;
            var tickData = this._tickData;
            var scale = d3.scale.ordinal();
            this._scale = scale;
            var width = this._renderWidth;
            scale.domain(this._labels)
                .rangeBands([0, width]);
            var ranges = scale.range();
            this._labels.forEach(function(label, index) {
                labelData[index] = {
                    label: label,
                    start: ranges[index],
                    end: index >= ranges.length - 1 ? width : ranges[
                        index + 1]
                };
                tickData[index] = ranges[index];
            });
            tickData[tickData.length - 1] = width;
            return this;
        },
        width: function(_) {
            this._width = _;
            this._renderWidth = this._width - PADDING;
            return this.render();
        }
    });
});
