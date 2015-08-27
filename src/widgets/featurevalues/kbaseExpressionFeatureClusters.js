/**
 * Output widget to vizualize FeatureClusters object.
 * Pavel Novichkov <psnovichkov@lbl.gov>
 * @public
 */

$.KBWidget({
		name: 'kbaseExpressionFeatureClusters',
		parent: 'kbaseAuthenticatedWidget',
		version: '1.0.0',
		options: {
			clusterSetID: null,
			workspaceID: null,
			loadingImage: "static/kbase/images/ajax-loader.gif",
		},

		// Extracted data for vizualization
		clusterSet: null,
		expMatrixRef: null,
		genomeRef: null,
		featureMapping: null,
		matrixRowIds: null,
		matrixColIds: null,
		genomeID: null,
		genomeName: null,
		features: null,
					
		init: function(options) {
			this._super(options);
			// Create a message pane
            this.$messagePane = $("<div/>").addClass("kbwidget-message-pane kbwidget-hide-message");
            this.$elem.append(this.$messagePane);		
			return this;
		},

		loggedInCallback: function(event, auth) {

			
			// error if not properly initialized
			if (this.options.clusterSetID == null) {
				this.showMessage("[Error] Couldn't retrieve clusters");
				return this;
			}

			// Create a new workspace client
			this.ws = kb.ws;
		   
			// Let's go...
			this.loadAndrender();           
		   
			return this;
		},

		loggedOutCallback: function(event, auth) {
			this.ws = null;
			this.isLoggedIn = false;
			return this;
		},

		loadAndrender: function(){

			var self = this;

			self.loading(true);

			var kbws = this.ws;
			var clusterSetRef = self.buildObjectIdentity(this.options.workspaceID, this.options.clusterSetID);

			kbws.get_objects([clusterSetRef], 
				function(data) {
					self.clusterSet = data[0].data;
					self.expMatrixRef = self.clusterSet.original_data;

					kbws.get_object_subset([					
							{ 'ref':self.expMatrixRef, 'included':
							    ['/genome_ref', '/feature_mapping', '/data/row_ids', '/data/col_ids'] }
						], 
						function(data) {
							self.genomeRef = data[0].data.genome_ref;
                            self.featureMapping = data[0].data.feature_mapping;
							self.matrixRowIds = data[0].data.data.row_ids;
							self.matrixColIds = data[0].data.data.col_ids;	

							if (self.genomeRef) {
							    kbws.get_object_subset(
							            [{ 'ref':self.genomeRef, 'included':
							                ['/id', '/scientific_name', '/features/[*]/id', 'features/[*]/type', 
							                 'features/[*]/function', 'features/[*]/aliases'] }								
							            ], 
							            function(data){									
							                self.genomeID = data[0].info[1];
							                self.genomeName = data[0].data.scientific_name;
							                self.features = data[0].data.features;
							                // Now we are ready to visualize it
							                self.render();
							            }, 
							            function(error){
							                console.error(error);
			                                self.render();
							            }
							    );
							} else {
							    self.render();
							}
						}, 
						function(error){
							self.clientError(error);
						}
					);
				}, function(error){
					self.clientError(error);
				}
			);	
		},

		render: function(){
			var self = this;
            var container = this.$elem;
			var pref = this.uuid();
			self.pref = pref;
			//console.log("self.pref = ", self.pref);


			self.loading(false);

			///////////////////////////////////// Instantiating Tabs ////////////////////////////////////////////
			container.empty();
			var tabPane = $('<div id="'+pref+'tab-content">');
			container.append(tabPane);

			tabPane.kbaseTabs({canDelete : true, tabs : []});                    
			///////////////////////////////////// Overview table ////////////////////////////////////////////           
			var tabOverview = $("<div/>");
			tabPane.kbaseTabs('addTab', {tab: 'Overview', content: tabOverview, canDelete : false, show: true});
			var tableOver = $('<table class="table table-striped table-bordered" '+
				'style="width: 100%; margin-left: 0px; margin-right: 0px;" id="'+pref+'overview-table"/>');
			tabOverview.append(tableOver);
			tableOver
				.append( self.makeRow( 
					'Feature clusters', 
					self.clusterSet.feature_clusters.length ) ) 
				// .append( self.makeRow( 
				// 	'Condition clusters', 
				// 	self.clusterSet.condition_clusters.length ) )
				.append( self.makeRow( 
					'Genome', 
					$('<span />').append(self.genomeName).css('font-style', 'italic') ) )
				.append( self.makeRow( 
					'Source matrix: #conditions', 
					self.matrixColIds.length ) )
				.append( self.makeRow( 
					'Source matrix: #genes', 
					self.matrixRowIds.length ) )
				;

			///////////////////////////////////// Clusters tab ////////////////////////////////////////////          

			var $tabClusters = $("<div/>");
			tabPane.kbaseTabs('addTab', {tab: 'Clusters', content: $tabClusters, canDelete : false, show: false});

			///////////////////////////////////// Clusters table ////////////////////////////////////////////          

			var tableClusters = $('<table id="'+pref+'clusters-table" \
				class="table table-bordered table-striped" style="width: 100%; margin-left: 0px; margin-right: 0px;">\
				</table>')
			.appendTo($tabClusters)
			.dataTable( {
			   "sDom": 'lftip',
				"aaData": self.buildClustersTableData(),
				 "aoColumns": [
				//     {
				//         width: "1em",
				//         sortable: false,    
				//         title: '<input type="checkbox" id="'+pref+'conditions_check_all"/>',
				//         data: null,
				//         render: function ( data, type, row ) {
				//             return '<input type="checkbox" class="'+pref+'conditions_checkbox"/>';
				//         }
				//     }, 
				    { sTitle: "Pos.", mData:"pos" },
					{ sTitle: "Cluster", mData:"clusterId" },
					{ sTitle: "Number of genes", mData:"size" },
					{ sTitle: "Mean correlation", mData:"meancor" }
				],
				'fnDrawCallback': events
			} );
			
            function events() {
                // event for clicking on ortholog count
                $('.show-clusters_'+self.pref).unbind('click');
                $('.show-clusters_'+self.pref).click(function() {
                    var pos = $(this).data('pos');
                    var tabName = "Cluster " + pos;
                    if (tabPane.kbaseTabs('hasTab', tabName)) {
                        tabPane.kbaseTabs('showTab', tabName);
                        return;
                    }
                    var tabDiv = self.buildClusterFeaturesTable(pos);
                    tabPane.kbaseTabs('addTab', {tab: tabName, content: tabDiv, canDelete : true, show: true, deleteCallback: function(name) {
                        tabPane.kbaseTabs('removeTab', name);
                    }});
                    tabPane.kbaseTabs('showTab', tabName);
                })
            }

		},

		buildClustersTableData: function(){
			var self = this;
			// var row_ids = self.expressionMatrix.data.row_ids;
			// var col_ids = self.expressionMatrix.data.col_ids;
			var feature_clusters  = self.clusterSet.feature_clusters;

			var tableData = [];

			for(var i = 0; i < feature_clusters.length; i++){
				tableData.push({
				    pos: i,
					clusterId: "<a class='show-clusters_" + self.pref + "' data-pos='"+i+"'>cluster_" + i + "</a>",
					size: Object.keys(feature_clusters[i].id_to_pos).length,
					meancor : feature_clusters[i].meancor
				})
			}

			return tableData;
		},

		buildClusterFeaturesTable: function(pos) {
            var self = this;
		    var tableData = [];
		    var tabDiv = $("<div/>");
		    var table = $('<table class="table table-bordered table-striped" '+
		            'style="width: 100%; margin-left: 0px; margin-right: 0px;"></table>');
		    tabDiv.append(table);

		    var id2features = self.buildFeatureId2FeatureHash();
		    for (var rowId in self.clusterSet.feature_clusters[pos].id_to_pos) {
		        var fid = rowId;
		        if (self.featureMapping) {
		            fid = self.featureMapping[rowId];
		            if (!fid)
		                fid = rowId;
		        }
		        var gid = "-";
		        var genomeRef = null;
		        if (self.genomeRef) {
		            genomeRef = self.genomeRef.split('/')[0] + "/" + self.genomeID;
		            gid = '<a href="#/dataview/'+genomeRef+'" target="_blank">'+
		            self.genomeName+"</a>";
		        }
                var aliases = "-";
                var type = "-";
                var func = "-";
		        var feature = id2features[fid];
		        if (feature) {
		            if(feature.aliases && feature.aliases.length > 0)
		                aliases= feature.aliases.join(', '); 
		            type = feature.type;
                    func = feature['function'];
		        }
                if (genomeRef) {
                    fid = '<a href="#/dataview/'+genomeRef+'?sub=Feature&subid='+fid + 
                    '" target="_blank">'+fid+'</a>';
                }
		        tableData.push(
		                {
		                    fid: fid,
		                    gid: gid,
		                    ali: aliases,
		                    type: type,
		                    func: func
		                }
		        );
            }
		    table.dataTable( {
		        "sDom": 'lftip',
		        "aaData": tableData,
		        "aoColumns": 
		            [{sTitle: "Feature ID", mData: "fid"},
                     {sTitle: "Aliases", mData: "ali"},
                     {sTitle: "Genome", mData: "gid"},
                     {sTitle: "Type", mData: "type"},
                     {sTitle: "Function", mData: "func"}]
		    });

		    return tabDiv;
		},
	
		buildFeatureId2FeatureHash: function(){
			var self = this;
			var features = self.features;
			var id2features = {};
			if (features)
			    for(var i in features)
			        id2features[features[i].id] = features[i];
			return id2features;
		},

		makeRow: function(name, value) {
			var $row = $("<tr/>")
					   .append($("<th />").css('width','20%').append(name))
					   .append($("<td />").append(value));
			return $row;
		},

		getData: function() {
			return {
				type: 'ExpressionMatrix',
				id: this.options.expressionMatrixID,
				workspace: this.options.workspaceID,
				title: 'Expression Matrix'
			};
		},

		loading: function(isLoading) {
			if (isLoading)
				this.showMessage("<img src='" + this.options.loadingImage + "'/>");
			else
				this.hideMessage();                
		},

		showMessage: function(message) {
			var span = $("<span/>").append(message);

			this.$messagePane.append(span);
			this.$messagePane.show();
		},

		hideMessage: function() {
			this.$messagePane.hide();
			this.$messagePane.empty();
		},

		uuid: function() {
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, 
				function(c) {
					var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
					return v.toString(16);
				});
		},

		buildObjectIdentity: function(workspaceID, objectID, objectVer, wsRef) {
			var obj = {};
			if (wsRef) {
				obj['ref'] = wsRef;
			} else {
				if (/^\d+$/.exec(workspaceID))
					obj['wsid'] = workspaceID;
				else
					obj['workspace'] = workspaceID;

				// same for the id
				if (/^\d+$/.exec(objectID))
					obj['objid'] = objectID;
				else
					obj['name'] = objectID;
				
				if (objectVer)
					obj['ver'] = objectVer;
			}
			return obj;
		},        

		clientError: function(error){
			this.loading(false);
			this.showMessage(error.error.error);
		}        

});