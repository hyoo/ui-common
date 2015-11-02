/*

    var dataset = [];

    var points = 200;

    var randomColor = function() {
        var colors = ['red', 'green', 'blue', 'cyan', 'magenta', 'yellow', 'orange', 'black'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    var randomShape = function() {
    //return 'circle';
        var shapes = ['circle', 'circle', 'circle', 'circle', 'circle', 'circle', 'square', 'triangle-up', 'triangle-down', 'diamond', 'cross'];
        return shapes[Math.floor(Math.random() * shapes.length)];
    }

    for (var idx = 0; idx < points; idx++) {
        dataset.push(
            {
                x : Math.random() * 500,
                y : Math.random() * 500,
                weight : Math.random() * 225,
                color : randomColor(),
                label : 'Data point ' + idx,
                shape : randomShape(),
            }
        );
    }

    var $scatter = $('#scatterplot').css({width : '800px', height : '500px'}).kbaseScatterplot(
        {
            scaleAxes   : true,

            //xLabel      : 'Some useful experiment',
            //yLabel      : 'Meaningful data',

            dataset : dataset,

        }
    );

*/

define('kbaseRNASeqPie',
    [
        'jquery',
        'colorbrewer',
        'd3',
        'kbasePiechart',
        'kbaseTable',
        'kbwidget',
        'kbaseTabs',
    ], function( $, colorbrewer ) {

    'use strict';

    $.KBWidget({

	    name: "kbaseRNASeqPie",

        version: "1.0.0",
        options: {
            pieWedges : ['mapped_reads', 'unmapped_reads'],
            overviewItems : ['total_reads', 'unmapped_reads', 'mapped_reads', 'multiple_alignments', 'singletons', 'alignment_rate'],
            gradients : [
                Array.prototype.slice.call(colorbrewer.Blues[9]).reverse(),
                Array.prototype.slice.call(colorbrewer.Oranges[9]).reverse(),
                Array.prototype.slice.call(colorbrewer.RdPu[9]).reverse(),
                Array.prototype.slice.call(colorbrewer.YlGn[9]).reverse()
            ],
        },

        value_for_wedge : function(val) {
            if ($.isPlainObject(val)) {
                var total = 0;
                for (var key in val) {
                    total += this.value_for_wedge(val[key]);
                }
                return total;
            }
            else {
                return val || 0;
            }
        },

        label_for_key : function(key, val) {
            var label = key.replace(/_/g, ' ');
                label = label.replace(/^([a-z])/, function up (l) { return       l.toUpperCase()});
                label = label.replace(/ ([a-z])/, function up (l) { return ' ' + l.toUpperCase()});

            if (val != undefined) {
                label = label + ' : ' + this.value_for_wedge(val);
            }

            return label;
        },

        _accessors : [
            {name: 'dataset', setter: 'setDataset'},
        ],

        setDataset : function setDataset(newDataset) {

            var gradients = this.options.gradients;

            this.setValueForKey('dataset', newDataset);

            newDataset['total_reads'] = this.value_for_wedge(newDataset['mapped_reads']) + this.value_for_wedge(newDataset['unmapped_reads']);

            if (this.data('container')) {

                this.data('container').removeTab('Overview');
                this.data('container').removeTab('Pie chart');

                var $tableElem = $.jqElem('div');

                var keys = [];
                var overViewValues = {};
                for (var i = 0; i < this.options.overviewItems.length; i++) {
                    var key = this.options.overviewItems[i];
                    keys.push( { value : key, label : this.label_for_key(key) } );
                    overViewValues[key] = this.value_for_wedge(newDataset[key]);

                    if ($.isPlainObject(newDataset[key])) {
                        for (var k in newDataset[key]) {
                            keys.push({value : k, label : '&nbsp;&nbsp;&nbsp;' + this.label_for_key(k)});
                            overViewValues[k] = newDataset[key][k];
                        }
                    }

                }

                var $table = $tableElem.kbaseTable(
                    {
                        structure : {
                            keys : keys,
                            rows : overViewValues
                        }

                    }
                );

                this.data('container').addTab(
                    {
                        tab : 'Overview',
                        content : $tableElem
                    }
                );


                var $pieElem = $.jqElem('div').css({width : this.$elem.width(), height : this.$elem.height() * .9});

                var pieData = [];
                for (var i = 0; i < this.options.pieWedges.length; i++) {
                    var wedge = this.options.pieWedges[i];

                    if (newDataset[wedge] === undefined) {
                        continue;
                    }

                    pieData.push(
                        {
                            value   : this.value_for_wedge(newDataset[wedge]),
                            label   : this.label_for_key(wedge, newDataset[wedge]),
                            color   : gradients[i % gradients.length][1]
                        }
                    );
                }

                var minEdge = Math.min($pieElem.width(), $pieElem.height()) / 2 - 20;

                var $pie = $pieElem.kbasePiechart(
                    {
                        scaleAxes   : true,
                        useUniqueID : false,
                        gradient : true,
                        outsideLabels : true,
                        draggable : false,

                        dataset : pieData,

                        outerRadius : minEdge - 30,
                        outsideLabels : false,
                        tooltips : false,

                    }
                );

                var wedgeTotal = 0;
                var gIdx = 0;
                var donutData = [];
                var wedgeOffset = 0;

                for (var wIdx = 0; wIdx < this.options.pieWedges.length; wIdx++) {
                    wedgeTotal += this.value_for_wedge(newDataset[ this.options.pieWedges[wIdx] ]);
                }

                for (var wIdx = 0; wIdx < this.options.pieWedges.length; wIdx++) {

                    var wedge       = this.options.pieWedges[wIdx];
                    var wedgeValue  = this.value_for_wedge(newDataset[wedge]);

                    if ( $.isPlainObject(newDataset[wedge]) ) {

                        var idx = 0;

                        var wedgeConstant = 1 / wedgeTotal;

                        var grad = gradients[gIdx];

                        for (var key in newDataset[wedge]) {

                            if (newDataset[wedge][key] == 0) {
                                continue;
                            }

                            donutData.push(
                                {
                                    value : newDataset[wedge][key] * wedgeConstant,
                                    label : this.label_for_key(key, newDataset[wedge][key]),
                                    color : grad[idx++]
                                }
                            );
                        }

                    }
                    else {
                        wedgeOffset += wedgeValue;
                        donutData.push(
                            {
                                value   : wedgeValue / wedgeTotal,
                                label   : '',
                                color   : 'white',
                                gap     : true,
                            }
                        )
                    }

                    gIdx = ++gIdx % gradients.length;

                }


                if (donutData.length) {
                    var $donut = $.jqElem('div').kbasePiechart(
                        {
                            parent : $pie,
                            dataset : donutData,
                            innerRadius : $pie.outerRadius(),
                            outerRadius : $pie.outerRadius() + 30,
                            outsideLabels : true,
                            autoEndAngle : true,
                            draggable : false,
                            tooltips : false,
                        }
                    );
                }

                this.data('container').addTab(
                    {
                        tab : 'Pie chart',
                        content : $pieElem
                    }
                );

                this.data('container').showTab('Overview');

            }
        },



        init : function init(options) {
            this._super(options);

            this.appendUI(this.$elem);

            return this
        },

        appendUI : function appendUI($elem) {

            var $rnaseq = this;

            var $containerElem = $.jqElem('div').attr('id', 'containerElem');

            var $container = $containerElem.kbaseTabs(
                {
                    tabs : [
                        {
                            tab : 'Overview',
                            content : 'Loading...'
                        },
                        {
                            tab : 'Pie chart',
                            content : 'Loading...'
                        }
                    ]
                }
            )

            this._rewireIds($containerElem, this);
            this.data('container', $container);

            this.setDataset(this.dataset());

            $elem.append($containerElem);

        },

    });

} );