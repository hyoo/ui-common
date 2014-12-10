/**
 * Just a simple example widget - makes a div with "Hello world!"
 * in a user-defined color (must be a css color - 'red' or 'yellow' or '#FF0000')
 */kb_define('kbaseCarousel',
    [
        'jquery',
    	'kbwidget'
    ],
    function ($) {

    $.KBWidget({
        name: "kbaseCarousel",
        parent: "kbaseWidget",
        version: "1.0.0",
        options: {
            color: "black",
            interval : 5000,
            carousel : [
                {
                    name : 'Assemble Genome from Fasta',
                    id : 'assemble_genome_from_fasta',
                    caption : '<h3>This assembles a ContigSet into a Genome object in your workspace. This should be run before trying to annotate a Genome. [2]</h3><p>This assembles a ContigSet into a Genome object in your workspace. This should be run before trying to annotate a Genome. [2]</p>'
                },
                {
                    name : 'Build Gene Tree',
                    id : 'build_gene_tree',
                    caption : '<h3>Build phylogenetic tree for multiple alignmnet of protein sequences [28]</h3><p>Build phylogenetic tree for multiple alignmnet of protein sequences [28]</p>'
                },
                {
                    name : 'View Proteome Comparison',
                    id : 'view_proteome_comparison',
                    caption : '<h3>Show the hit map result of running a comparison between two proteomes, which includes information about best-bidirectional hits. [18]</h3><p>Show the hit map result of running a comparison between two proteomes, which includes information about best-bidirectional hits. [18]</p>'
                },
            ]
        },

        init: function(options) {
            this._super(options);

            var carousel_id = this.uuid();

            var $carousel = $.jqElem('div')
                .addClass('carousel')
                .addClass('slide')
                .attr('data-interval', this.options.interval)
                .attr('data-ride', 'carousel')
                .attr('id', carousel_id)
            ;

            var $indicators = $.jqElem('ol')
                .addClass('carousel-indicators')
            ;

            $.each(
                this.options.carousel,
                $.proxy(function (idx, val) {
                    $indicators.append(
                        $.jqElem('li')
                            .attr('data-target', '#' + carousel_id)
                            .attr('data-slide-to', idx)
                    );
                }, this)
            );

            var $inner = $.jqElem('div').addClass('carousel-inner');

            $.each(
                this.options.carousel,
                $.proxy(function (idx, val) {

                    var innerClass = idx ? 'item' : 'active item';

                    $inner.append(
                        $.jqElem('div')
                            .addClass(innerClass)
                            .css('text-align' , 'center')
                            .css('height', '300px')
                            .append(
                                $.jqElem('h2')
                                    .addClass('slide')
                                    .css(
                                    {
                                        margin: 0,
                                        'padding-top': '30px',
                                        'padding-bottom' : '150px',
                                        'font-size': '52px',
                                        'font-family': "trebuchet ms sans-serif"
                                    })
                                    .append(
                                        $.jqElem('a')
                                            .on('click', $.proxy(function(e) {
                                                e.preventDefault(); e.stopPropagation();

                                                if (this.options.methodDetails) {
                                                    this.options.methodDetails.details(val.id);
                                                }
                                            }, this))
                                            .append(val.name)
                                    )
                            )
                            .append(
                                $.jqElem('div')
                                    .addClass('carousel-caption')
                                    .css('color', 'black')
                                    .append(val.caption)
                            )
                    );
                }, this)
            );

            $carousel
                .append($indicators)
                .append($inner)
                .append(
                    $.jqElem('a')
                        .addClass('carousel-control')
                        .addClass('left')
                        .attr('href', '#' + carousel_id)
                        .attr('data-slide', 'prev')
                        .append(
                            $.jqElem('span').addClass('glyphicon glyphicon-chevron-left')
                        )
                )
                .append(
                    $.jqElem('a')
                        .addClass('carousel-control')
                        .addClass('right')
                        .attr('href', '#' + carousel_id)
                        .attr('data-slide', 'next')
                        .append(
                            $.jqElem('span').addClass('glyphicon glyphicon-chevron-right')
                        )
                )
            ;

            this.$elem.append($carousel);
            $('.carousel').carousel({interval : this.options.interval});

            return this;
        }

    });
});
