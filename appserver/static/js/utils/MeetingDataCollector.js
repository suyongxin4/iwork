define(["d3"], function(d3) {
    var Collector = function() {
        this._totalTime = 0;
        this._totalNumber = 0;
        this._collection = [[],[],[],[]];
        this._dispatch = d3.dispatch("change");
    };

    Collector.prototype.addData = function(d) {
        this._totalTime += d;
        this._totalNumber++;
        if (d <= 30) {
            this._collection[0].push(d);
        } else if (d <= 60) {
            this._collection[1].push(d);
        } else if (d <= 120) {
            this._collection[2].push(d);
        } else {
            this._collection[3].push(d);
        }
        this._dispatch.change(this);
    };

    Collector.prototype.onChange = function(name, fn){
        this._dispatch.on("change." + name, fn);
    };

    Collector.prototype.getTotalTime = function(){
        return this._totalTime;
    };

    Collector.prototype.getTotalNumber = function(){
        return this._totalNumber;
    };

    Collector.prototype.getCollection = function(){
        return this._collection;
    };
    return Collector;
});
