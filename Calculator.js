Ext.define('Calculator', {

    config: {
        calculationType: undefined,
        field: undefined,
        stackField: undefined,
        stackValues: undefined
    },

    constructor: function(config) {
        this.initConfig(config);
    },

    prepareChartData: function(store) {
        var data = this._groupData(store),
        categories = _.keys(data),
        seriesData;
        console.log("here is the series data",categories);

        if (!this.stackField) {
            if(this.calculationType === 'count') {
                seriesData = _.map(data, function(value, key) {
                    return [key, value.length];
                });
            } else {
                seriesData = _.map(data, function(value, key) {
                    var valueTotal = _.reduce(value, function(total, r) {
                        var valueField = this._getValueFieldForCalculationType();
                        return total + r.get(valueField);
                    }, 0, this);
                    return [key, valueTotal];
                }, this);
            }
          
            return {
                categories: categories,
                series: [
                    {
                        name: this.field,
                        type: this.seriesType,
                        data: seriesData
                    }
                ]
            };
        } else {
            var stackValues = _.unique(_.map(store.getRange(), function(record) {
                return this._getDisplayValueForField(record, this.stackField);
            }, this));

            if (this.stackValues) {
                stackValues = _.map(this.stackValues, function(stackValue) {
                    return this._getDisplayValue(store.model.getField(this.stackField), stackValue);
                }, this);
            } 

            var series = {};
            _.each(categories, function(category) {
                var group = data[category];
                var recordsByStackValue = _.groupBy(group, function(record) {
                    return this._getDisplayValueForField(record, this.stackField);
                }, this);
                _.each(stackValues, function(stackValue) {
                    series[stackValue] = series[stackValue] || [];
                    var records = recordsByStackValue[stackValue];
                    if(this.calculationType === 'count') {
                        series[stackValue].push((records && records.length) || 0);
                    } else {
                        var valueTotal = _.reduce(records, function(total, r) {
                            var valueField = this._getValueFieldForCalculationType();
                            return total + r.get(valueField);
                        }, 0, this);
                        series[stackValue].push(valueTotal);
                    }
                }, this);
            }, this);
          
            return {
                categories: categories,
                series: _.map(stackValues, function(value) {
                    return {
                        name: value,
                        type: this.seriesType,
                        data: series[value]
                    };
                }, this)
            };
        }
    },

    _groupData: function(store) {
        if (store.model.getField(this.field).getType() === 'collection') {
            var groups = {};
            _.each(store.getRange(), function(record) {
                var value = record.get(this.field),
                    values = value._tagsNameArray;
                if (_.isEmpty(values)) {
                    groups.None = groups.None || [];
                    groups.None.push(record);
                } else {
                    _.each(values, function(val) {
                        groups[val.Name] = groups[val.Name] || [];
                        groups[val.Name].push(record);
                    });
                }
            }, this);
            return groups;
        } else {
            return _.groupBy(store.getRange(), function(record) {
                return this._getDisplayValueForField(record, this.field);
            }, this);
        }
    },

    _getDisplayValueForField: function(record, fieldName) {
        var field = record.getField(fieldName),
            value = record.get(fieldName);
        
        return this._getDisplayValue(field, value);
    },

    _getDisplayValue: function(field, value) {
        if (_.isObject(value)) {
            return value._refObjectName;
        } else if (Ext.isEmpty(value)) {
            var fieldType = field.getType();
            if (field.attributeDefinition.SchemaType === 'User') {
                return '-- No Owner --';
            } else if (fieldType === 'rating' || fieldType === 'object') {
                return 'None';
            } else {
                return '-- No Entry --';
            }
        } else {
            return value;
        }
    },

    _getValueFieldForCalculationType: function() {
        return Utils.getFieldForAggregationType(this.calculationType);
    }
});
