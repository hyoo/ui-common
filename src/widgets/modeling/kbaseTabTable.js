(function( $, undefined ) {

$.KBWidget({
    name: "kbaseTabTable",
    parent: "kbaseAuthenticatedWidget",
    version: "1.0.0",
    options: {
    },

    getData: function() {
        return {
            id: this.options.id,
            type: "Model",
            workspace: this.options.ws,
            title: this.options.title
        };
    },

    init: function(input) {
        this._super(input);
        var self = this;

        var type = input.type;

        // tab widget
        var tabs;

        // 0) No more clients.  Make this global.  please.
        this.kbapi = function(service, method, params) {
            var url, method;
            if (service == 'ws') {
                url = "https://kbase.us/services/ws/";
                method = 'Workspace.'+method;
            } else if (service == 'fba') {
                url = "https://kbase.us/services/KBaseFBAModeling/";
                method = 'fbaModelServices.'+method;
            }

            var rpc = {
                params: [params],
                method: method,
                version: "1.1",
                id: String(Math.random()).slice(2),
            };

            var prom = $.ajax({
                url: url,
                type: 'POST',
                processData: false,
                data: JSON.stringify(rpc),
                beforeSend: function (xhr) {
                    if (self.authToken())
                        xhr.setRequestHeader("Authorization", self.authToken());
                }
            }).then(function(data) {
                return data.result[0];
            })

            return prom;
        }

        // base class for workspace object classes
        var kbObjects = new KBObjects();

        //
        // 1) Use type (periods replaced with underscores) to instantiate object
        //

        console.log('type', type.replace(/\./g, '_'))
        obj = new kbObjects[type.replace(/\./g, '_')](self);

        //
        // 2) add the tabs (at page load)
        //
        var tabList = obj.tabList;

        var uiTabs = [];
        for (var i = 0; i < tabList.length; i++) {
            var tab = tabList[i];

            // add loading status
            var placeholder = $('<div>')
            placeholder.loading();

            uiTabs.push({name: tabList[i].name, content: placeholder});
        }

        uiTabs[0].active = true;
        tabs = self.$elem.kbTabs({tabs: uiTabs});

        //
        // 3) get meta data, add any metadata tables
        //
        if (isNaN(input.ws) && isNaN(input.obj) )
            var param = {workspace: input.ws, name: input.obj};
        else if (!isNaN(input.ws) && !isNaN(input.obj) )
            var param = {ref: input.ws+'/'+input.obj};

        self.kbapi('ws', 'get_object_info_new', {objects: [param], includeMetadata: 1})
          .done(function(res) {
              obj.setMetadata(res[0]);

              for (var i = 0; i < tabList.length; i++) {
                  var spec = tabList[i];

                  if (spec.type == 'verticaltbl') {
                      var key = spec.key,
                          data = obj[key],
                          tabPane = tabs.tabContent(spec.name);

                      var table = self.verticalTable({rows: spec.rows, data: data});
                      tabPane.rmLoading();
                      tabPane.append(table)
                  }
              }
          })

        //
        // 4) get object data, create tabs
        //
        if (isNaN(input.ws) && isNaN(input.obj) )
            var param = {workspace: input.ws, name: input.obj};
        else if (!isNaN(input.ws) && !isNaN(input.obj) )
            var param = {ref: input.ws+'/'+input.obj};

        self.kbapi('ws', 'get_objects', [param])
          .done(function(data){
              var setMethod = obj.setData(data[0].data);

              // see if setData method returns promise or not
              if (setMethod && 'done' in setMethod) {
                  setMethod.done(function() {
                    buildContent()
                })
              } else {
                  buildContent();
              }
        })

        var refLookup = {};
        function preProcessDataTable(tabSpec) {
            // get refs
            var refs = [],
                cols = tabSpec.columns;
            cols.forEach(function(col){
                if ((col.type == 'tabLink' || col.type == 'wstype') && col.linkformat == 'dispWSRef') {
                    obj[tabSpec.key].forEach(function(item) {
                        refs.push( {ref: item[col.key]} );
                    })
                }
            })

            if (!refs.length)
                return;

            // get human readable info from workspaces
            return self.kbapi('ws', 'get_object_info_new', {objects: refs})
                       .then(function(data) {
                            refs.forEach(function(ref, i){

                                // if (ref in referenceLookup) return
                                refLookup[ref.ref] = {name: data[i][1],
                                                      ws: data[i][7],
                                                      type: data[i][2].split('-')[0],
                                                      link: data[i][2].split('-')[0]+'/'+data[i][7]+'/'+data[i][1]};
                            })
                       })
        }

        function buildContent() {

            //5) Iterates over the entries in the spec and instantiate things
            for (var i = 0; i < tabList.length; i++) {
                var tabSpec = tabList[i];
                var tabPane = tabs.tabContent(tabSpec.name);

                // skip any vertical tables for now
                if (tabSpec.type == 'verticaltbl') continue;

                // if widget, invoke widget with arguments
                else if (tabSpec.widget) {
                    var keys = tabSpec.keys.split(/\,\s+/g);
                    var params = {};
                    tabSpec.arguments.split(/\,\s+/g).forEach(function(arg, i) {
                        params[arg] = obj[keys[i]];
                    })

                    tabPane[tabSpec.widget](params);
                    continue;
                }

                // preprocess data to get workspace info on any references in class
                var prom = preProcessDataTable(tabSpec);
                if (prom)
                    prom.done(function() {
                        createDataTable(tabSpec, tabPane)
                    })
                else
                    createDataTable(tabSpec, tabPane);


            }
        }

        // creates a datatable on a tabPane
        function createDataTable(tabSpec, tabPane) {
            var settings = self.getTableSettings(tabSpec, obj.data);
            tabPane.rmLoading();

            // note: must add table first
            tabPane.append('<table class="table table-bordered table-striped">');
            tabPane.find('table').dataTable(settings)

            // add any events
            newTabEvents(tabSpec.name);
        }




        // takes table spec and prepared data, returns datatables settings object
        this.getTableSettings = function(tab, data) {
            var tableColumns = getColSettings(tab);

            var settings = {dom: '<"top"lf>rt<"bottom"ip><"clear">',
                            aaData: obj[tab.key],
                            aoColumns: tableColumns,
                            language: { search: "_INPUT_",
                                        searchPlaceholder: 'Search '+tab.name}}

            // add any events
            for (var i=0; i<tab.columns.length; i++) {
                var col = tab.columns[i];

                settings.fnDrawCallback = function() {
                    newTabEvents(tab.name)
                }
            }

            return settings;
        }


        function newTabEvents(name) {
            var ids = tabs.tabContent(name).find('.id-click');

            ids.unbind('click');
            ids.click(function() {
                var info = {id: $(this).data('id'),
                            type: $(this).data('type'),
                            method: $(this).data('method'),
                            ref: $(this).data('ref'),
                            name: $(this).data('name'),
                            ws: $(this).data('ws'),
                            action: $(this).data('action')}

                var content = $('<div>').loading();

                if (info.method && info.method != 'undefined') {
                    var prom = obj[info.method](info);

                    $.when(prom).done(function(rows) {
                        content.rmLoading();
                        var table = self.verticalTable({rows: rows});
                        content.append(table);
                    })


                    tabs.addTab({name: id, content: content, removable: true});
                    tabs.showTab(id);
                    newTabEvents(id);

                } else if (info.action == 'openWidget') {
                    content.kbaseTabTable({ws: info.ws, type: info.type, obj: info.name} )
                    tabs.addTab({name: info.id, content: content, removable: true});
                    tabs.showTab(info.id);
                    newTabEvents(info.id);
                }



            });
        }


        // takes table spec, returns datatables column settings
        function getColSettings(tab) {

            var settings = [];

            var cols = tab.columns;

            for (var i=0; i<cols.length; i++) {
                var col = cols[i];
                var key = col.key,
                    type = col.type,
                    format = col.linkformat,
                    method = col.method,
                    action = col.action

                var config = {sTitle: col.label,
                              mData: ref(key, type, format, method, action)}

                if (col.width) config.sWidth = col.width;

                settings.push(config)
            }


            return settings
        }


        function ref(key, type, format, method, action) {
            return function(d) {
                        if (type == 'tabLink' && format == 'dispIDCompart') {
                            var id = d[key].split('_')[0];
                            var compart = d[key].split('_')[1];

                            return '<a class="id-click" data-id="'+id+'" data-method="'+method+'">'+
                                        id+'</a> ('+compart+')';
                        } else if (type == 'tabLink' && format == 'dispID') {
                            var id = d[key];
                            return '<a class="id-click" data-id="'+id+'" data-method="'+method+'">'+
                                        id+'</a>';
                        } else if (type == 'wstype' && format == 'dispWSRef') {
                            var ws = refLookup[ d[key] ].ws,
                                name = refLookup[ d[key] ].name
                                wstype = refLookup[ d[key] ].type,
                                link = refLookup[ d[key] ].link;
                            return '<a href="#/test/'+link+
                                     '" class="id-click"'+
                                     '" data-ws="'+ws+
                                     '" data-id="'+name+
                                     '" data-ref="'+d[key]+
                                     '" data-type="'+wstype+
                                     '" data-action="openPage"'+
                                     '" data-method="'+method+
                                     '" data-name="'+name+'">'+
                                    name+'</a>';
                        }

                        var value = d[key];

                        if ($.isArray(value)) {
                            if (type == 'tabLinkArray')
                                return tabLinkArray(value, method)
                            return d[key].join(', ');
                        }

                        return value;
                    }
        }

        function tabLinkArray(a, method) {
            var links = [];
            a.forEach(function(id) {
                links.push('<a class="id-click" data-id="'+id+
                            '" data-method="'+method+'">'+
                            id+'</a>');
            })
            return links.join(', ');
        }

        this.verticalTable = function(p) {
            var data = p.data;
            var rows = p.rows;

            var table = $('<table class="table table-bordered" style="margin-left: auto; margin-right: auto;">');


            for (var i=0; i<rows.length; i++) {
                var row = rows[i],
                    type = row.type;


                // don't display undefined things in vertical table
                if ('data' in row && typeof row.data == 'undefined' ||
                    'key' in row && typeof data[row.key] == 'undefined')
                    continue

                var r = $('<tr>');
                r.append('<td><b>'+row.label+'</b></td>')

                // if the data is in the row definition, use it
                if ('data' in row) {
                    var value;
                    if (type == 'tabLinkArray')
                        value = tabLinkArray(row.data, row.method);
                    else
                        value = row.data;
                    r.append('<td>'+value+'</td>');
                } else if ('key' in row) {
                    if (row.type == 'wstype') {
                        var ref = data[row.key];
                        var cell = $('<td data-ref="'+ref+'">loading...</td>');

                        getLink(data[row.key]).done(function(url) {
                            var name = url.split('/')[2]
                            cell.html('<a href="#/test/'+url+'">'+name+'</a>');
                        })
                        r.append(cell);
                    } else {
                        r.append('<td>'+data[row.key]+'</td>');
                    }
                } else if (row.type == 'pictureEquation')
                    r.append('<td>'+pictureEquation(row.data)+'</td>');

                table.append(r);
            }

            return table;
        }


        this.getBiochemReaction = function(id) {
            return self.kbapi('fba', 'get_reactions', {reactions: [id]})
                       .then(function(data) {
                          return data[0];
                       })
        }

        this.getBiochemCompound = function(id) {
            return self.kbapi('fba', 'get_compounds', {compounds: [id]})
                       .then(function(data) {
                          return data[0];
                       })
        }

        this.getBiochemCompounds = function(ids) {
            return self.kbapi('fba', 'get_compounds', {compounds: ids})
        }

        this.compoundImage = function(id) {
            return 'http://bioseed.mcs.anl.gov/~chenry/jpeg/'+id+'.jpeg';
        }

        var imageURL = "http://bioseed.mcs.anl.gov/~chenry/jpeg/";
        this.pictureEquation = function(eq) {
            var cpds = get_cpds(eq);

            for (var i =0; i < cpds.left.length; i++) {
                var cpd = cpds.left[i];
                var img_url =  imageURL+cpd+'.jpeg';
                panel.append('<div class="pull-left text-center">\
                                    <img src="'+img_url+'" width=150 ><br>\
                                    <div class="cpd-id" data-cpd="'+cpd+'">'+cpd+'</div>\
                                </div>');

                var plus = $('<div class="pull-left text-center">+</div>');
                plus.css('margin', '30px 0 0 0');

                if (i < cpds.left.length-1) {
                    panel.append(plus);
                }
            }

            var direction = $('<div class="pull-left text-center">'+'<=>'+'</div>');
            direction.css('margin', '25px 0 0 0');
            panel.append(direction);

            for (var i =0; i < cpds.right.length; i++) {
                var cpd = cpds.right[i];
                var img_url = imageURL+cpd+'.jpeg';
                panel.append('<div class="pull-left text-center">\
                                    <img src="'+img_url+'" data-cpd="'+cpd+'" width=150 ><br>\
                                    <div class="cpd-id" data-cpd="'+cpd+'">'+cpd+'</div>\
                                </div>');

                var plus = $('<div class="pull-left text-center">+</div>');
                plus.css('margin', '25px 0 0 0');

                if (i < cpds.right.length-1) {
                    panel.append(plus);
                }
            }


            var cpd_ids = cpds.left.concat(cpds.right);
            var prom = self.kbapi('fba', 'get_compounds', {compounds: cpd_ids})
            $.when(prom).done(function(d){
                var map = {};
                for (var i in d) {
                    map [d[i].id ] = d[i].name;
                }

                $('.cpd-id').each(function() {
                    $(this).html(map[$(this).data('cpd')])
                })
            });


            return panel;
        }

        function get_cpds(equation) {
            var cpds = {};
            var sides = equation.split('=');
            cpds.left = sides[0].match(/cpd\d*/g);
            cpds.right = sides[1].match(/cpd\d*/g);

            return cpds;
        }

        function getLink(ref) {
            return self.kbapi('ws', 'get_object_info_new',
                        {objects: [{ref: ref}]})
                        .then(function(data){
                            var a = data[0];
                            return a[2].split('-')[0]+'/'+a[7]+'/'+a[1];
                        })
        }

        //mmmm... let's define this twice.  Why not.
        $.fn.loading = function(text, big) {
            $(this).rmLoading()

            if (big) {
                if (typeof text != 'undefined') {
                    $(this).append('<p class="text-center text-muted loader"><br>'+
                         '<img src="assets/img/ajax-loader-big.gif"> '+text+'</p>');
                } else {
                    $(this).append('<p class="text-center text-muted loader"><br>'+
                         '<img src="assets/img/ajax-loader-big.gif"> loading...</p>')
                }
            } else {
                if (typeof text != 'undefined')
                    $(this).append('<p class="text-muted loader">'+
                         '<img src="assets/img/ajax-loader.gif"> '+text+'</p>');
                else
                    $(this).append('<p class="text-muted loader">'+
                         '<img src="assets/img/ajax-loader.gif"> loading...</p>')
            }

            return this;
        }

        return this;
    }
})
}( jQuery ) );

