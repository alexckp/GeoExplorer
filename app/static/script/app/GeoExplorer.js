/**
 * Copyright (c) 2009-2011 The Open Planning Project
 */

Ext.USE_NATIVE_JSON = true;

// http://www.sencha.com/forum/showthread.php?141254-Ext.Slider-not-working-properly-in-IE9
// TODO re-evaluate once we move to Ext 4
Ext.override(Ext.dd.DragTracker, {
    onMouseMove: function (e, target) {
        if (this.active && Ext.isIE && !Ext.isIE9 && !e.browserEvent.button) {
            e.preventDefault();
            this.onMouseUp(e);
            return;
        }
        e.preventDefault();
        var xy = e.getXY(), s = this.startXY;
        this.lastXY = xy;
        if (!this.active) {
            if (Math.abs(s[0] - xy[0]) > this.tolerance || Math.abs(s[1] - xy[1]) > this.tolerance) {
                this.triggerStart(e);
            } else {
                return;
            }
        }
        this.fireEvent('mousemove', this, e);
        this.onDrag(e);
        this.fireEvent('drag', this, e);
    }
});

(function() {
    // backwards compatibility for reading saved maps
    // these source plugins were renamed after 2.3.2
    Ext.preg("gx_wmssource", gxp.plugins.WMSSource);
    Ext.preg("gx_olsource", gxp.plugins.OLSource);
    Ext.preg("gx_googlesource", gxp.plugins.GoogleSource);
    Ext.preg("gx_bingsource", gxp.plugins.BingSource);
    Ext.preg("gx_osmsource", gxp.plugins.OSMSource);
})();

/**
 * api: (define)
 * module = GeoExplorer
 * extends = gxp.Viewer
 */

/** api: constructor
 *  .. class:: GeoExplorer(config)
 *     Create a new GeoExplorer application.
 *
 *     Parameters:
 *     config - {Object} Optional application configuration properties.
 *
 *     Valid config properties:
 *     map - {Object} Map configuration object.
 *     sources - {Object} An object with properties whose values are WMS endpoint URLs
 *
 *     Valid map config properties:
 *         projection - {String} EPSG:xxxx
 *         units - {String} map units according to the projection
 *         maxResolution - {Number}
 *         layers - {Array} A list of layer configuration objects.
 *         center - {Array} A two item array with center coordinates.
 *         zoom - {Number} An initial zoom level.
 *
 *     Valid layer config properties (WMS):
 *     name - {String} Required WMS layer name.
 *     title - {String} Optional title to display for layer.
 */
