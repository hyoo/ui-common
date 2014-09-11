/**
 * Shows a species description taken from Wikipedia.
 * Also includes a picture, but that'll be under a tab or something.
 */
(function( $, undefined ) {
    $.KBWidget({
        name: "KBaseWikiDescription",
        parent: "kbaseWidget",
        version: "1.0.0",

        options: {
            genomeID: null,
            workspaceID: null,
            kbCache: null,
            title: "Description",
            maxNumChars: 900,
            width: 500,
            loadingImage: null
        },

        cdmiURL: "https://kbase.us/services/cdmi_api",

        init: function(options) {
            this._super(options);

            if (this.options.featureID === null) {
                //throw an error.
                return this;
            }
            this.$messagePane = $("<div/>")
                                //.addClass("kbwidget-message-pane")
                                //.addClass("kbwidget-hide-message");
            this.$elem.append(this.$messagePane);

            this.cdmiClient = new CDMI_API(this.cdmiURL);
            this.entityClient = new CDMI_EntityAPI(this.cdmiURL);

            if (this.options.workspaceID) {
                this.renderWorkspace();
            }
            else
                this.render();
            return this;
        },

        render: function() {
            var self = this;
            this.showMessage("<center><img src='" + this.options.loadingImage + "'> loading ...</center>");
            
            /*
             * A couple nested callbacks here.
             * 1. Run genomes_to_taxonomies
             * 2. Deal with the taxonomy structure and send it to scrape_first_hit
             * 3. Print out the output.
             */

            if (this.options.genomeID === null) {
                // make an error.
                this.renderError("Error: no genome identifier given!");
                return;
            }

            // step 1: get the taxonomy
            this.cdmiClient.genomes_to_taxonomies([this.options.genomeID], 
                $.proxy(function(taxonomy) {
                    taxonomy = taxonomy[this.options.genomeID];
                    if (taxonomy) {
                        this.renderFromTaxonomy(taxonomy.reverse());
                    }
                    else {
                        this.renderError("Genome '" + this.options.genomeID + "' not found in the KBase Central Store.");
                    }
                }, this),

                this.renderError
            );

            return this;
        },

        /**
         * Needs to be given in reverse order. Calling function should handle
         * what are valid names. E.g.
         * ['Escherichia coli K-12', 'Escherichia coli', 'Escherichia', 'Enterobacteriaceae', 'Enterobacteriales', 'Gammaproteobacteria', ...]
         * Start with most descriptive name, proceed on down to least descriptive (usually kingdom name, if available).
         * 
         * This will try to fetch wiki content for the first valid name in that list.
         */
        renderFromTaxonomy: function(taxonomy) {
            var searchTerms = taxonomy;
            var strainName = taxonomy[0];
            this.wikipediaLookup(searchTerms, $.proxy(
                function(desc) {
                    // If we've found something, desc.description will exist and be non-null
                    if (desc.hasOwnProperty('description') && desc.description != null) {
                        if (desc.description.length > this.options.maxNumChars) {
                            desc.description = desc.description.substr(0, this.options.maxNumChars);
                            var lastBlank = desc.description.lastIndexOf(" ");
                            desc.description = desc.description.substr(0, lastBlank) + "...";
                        }

                        /* the viz is set up like this:
                         * 1. Description Tab
                         *
                         * ['not found' header, if applicable]
                         * Showing description for <search term>
                         * ['redirect header', if applicable]
                         *
                         * Description (a fragment of the abstract from Wikipedia)
                         *
                         * <Wikipedia link>
                         *
                         * 2. Image Tab
                         * ['not found' header, if applicable, with link to Wikipedia]
                         * Image
                         */

                        var descStr = "<p style='text-align:justify;'>" + desc.description + "</p>"

                        var descHtml;
                        if (strainName === desc.redirectFrom) {
                            descHtml = this.redirectHeader(strainName, desc.redirectFrom, desc.searchTerm) + descStr + this.descFooter(desc.wikiUri);
                        }
                        else if (desc.searchTerm === strainName) {
                            descHtml = descStr + this.descFooter(desc.wikiUri);
                        }
                        else {
                            descHtml = this.notFoundHeader(strainName, desc.searchTerm, desc.redirectFrom) + descStr + this.descFooter(desc.wikiUri);
                        }

                        var imageHtml = "Unable to find an image. If you have one, you might consider <a href='" + desc.wikiUri + "' target='_new'>adding it to Wikipedia</a>.";
                        if (desc.imageUri != null) {
                            imageHtml = "<img src='" + desc.imageUri + "'";
                            if (this.options.width)
                                imageHtml += "style='max-width: 100%'";
                            imageHtml += "/>";
                        }
                    }
                    else {
                        descHtml = this.notFoundHeader(strainName);
                    }


                    var descId = this.uid();
                    var imageId = this.uid();


                    /* This is the tabbed view
                     var $contentDiv = $("<div />")
                                      .addClass("tab-content")
                                      .append($("<div />")
                                              .attr("id", descId)
                                              .addClass("tab-pane fade active in")
                                              .append(descHtml)
                                      )
                                      .append($("<div />")
                                              .attr("id", imageId)
                                              .addClass("tab-pane fade")
                                              .append(imageHtml)
                                      );

                    var $descTab = $("<a />")
                                     .attr("href", "#" + descId)
                                     .attr("data-toggle", "tab")
                                     .append("Description");

                    var $imageTab = $("<a />")
                                     .attr("href", "#" + imageId)
                                     .attr("data-toggle", "tab")
                                     .append("Image");

                    var $tabSet = $("<ul />")
                                  .addClass("nav nav-tabs")
                                  .append($("<li />")
                                          .addClass("active")
                                          .append($descTab)
                                         )
                                  .append($("<li />")
                                          .append($imageTab)
                                         ); */

                    this.hideMessage();  
                    //this.$elem.append($tabSet).append($contentDiv);
                    
                    this.$elem.append($('<div id="mainview">').css("overflow","auto").append('<table cellpadding="4" cellspacing="2" border=0 style="width:100%;">' +
                              '<tr><td style="vertical-align:top"><div id="taxondescription"></td>'+
                              '<td style="vertical-align:top"><div id="taxonimage" style="width:400px;"></td></tr><br>'));
                    
                    
                    //this.$elem.find('#loading-mssg').hide();
                    this.$elem.find("#taxondescription").append(descHtml);
                    this.$elem.find("#taxonimage").append(imageHtml);
                              
                }, this), 
                $.proxy(this.renderError, this)
            );
        },

        renderWorkspace: function() {
            var self = this;
            this.showMessage("<center><img src='" + this.options.loadingImage + "'> loading ...</center>");
            var obj = this.buildObjectIdentity(this.options.workspaceID, this.options.genomeID);
            
            obj['included'] = ["/taxonomy","/scientific_name"];
	    self.options.kbCache.ws.get_object_subset( [ obj ], function(data) {
                    if (data[0]) {
                        if (data[0]['data']['taxonomy']) {
                            var tax = data[0]['data']['taxonomy'];
                            var taxList = [];
                            var nameTokens = data[0]['data']['scientific_name'].split(/\s+/);
                            for (var i=nameTokens.length; i>0; i--) {
                                taxList.push(nameTokens.slice(0, i).join(' '));
                            }
                            if (taxList && taxList !== "Unknown") {
                                // parse the taxonomy, however it's munged together. semicolons, i think?
                                taxList = taxList.concat(tax.split(/\;\s*/).reverse());
                            }
                            self.renderFromTaxonomy(taxList);
                        }
                    }
                },
                function(error) {
                        
                        var obj = self.buildObjectIdentity(self.options.workspaceID, self.options.genomeID);
                        obj['included'] = ["/scientific_name"];
                        self.options.kbCache.ws.get_object_subset( [ obj ], function(data) {
                            if (data[0]) {
                                if (data[0]['data']['scientific_name']) {
                                    var taxList = [];
                                    var nameTokens = data[0]['data']['scientific_name'].split(/\s+/);
                                    for (var i=nameTokens.length; i>0; i--) {
                                        taxList.push(nameTokens.slice(0, i).join(' '));
                                    }
                                    self.renderFromTaxonomy(taxList);
                                }
                            }
                        },
                        function(error) {self.renderError(error);});
                });
            
            // old way that requires the entire object ...
            //var prom = this.options.kbCache.req('ws', 'get_objects', [obj]);
            //
            //// if it fails, error out!
            //$.when(prom).fail($.proxy(function(error) {
            //    this.renderError(error);
            //}, this));
            //// if it succeeds, grab the taxonomy (or at least the scientific name) and roll out.
            //$.when(prom).done($.proxy(function(genome) {
            //    genome = genome[0];
            //
            //    var tax = genome.data.taxonomy;
            //    var taxList = [];
            //    var nameTokens = genome.data.scientific_name.split(/\s+/);
            //    for (var i=nameTokens.length; i>0; i--) {
            //        taxList.push(nameTokens.slice(0, i).join(' '));
            //    }
            //    if (taxList && taxList !== "Unknown") {
            //        // parse the taxonomy, however it's munged together. semicolons, i think?
            //        taxList = taxList.concat(tax.split(/\;\s*/).reverse());
            //    }
            //    this.renderFromTaxonomy(taxList);
            //}, this));
        },

        buildObjectIdentity: function(workspaceID, objectID) {
            var obj = {};
            if (/^\d+$/.exec(workspaceID))
                obj['wsid'] = workspaceID;
            else
                obj['workspace'] = workspaceID;

            // same for the id
            if (/^\d+$/.exec(objectID))
                obj['objid'] = objectID;
            else
                obj['name'] = objectID;
            return obj;
        },


        uid: function() {
            var id='';
            for(var i=0; i<32; i++)
                id += Math.floor(Math.random()*16).toString(16).toUpperCase();
            return id;
        },

        descFooter: function(wikiUri) {
            return "<p>[<a href='" + wikiUri + "'' target='_new'>more at Wikipedia</a>]</p>";
        },

        notFoundHeader: function(strainName, term, redirectFrom) {
            var underscoredName = strainName.replace(/\s+/g, "_");
            var str = "<p><b>\"<i>" +
                      strainName + 
                      "</i>\" not found. Add a description on <a href='http://en.wikipedia.org/wiki/" + 
                      underscoredName + 
                      "' target='_new'>Wikipedia</a>.</b></p>";
            if (term) {
                str += "<p><b>Showing description for <i>" +
                       term +
                       "</i></b>";
                if (redirectFrom) {
                    str += "<br>redirected from <i>" + redirectFrom + "</i>";
                }
                str += "</p>";
            }
            return str;
        },

        redirectHeader: function(strainName, redirectFrom, term) {
            var underscoredName = redirectFrom.replace(/\s+/g, "_");
            var str = "<p><b>" +
                      "Showing description for <i>" + term + "</i></b>" +
                      "<br>redirected from <i>" + underscoredName + "</i>" +
                      "</p>";

            return str;
        },

        showMessage: function(message) {
            var span = $("<span/>").append(message);

            this.$messagePane.append(span);
            this.$messagePane.removeClass("kbwidget-hide-message");
        },

        hideMessage: function() {
            this.$messagePane.addClass("kbwidget-hide-message");
            this.$messagePane.empty();
        },
        
        getData: function() {
            return {
                type: "Description",
                id: this.options.genomeID,
                workspace: this.options.workspaceID,
                title: "Organism Description"
            };
        },

        renderError: function(error) {
	    errString = "Sorry, an unknown error occured.  DBpedia.org may be down or your browser may be blocking an http request to DBpedia.org.";
            if (typeof error === "string")
                errString = error;
            else if (error && error.error && error.error.message)
                errString = error.error.message;

            
            var $errorDiv = $("<div>")
                            .addClass("alert alert-danger")
                            .append("<b>Error:</b>")
                            .append("<br>" + errString);
            this.$elem.empty();
            this.$elem.append($errorDiv);
        },

        wikipediaLookup: function(termList, successCallback, errorCallback, redirectFrom) {
            if (!termList || Object.prototype.toString.call(termList) !== '[object Array]' || termList.length === 0) {
                if (errorCallback) {
                    errorCallback("No search term given");
                }
            }

            var searchTerm = termList.shift();
            var usTerm = searchTerm.replace(/\s+/g, '_');

            var requestUrl = 'http://en.wikipedia.org/w/api.php?action=parse&format=json&prop=text|images&section=0&redirects=&callback=?&page=' + searchTerm;

            $.get(requestUrl).then($.proxy(function(data, status) {
                console.log(data);
                console.log(status);
                if (successCallback) {
                    successCallback(data);
                }
            }, this), 
            function(error) {
                if (errorCallback) {
                    errorCallback(error);
                }
            });

        },

        dbpediaLookup: function(termList, successCallback, errorCallback, redirectFrom) {
            if (!termList || Object.prototype.toString.call(termList) !== '[object Array]' || termList.length === 0) {
                if (errorCallback) {
                    errorCallback("No search term given");
                }
            }

            var searchTerm = termList.shift();
            var usTerm = searchTerm.replace(/\s+/g, '_');

            var resourceKey    = 'http://dbpedia.org/resource/' + usTerm;
            var abstractKey    = 'http://dbpedia.org/ontology/abstract';
            var languageKey    = 'en';
            var imageKey       = 'http://xmlns.com/foaf/0.1/depiction';
            var wikiLinkKey    = 'http://xmlns.com/foaf/0.1/isPrimaryTopicOf';
            var wikipediaUri   = 'http://en.wikipedia.org/wiki';
            var redirectKey    = 'http://dbpedia.org/ontology/wikiPageRedirects';

            var requestUrl = 'http://dbpedia.org/data/' + usTerm + '.json';
            $.get(requestUrl).then($.proxy(function(data, status) {

                var processedHit = {
                    'searchTerm' : searchTerm
                };

                if (data[resourceKey]) {
                    var resource = data[resourceKey];
                    if (!resource[wikiLinkKey] || !resource[abstractKey]) {
                        if (resource[redirectKey]) {
                            var tokens = resource[redirectKey][0]['value'].split('/');
                            this.dbpediaLookup([tokens[tokens.length - 1]], successCallback, errorCallback, searchTerm);
                        }
                        else {
                            if (termList.length > 0)
                                this.dbpediaLookup(termList, successCallback, errorCallback);
                            else
                                successCallback(processedHit);
                        }
                    }
                    else {
                        if (resource[wikiLinkKey]) {
                            processedHit['wikiUri'] = resource[wikiLinkKey][0]['value'];
                        }
                        if (resource[abstractKey]) {
                            var abstracts = resource[abstractKey];
                            for (var i=0; i<abstracts.length; i++) {
                                if (abstracts[i]['lang'] === languageKey)
                                    processedHit['description'] = abstracts[i]['value'];
                            }
                        }
                        if (resource[imageKey]) {
                            processedHit['imageUri'] = resource[imageKey][0]['value'];
                        }
                        if (redirectFrom) {
                            processedHit['redirectFrom'] = redirectFrom;
                        }
                        successCallback(processedHit);
                    }
                }
                else {
                    if (termList.length > 0) {
                        this.dbpediaLookup(termList, successCallback, errorCallback);
                    } else {
                        successCallback(processedHit);
                    }
                }
                return processedHit;
            }, this),
            function(error) {
                if (errorCallback)
                    errorCallback(error);
            });
        },
    })
})( jQuery );