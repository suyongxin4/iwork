define([
    "d3",
    "moment"
], function(
    d3,
    moment
) {
    var Collector = function() {
        this._reset();
        this._dispatch = d3.dispatch("change");
    };

    Collector.prototype._reset = function(){
        this._totalSent = 0;
        this._totalRecv = 0;
        var i, length = 14;
        this._sentCollection = [];
        this._sentCollection.length = length;
        for (i = 0; i < length; ++i){
            this._sentCollection[i] = 0;
        }
        this._recvCollection = [];
        this._recvCollection.length = length;
        for (i = 0; i < length; ++i){
            this._recvCollection[i] = 0;
        }
    };

    Collector.prototype.reset = function(){
        this._reset();
        this._dispatch.change(this);
    };

    Collector.prototype.addSent = function(time) {
        this._totalSent++;
        var m = moment(new Date(time)).utcOffset(moment().utcOffset());
        var hour = m.hour();
        if (hour < 8){
            this._sentCollection[0]++;
        } else if (hour < 9){
            this._sentCollection[1]++;
        } else if (hour < 10){
            this._sentCollection[2]++;
        } else if (hour < 11){
            this._sentCollection[3]++;
        } else if (hour < 12){
            this._sentCollection[4]++;
        } else if (hour < 13){
            this._sentCollection[5]++;
        } else if (hour < 14){
            this._sentCollection[6]++;
        } else if (hour < 15){
            this._sentCollection[7]++;
        } else if (hour < 16){
            this._sentCollection[8]++;
        } else if (hour < 17){
            this._sentCollection[9]++;
        } else if (hour < 18){
            this._sentCollection[10]++;
        } else if (hour < 19){
            this._sentCollection[11]++;
        } else if (hour < 20){
            this._sentCollection[12]++;
        } else {
            this._sentCollection[13]++;
        }
        this._dispatch.change(this);
    };

    Collector.prototype.addReceived = function(time) {
        this._totalRecv++;
        var m = moment(new Date(time)).utcOffset(moment().utcOffset());
        var hour = m.hour();
        if (hour < 8){
            this._recvCollection[0]++;
        } else if (hour < 9){
            this._recvCollection[1]++;
        } else if (hour < 10){
            this._recvCollection[2]++;
        } else if (hour < 11){
            this._recvCollection[3]++;
        } else if (hour < 12){
            this._recvCollection[4]++;
        } else if (hour < 13){
            this._recvCollection[5]++;
        } else if (hour < 14){
            this._recvCollection[6]++;
        } else if (hour < 15){
            this._recvCollection[7]++;
        } else if (hour < 16){
            this._recvCollection[8]++;
        } else if (hour < 17){
            this._recvCollection[9]++;
        } else if (hour < 18){
            this._recvCollection[10]++;
        } else if (hour < 19){
            this._recvCollection[11]++;
        } else if (hour < 20){
            this._recvCollection[12]++;
        } else {
            this._recvCollection[13]++;
        }
        this._dispatch.change(this);
    };

    Collector.prototype.onChange = function(name, fn){
        this._dispatch.on("change." + name, fn);
    };

    Collector.prototype.getTotalSent = function(){
        return this._totalSent;
    };

    Collector.prototype.getTotalReceived = function(){
        return this._totalRecv;
    };

    Collector.prototype.getSentCollection = function(){
        return this._sentCollection;
    };
    Collector.prototype.getReceivedCollection = function(){
        return this._recvCollection;
    };

    return Collector;
});