var GeoExplorer = Ext.extend(gxp.Viewer, {

    // Begin i18n.
    zoomSliderText: "<div>Zoom Level: {zoom}</div><div>Scale: 1:{scale}</div>",
    loadConfigErrorText: "Trouble reading saved configuration: <br />",
    loadConfigErrorDefaultText: "Server Error.",
    xhrTroubleText: "Communication Trouble: Status ",
    layersText: "Layers",
    titleText: "Title",
    bookmarkText: "Bookmark URL",
    permakinkText: 'Permalink',
    appInfoText: "GeoExplorer",
    aboutText: "About GeoExplorer",
    mapInfoText: "Map Info",
    descriptionText: "Description",
    contactText: "Contact",
    aboutThisMapText: "About this Map",
    initColProps: {},
    // End i18n.
    
    /**
     * private: property[mapPanel]
     * the :class:`GeoExt.MapPanel` instance for the main viewport
     */
    mapPanel: null,
    
    toggleGroup: "toolGroup",

    /** private: method[createFeatureLayer]
     *  Create a vector layer and assign it to this.featureLayer
     */
    createFeatureLayer: function() {

        
        this.featureLayer = new OpenLayers.Layer.Vector(null, {
            displayInLayerSwitcher: false,
            styleMap: new OpenLayers.StyleMap({
                "default": new OpenLayers.Style(null, {
                    rules: [new OpenLayers.Rule({
                        symbolizer: {
                            "Point": {
                                pointRadius: 4,
                                graphicName: "square",
                                fillColor: "white",
                                fillOpacity: 1,
                                strokeWidth: 1,
                                strokeOpacity: 1,
                                strokeColor: "#333333"
                            },
                            "Line": {
                                strokeWidth: 4,
                                strokeOpacity: 1,
                                strokeColor: "#ff9933"
                            },
                            "Polygon": {
                                strokeWidth: 2,
                                strokeOpacity: 1,
                                strokeColor: "#ff6633",
                                fillColor: "white",
                                fillOpacity: 0.3
                            }
                        }
                    })]
                })
            })    
        });
        this.mapPanel.map.addLayer(this.featureLayer);
        
    },

    constructor: function(config) {
        this.mapItems = [
            {
                xtype: "gxp_scaleoverlay"
            }, {
                xtype: "gx_zoomslider",
                vertical: true,
                height: 100,
                plugins: new GeoExt.ZoomSliderTip({
                    template: this.zoomSliderText
                })
            }
        ];

        // both the Composer and the Viewer need to know about the viewerTools
        // First row in each object is needed to correctly render a tool in the treeview
        // of the embed map dialog. TODO: make this more flexible so this is not needed.
        config.viewerTools = [
            {
                leaf: true,
                text: gxp.plugins.Print.prototype.tooltip,
                ptype: "gxp_print",
                iconCls: "gxp-icon-print",
                customParams: {outputFilename: 'GeoExplorer-print'},
                printService: config.printService,
                checked: true
            }, {
                leaf: true, 
                text: gxp.plugins.Navigation.prototype.tooltip, 
                checked: true, 
                iconCls: "gxp-icon-pan",
                ptype: "gxp_navigation", 
                toggleGroup: this.toggleGroup
            }, {
                leaf: true, 
                text: gxp.plugins.WMSGetFeatureInfo.prototype.infoActionTip, 
                checked: true, 
                iconCls: "gxp-icon-getfeatureinfo",
                ptype: "gxp_wmsgetfeatureinfo",
                format: 'grid',
                toggleGroup: this.toggleGroup
            }, {
                leaf: true, 
                text: gxp.plugins.Measure.prototype.measureTooltip, 
                checked: true, 
                iconCls: "gxp-icon-measure-length",
                ptype: "gxp_measure",
                controlOptions: {immediate: true},
                toggleGroup: this.toggleGroup
            }, {
                leaf: true, 
                text: gxp.plugins.Zoom.prototype.zoomInTooltip + " / " + gxp.plugins.Zoom.prototype.zoomOutTooltip, 
                checked: true, 
                iconCls: "gxp-icon-zoom-in",
                numberOfButtons: 2,
                ptype: "gxp_zoom"
            }, {
                leaf: true, 
                text: gxp.plugins.NavigationHistory.prototype.previousTooltip + " / " + gxp.plugins.NavigationHistory.prototype.nextTooltip, 
                checked: true, 
                iconCls: "gxp-icon-zoom-previous",
                numberOfButtons: 2,
                ptype: "gxp_navigationhistory"
            }, {
                leaf: true, 
                text: gxp.plugins.ZoomToExtent.prototype.tooltip, 
                checked: true, 
                iconCls: gxp.plugins.ZoomToExtent.prototype.iconCls,
                ptype: "gxp_zoomtoextent"
            }, {
                leaf: true, 
                text: gxp.plugins.Legend.prototype.tooltip, 
                checked: true, 
                iconCls: "gxp-icon-legend",
                ptype: "gxp_legend"
            }, {
                leaf: true,
                text: gxp.plugins.GoogleEarth.prototype.tooltip,
                checked: true,
                iconCls: "gxp-icon-googleearth",
                ptype: "gxp_googleearth"
        }];

        GeoExplorer.superclass.constructor.apply(this, arguments);
    }, 

    loadConfig: function(config) {
        
        var mapUrl = window.location.hash.substr(1).split("?")[0];
        var match = mapUrl.match(/^maps\/(\d+)$/);
        if (match) {
            this.id = Number(match[1]);
            OpenLayers.Request.GET({
                url: "../" + mapUrl,
                success: function(request) {
                    var addConfig = Ext.util.JSON.decode(request.responseText);
                    this.applyConfig(Ext.applyIf(addConfig, config));
                },
                failure: function(request) {
                    var obj;
                    try {
                        obj = Ext.util.JSON.decode(request.responseText);
                    } catch (err) {
                        // pass
                    }
                    var msg = this.loadConfigErrorText;
                    if (obj && obj.error) {
                        msg += obj.error;
                    } else {
                        msg += this.loadConfigErrorDefaultText;
                    }
                    this.on({
                        ready: function() {
                            this.displayXHRTrouble(msg, request.status);
                        },
                        scope: this
                    });
                    delete this.id;
                    window.location.hash = "";
                    this.applyConfig(config);
                },
                scope: this
            });
        } else {
            var query = Ext.urlDecode(document.location.search.substr(1));
            if (query && query.q) {
                var queryConfig = Ext.util.JSON.decode(query.q);
                Ext.apply(config, queryConfig);
            }
            this.applyConfig(config);
        }
        
    },
    
    displayXHRTrouble: function(msg, status) {
        
        Ext.Msg.show({
            title: this.xhrTroubleText + status,
            msg: msg,
            icon: Ext.MessageBox.WARNING
        });
        
    },
    
    /** private: method[initPortal]
     * Create the various parts that compose the layout.
     */
    initPortal: function() {
        
        var westPanel = new Ext.Panel({
            id: 'westPanel',
            border: false,
            layout: "border",
            region: "west",
            width: 250,
            split: true,
            collapsible: true,
            collapseMode: "mini",
            header: false,
            items: [
                {region: 'center', autoScroll: true, tbar: [], border: false, id: 'tree', title: this.layersText}, 
                {region: 'south', xtype: "container", layout: "fit", border: false, height: 200, id: 'legend'}
            ]
        });
        this.createFeatureLayer();
        
        this.toolbar = new Ext.Toolbar({
            disabled: true,
            id: 'paneltbar',
            items: this.createTools()
        });
        this.on("ready", function() {
            // enable only those items that were not specifically disabled
            var disabled = this.toolbar.items.filterBy(function(item) {
                return item.initialConfig && item.initialConfig.disabled;
            });
            this.toolbar.enable();
            disabled.each(function(item) {
                item.disable();
            });
        });

        var googleEarthPanel = new gxp.GoogleEarthPanel({
            mapPanel: this.mapPanel,
            listeners: {
                beforeadd: function(record) {
                    return record.get("group") !== "background";
                }
            }
        });
        
        // TODO: continue making this Google Earth Panel more independent
        // Currently, it's too tightly tied into the viewer.
        // In the meantime, we keep track of all items that the were already
        // disabled when the panel is shown.
        var preGoogleDisabled = [];

        googleEarthPanel.on("show", function() {
            preGoogleDisabled.length = 0;
            this.toolbar.items.each(function(item) {
                if (item.disabled) {
                    preGoogleDisabled.push(item);
                }
            });
            this.toolbar.disable();
            // loop over all the tools and remove their output
            for (var key in this.tools) {
                var tool = this.tools[key];
                if (tool.outputTarget === "map") {
                    tool.removeOutput();
                }
            }
            var layersContainer = Ext.getCmp("tree");
            var layersToolbar = layersContainer && layersContainer.getTopToolbar();
            if (layersToolbar) {
                layersToolbar.items.each(function(item) {
                    if (item.disabled) {
                        preGoogleDisabled.push(item);
                    }
                });
                layersToolbar.disable();
            }
        }, this);

        googleEarthPanel.on("hide", function() {
            // re-enable all tools
            this.toolbar.enable();
            
            var layersContainer = Ext.getCmp("tree");
            var layersToolbar = layersContainer && layersContainer.getTopToolbar();
            if (layersToolbar) {
                layersToolbar.enable();
            }
            // now go back and disable all things that were disabled previously
            for (var i=0, ii=preGoogleDisabled.length; i<ii; ++i) {
                preGoogleDisabled[i].disable();
            }

        }, this);

        this.mapPanelContainer = new Ext.Panel({
            layout: "card",
            region: "center",
            defaults: {
                border: false
            },
            items: [
                this.mapPanel,
                googleEarthPanel
            ],
            activeItem: 0
        });

        if (this.initialConfig.featureTypes) {
            var queryPanel = new gxp.QueryPanel({
                id: 'queryPanel',
                title: "Feature Query",
                region: "west",
                width: 390,
                autoScroll: true,
                bodyStyle: "padding: 10px",
                map: this.mapPanel.map,
                maxFeatures: 100,
                layerStore: new Ext.data.JsonStore({
                    data: {layers: this.initialConfig.featureTypes},
                    root: "layers",
                    fields: ["title", "name", "namespace", "url", "schema"]
                }),
                bbar: ["->", {
                    text: "Query",
                    iconCls: "icon-find",
                    disabled: true,
                    handler: function() {
                        queryPanel.query();
                    }
                }],
                listeners: {
                    ready: function(panel, store) {
                        panel.getBottomToolbar().enable();
                        this.featureStore = store;
    
                        var control = this.mapPanel.map.getControlsByClass(
                            "OpenLayers.Control.DrawFeature")[0];
                        var button = Ext.getCmp('westPanel').items.items[0].toolbars[0].find("iconCls","gxp-icon-addlayers")[0];
                        
                        var handlers = {
                            "Point": OpenLayers.Handler.Point,
                            "Line": OpenLayers.Handler.Path,
                            "Curve": OpenLayers.Handler.Path,
                            "Polygon": OpenLayers.Handler.Polygon,
                            "Surface": OpenLayers.Handler.Polygon
                        }
                        
                        var simpleType = panel.geometryType.replace("Multi", "");
                        var Handler = handlers[simpleType];
                        if(Handler) {
                            var active = control.active;
                            if(active) {
                                control.deactivate();
                            }
                            control.handler = new Handler(
                                control, control.callbacks,
                                Ext.apply(control.handlerOptions, {multi: (simpleType != panel.geometryType)})
                            );
                            if(active) {
                                control.activate();
                            }
                            button.enable();
                            // hack to avoid button being disabled again when
                            // app.ready is fired after queryPanel.ready
                            delete button.initialConfig.disabled
                        } else {
                            button.disable();
                        }
                    },
                    query: function(panel, store) {
                        featureGrid.setStore(store);
                        featureGrid.setTitle("Search Results (loading ...)");
                        new Ext.LoadMask(featureGrid.el, {msg: 'Please Wait...', store: store}).show();
                        this.mapPanel.map.raiseLayer(this.featureLayer,999);
                        // Cargar propiedades de columnas de initColProps
                        queryPanel.selectedLayer.data.name &&
                       this.initColProps[queryPanel.selectedLayer.data.name] &&
                       featureGrid.setColProps(this.initColProps[queryPanel.selectedLayer.data.name]);
                    },
                    storeload: function(panel, store, records) {
                        featureGrid.setTitle(this.getSearchResultsTitle(store.getTotalCount()));
                        store.on({
                            "remove": function() {
                                featureGrid.setTitle(this.getSearchResultsTitle(store.getTotalCount()-1));
                            },
                            scope: this
                        })
                    },
                    scope: this
                }
            });
            
            // create a SelectFeature control
            // "fakeKey" will be ignord by the SelectFeature control, so only one
            // feature can be selected by clicking on the map, but allow for
            // multiple selection in the featureGrid
            var selectControl = new OpenLayers.Control.SelectFeature(
                this.featureLayer, {clickout: false, multipleKey: "fakeKey"});
            selectControl.events.on({
                "activate": function() {
                    selectControl.unselectAll(popup && popup.editing && {except: popup.feature});
                },
                "deactivate": function() {
                    if(popup) {
                        if(popup.editing) {
                            popup.on("cancelclose", function() {
                                selectControl.activate();
                            }, this, {single: true})
                        }
                        popup.close();
                    }
                }
            });
                
            var popup;
            
            this.featureLayer.events.on({
                "featureunselected": function(evt) {
                    if(popup) {
                        popup.close();
                    }
                },
                "beforefeatureselected": function(evt) {
                    //TODO decide if we want to allow feature selection while a
                    // feature is being edited. If so, we have to revisit the
                    // SelectFeature/ModifyFeature setup, because that would
                    // require to have the SelectFeature control *always*
                    // activated *after* the ModifyFeature control. Otherwise. we
                    // must not configure the ModifyFeature control in standalone
                    // mode, and use the SelectFeature control that comes with the
                    // ModifyFeature control instead.
                    if(popup) {
                        return !popup.editing;
                    }
                },
                "featureselected": function(evt) {
                    var feature = evt.feature;
                    if(selectControl.active) {
                        this._selectingFeature = true;
                        popup = new gxp.FeatureEditPopup({
                            collapsible: true,
                            feature: feature,
                            editing: feature.state === OpenLayers.State.INSERT,
                            schema: queryPanel.attributeStore,
                            allowDelete: true,
                            width: 200,
                            height: 250,
                            listeners: {
                                "close": function() {
                                    if(feature.layer) {
                                        selectControl.unselect(feature);
                                    }
                                },
                                "featuremodified": function(popup, feature) {
                                    popup.disable();
                                    this.featureStore.on({
                                        write: {
                                            fn: function() {
                                                if(popup) {
                                                    popup.enable();
                                                }
                                            },
                                            single: true
                                        }
                                    });                                
                                    if(feature.state === OpenLayers.State.DELETE) {                                    
                                        /**
                                         * If the feature state is delete, we need to
                                         * remove it from the store (so it is collected
                                         * in the store.removed list.  However, it should
                                         * not be removed from the layer.  Until
                                         * http://trac.geoext.org/ticket/141 is addressed
                                         * we need to stop the store from removing the
                                         * feature from the layer.
                                         */
                                        var store = this.featureStore;
                                        store._removing = true; // TODO: remove after http://trac.geoext.org/ticket/141
                                        store.remove(store.getRecordFromFeature(feature));
                                        delete store._removing; // TODO: remove after http://trac.geoext.org/ticket/141
                                    }
                                    this.featureStore.save();
                                },
                                "canceledit": function(popup, feature) {
                                    this.featureStore.commitChanges();
                                },
                                scope: this
                            }
                        });
                        popup.show();
                    }
                },
                "beforefeaturesadded": function(evt) {
                    if(featureGrid.store !== this.featureStore) {
                        featureGrid.setStore(this.featureStore);
                    }
                },
                "featuresadded": function(evt) {
                    var feature = evt.features.length === 1 && evt.features[0];
                    if(feature && feature.state === OpenLayers.State.INSERT) {
                        selectControl.activate();
                        selectControl.select(feature);
                    }
                },
                scope: this
            });
            this.mapPanel.map.addControl(selectControl);
            
            queryPanel.on({
                beforequery: function(panel) {
                    if(popup && popup.editing) {
                        popup.on("close", panel.query, panel, {single: true});
                        popup.close();
                        return false;
                    }
                }
            });
    
            var featureGrid = new gxp.grid.FeatureGrid({
                id: 'featureGrid',
                title: "Search Results (submit a query to see results)",
                region: "center",
                layer: this.featureLayer,
                sm: new GeoExt.grid.FeatureSelectionModel({
                    selectControl: selectControl,
                    singleSelect: false,
                    autoActivateControl: false,
                    listeners: {
                        "beforerowselect": function() {
                            if(selectControl.active && !this._selectingFeature) {
                                return false;
                            }
                            delete this._selectingFeature;
                        },
                        scope: this
                    }
                }),
                autoScroll: true,
                bbar: ["->", {
                  text: "Todos",
                  tooltip: "Seleccionar todas las filas",
                  handler: function(btn) {
                    Ext.getCmp('featureGrid').selModel.selectAll();
                  }
                },
                {
                  text: "GML",
                  tooltip: "generar fichero GML (vectorial) de selección",
                  handler: function(btn) {
                    var formatter = new OpenLayers.Format.GML(),
                        features=[];
                    Ext.getCmp('featureGrid').selModel.each(function(el){
                      features.push(el.getFeature());
                    });
                    new Ext.Window({
                      animateTarget: btn.el,
                      id: "gmlPopup",
                      title: "GML de selección",
                      height: 200,
                      width: 600,
                      autoScroll: true,
                      html: Ext.util.Format.htmlEncode(formatter.write(features))
                    }).show();
                  }
                }, {
                  text: "JSON",
                  tooltip: "generar fichero geoJSON (vectorial) de selección",
                  handler: function(btn) {
                    var formatter = new OpenLayers.Format.GeoJSON(),
                        features=[];
                    Ext.getCmp('featureGrid').selModel.each(function(el){
                      features.push(el.getFeature());
                    });
                    new Ext.Window({
                      animateTarget: btn.el,
                      id: "gmlPopup",
                      title: "GeoJSON de selección",
                      height: 200,
                      width: 600,
                      autoScroll: true,
                      html: Ext.util.Format.htmlEncode(formatter.write(features))
                    }).show();
                  }
                }, {
                  text: "WKT",
                  tooltip: "generar fichero WKT (vectorial) de selección",
                  handler: function(btn) {
                    var formatter = new OpenLayers.Format.WKT(),
                        features=[];
                    Ext.getCmp('featureGrid').selModel.each(function(el){
                      features.push(el.getFeature());
                    });
                    new Ext.Window({
                      animateTarget: btn.el,
                      id: "gmlPopup",
                      title: "WKT de selección",
                      height: 200,
                      width: 600,
                      autoScroll: true,
                      html: Ext.util.Format.htmlEncode(formatter.write(features))
                    }).show();
                  }
                }, { 
                  text: "CSV",
                  tooltip: "generar fichero CSV (excel) de selección",
                  handler: function(btn) {
                    var columnas=[],
                        sep,
                        col,
                        lista,
                        miCsv="",
                        colModels= Ext.getCmp('featureGrid').colModel.getColumnsBy(function(){return true});
                    for (col in colModels) {
                      if (colModels.hasOwnProperty(col)) {
                        columnas.push(colModels[col].header);
                      }
                    }
                    sep="";
                    for (col in columnas) {
                      if (columnas.hasOwnProperty(col)) {
                        miCsv += sep + '"' + columnas[col] + '"';
                        sep = ",";
                      }
                    }
                    miCsv+= "<br/>";
                    Ext.getCmp('featureGrid').selModel.each(function(el){
                      sep="";
                      lista=el.getFeature().attributes;
                      for (col in columnas) {
                        if (columnas.hasOwnProperty(col)) {
                          miCsv += sep + '"'
                          if (lista[columnas[col]]) {
                            miCsv += lista[columnas[col]];
                          }
                          miCsv += '"';
                          sep = ",";
                        }
                      }
                      miCsv+= "<br/>";
                    });
                    new Ext.Window({
                      animateTarget: btn.el,
                      title: "CSV de selección",
                      height: 200,
                      width: 600,
                      autoScroll: true,
                      html: miCsv
                    }).show();
                  }
                }, {
                    text: "Display on map",
                    enableToggle: true,
                    pressed: true,
                    toggleHandler: function(btn, pressed) {
                        this.featureLayer.setVisibility(pressed);
                    },
                    scope: this
                }, {
                    text: "Zoom to selected",
                    iconCls: "icon-zoom-to",
                    handler: function(btn) {
                        var bounds, geom, extent;
                        featureGrid.getSelectionModel().each(function(r) {
                            geom = r.get("feature").geometry;
                            if(geom) {
                                extent = geom.getBounds();
                                if(bounds) {
                                    bounds.extend(extent);
                                } else {
                                    bounds = extent.clone();
                                }
                            }
                        }, this);
                        if(bounds) {
                            this.mapPanel.map.zoomToExtent(bounds);
                        }
                    },
                    scope: this                
                }]
            });
            this.initColProps[this.featureLayer.name] &&
              featureGrid.setColProps(this.initColProps[this.featureLayer.name]);
            
            var southPanel = new Ext.Panel({
                id: 'southPanel',
                layout: "border",
                region: "south",
                height: 250,
                split: true,
                collapsible: true,
                items: [queryPanel, featureGrid]
            });
    
        }
        
        if (southPanel) {
            this.portalItems = [{
                region: "center",
                layout: "border",
                tbar: this.toolbar,
                items: [
                    this.mapPanelContainer,
                    westPanel, southPanel
                ]
            }];
        } else {
            this.portalItems = [{
                region: "center",
                layout: "border",
                tbar: this.toolbar,
                items: [
                    this.mapPanelContainer,
                    westPanel
                ]
            }];
        } 
        
        GeoExplorer.superclass.initPortal.apply(this, arguments);        
    },
    
    /** private: method[createTools]
     * Create the toolbar configuration for the main panel.  This method can be 
     * overridden in derived explorer classes such as :class:`GeoExplorer.Composer`
     * or :class:`GeoExplorer.Viewer` to provide specialized controls.
     */
    createTools: function() {
        var tools = [
            "-"
        ];
        return tools;
    },
    
    /** private: method[showUrl]
     */
    showUrl: function() {
        var win = new Ext.Window({
            title: this.bookmarkText,
            layout: 'form',
            labelAlign: 'top',
            modal: true,
            bodyStyle: "padding: 5px",
            width: 300,
            items: [{
                xtype: 'textfield',
                fieldLabel: this.permakinkText,
                readOnly: true,
                anchor: "100%",
                selectOnFocus: true,
                value: window.location.href
            }]
        });
        win.show();
        win.items.first().selectText();
    },
    
    /** api: method[getBookmark]
     *  :return: ``String``
     *
     *  Generate a bookmark for an unsaved map.
     */
    getBookmark: function() {
        var params = Ext.apply(
            OpenLayers.Util.getParameters(),
            {q: Ext.util.JSON.encode(this.getState())}
        );
        
        // disregard any hash in the url, but maintain all other components
        var url = 
            document.location.href.split("?").shift() +
            "?" + Ext.urlEncode(params);
        
        return url;
    },

    /** private: method[displayAppInfo]
     * Display an informational dialog about the application.
     */
    displayAppInfo: function() {
        var appInfo = new Ext.Panel({
            title: this.appInfoText,
            html: "<iframe style='border: none; height: 100%; width: 100%' src='../about.html' frameborder='0' border='0'><a target='_blank' href='../about.html'>"+this.aboutText+"</a> </iframe>"
        });

        var about = Ext.applyIf(this.about, {
            title: '', 
            "abstract": '', 
            contact: ''
        });

        var mapInfo = new Ext.Panel({
            title: this.mapInfoText,
            html: '<div class="gx-info-panel">' +
                  '<h2>'+this.titleText+'</h2><p>' + about.title +
                  '</p><h2>'+this.descriptionText+'</h2><p>' + about['abstract'] +
                  '</p> <h2>'+this.contactText+'</h2><p>' + about.contact +'</p></div>',
            height: 'auto',
            width: 'auto'
        });

        var tabs = new Ext.TabPanel({
            activeTab: 0,
            items: [mapInfo, appInfo]
        });

        var win = new Ext.Window({
            title: this.aboutThisMapText,
            modal: true,
            layout: "fit",
            width: 300,
            height: 300,
            items: [tabs]
        });
        win.show();
    },
    getSearchResultsTitle: function(count) {
        var str = (count == 1 && "1 feature") ||
            (count > 1 && count + " features") ||
            "no features";
        return "Search Results (" + str + ")";
    }
});

