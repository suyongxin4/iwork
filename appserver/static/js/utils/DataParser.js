define(["underscore"],function(_) {
    var RAW_KEY = "_raw";

    function DataParser(data, options) {
        options = options || {};
        this._data = data;
        this._fields = data.fields;
        this._dedupFn = options.dedup;
        if (!_.isFunction(this._dedupFn)){
            this._dedupFn = function(a){
                return a;
            };
        }
        this._rows = this._dedupFn(data.rows);
        this.length = this._rows.length;
        this._rowObjects = [];
        this._rowObjects.length = this.length;
    }

    DataParser.prototype.getRowField = function(idx, fieldName) {
        if (!this._rowObjects[idx]) {
            this.getRowObject(idx);
        }
        return this._rowObjects[idx][fieldName];
    };

    DataParser.prototype.getRowObject = function(idx) {
        if (this._rowObjects[idx]) {
            return this._rowObjects[idx];
        }
        var obj = {};
        var row = this._rows[idx];
        var fields = this._fields;
        var rawIdx = fields.indexOf(RAW_KEY);
        if (rawIdx > -1) {
            obj = JSON.parse(row[rawIdx]);
        } else {
            row.forEach(function(value, index) {
                obj[fields[index]] = value;
            });
        }
        this._rowObjects[idx] = obj;
        return obj;
    };
    return DataParser;
});
